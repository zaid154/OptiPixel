import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { VideoKeyframeService } from '../services/duplicate/videoKeyframeService.js';

const THUMB_DIR = path.join(process.cwd(), '.cache', 'thumbs');
const memCache = new Map();
const MAX_MEM_CACHE = 2500;

export class MediaStreamController {
  static async getThumbnailBuffer(filePath) {
    if (!filePath || !fs.existsSync(filePath)) return null;
    await fs.promises.mkdir(THUMB_DIR, { recursive: true });
    const stat = await fs.promises.stat(filePath);
    const hashKey = crypto.createHash('md5').update(`v2_uncropped_${filePath}_${stat.mtimeMs}`).digest('hex');
    const thumbPath = path.join(THUMB_DIR, `${hashKey}.webp`);

    if (memCache.has(hashKey)) return memCache.get(hashKey);

    if (fs.existsSync(thumbPath)) {
      const diskBuf = await fs.promises.readFile(thumbPath);
      if (memCache.size < MAX_MEM_CACHE) memCache.set(hashKey, diskBuf);
      return diskBuf;
    }

    const ext = path.extname(filePath).toLowerCase();
    const isVideo = ['.mp4', '.mkv', '.mov', '.avi', '.webm'].includes(ext);

    let buffer;
    if (isVideo) {
      const frameBuf = await VideoKeyframeService.extractFrameBuffer(filePath, 0.5);
      buffer = await sharp(frameBuf || filePath).rotate().resize(480, 480, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    } else {
      buffer = await sharp(filePath).rotate().resize(480, 480, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    }

    await fs.promises.writeFile(thumbPath, buffer).catch(() => {});
    if (memCache.size < MAX_MEM_CACHE) memCache.set(hashKey, buffer);
    return buffer;
  }

  static async getThumbnail(req, res) {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).send('File path required');

    try {
      const buffer = await MediaStreamController.getThumbnailBuffer(filePath);
      if (!buffer) return res.status(404).send('File not found');

      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      res.end(buffer);
    } catch (err) {
      res.status(500).json({ error: 'Thumbnail generation failed', message: err.message });
    }
  }

  static warmupThumbnails(groups) {
    if (this._isWarming || !Array.isArray(groups)) return;
    this._isWarming = true;
    const allPaths = groups.flatMap((g) => (g.files || []).map((f) => f.filePath)).filter(Boolean);
    let idx = 0;

    const nextBatch = () => {
      if (idx >= allPaths.length) {
        this._isWarming = false;
        return;
      }
      const slice = allPaths.slice(idx, idx + 8);
      idx += 8;
      Promise.all(slice.map((p) => this.getThumbnailBuffer(p).catch(() => null))).finally(() => {
        setTimeout(nextBatch, 40);
      });
    };
    setTimeout(nextBatch, 150);
  }

  static getMediaStream(req, res) {
    const filePath = req.query.path;
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).send('Media file not found');
    }

    try {
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;
      const ext = path.extname(filePath).toLowerCase();
      const mimeMap = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
        '.webp': 'image/webp', '.mp4': 'video/mp4', '.mkv': 'video/mp4',
        '.mov': 'video/quicktime', '.webm': 'video/webm'
      };
      const contentType = mimeMap[ext] || 'application/octet-stream';

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const CHUNK_SIZE = 1024 * 1024 * 2; // 2 MB fast streaming chunks
        const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + CHUNK_SIZE - 1, fileSize - 1);
        const chunksize = end - start + 1;
        const file = fs.createReadStream(filePath, { start, end });
        req.on('close', () => file.destroy());

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType
        });
        file.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': contentType
        });
        fs.createReadStream(filePath).pipe(res);
      }
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
}
