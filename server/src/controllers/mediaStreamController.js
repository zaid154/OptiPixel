import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { VideoKeyframeService } from '../services/duplicate/videoKeyframeService.js';
import { decodeRawBayerThumbnail } from '../services/duplicate/rawDemosaicHelper.js';
import { ConsolidationLog } from '../models/ConsolidationLog.js';

const THUMB_DIR = path.join(process.cwd(), '.cache', 'thumbs');
const memCache = new Map();
const MAX_MEM_CACHE = 2500;

async function resolveRealOrQuarantinePath(filePath) {
  if (!filePath) return null;
  if (fs.existsSync(filePath)) return filePath;
  try {
    const log = await ConsolidationLog.findOne({ 'operations.sourcePath': filePath });
    const op = log?.operations?.find((o) => o.sourcePath === filePath);
    if (op?.quarantinePath && fs.existsSync(op.quarantinePath)) return op.quarantinePath;
    if (op?.targetPath && fs.existsSync(op.targetPath)) return op.targetPath;
  } catch {}
  return null;
}

async function generatePlaceholder(ext, filename) {
  const label = (ext.replace('.', '') || 'RAW').toUpperCase();
  const safeName = filename.length > 20 ? filename.slice(0, 18) + '...' : filename;
  const svg = `<svg width="480" height="480" viewBox="0 0 480 480" xmlns="http://www.w3.org/2000/svg">
    <rect width="480" height="480" fill="#0f172a"/>
    <rect x="140" y="160" width="200" height="130" rx="16" fill="#1e293b" stroke="#334155" stroke-width="4"/>
    <circle cx="240" cy="225" r="32" fill="#334155"/>
    <text x="240" y="335" font-family="sans-serif" font-size="28" font-weight="bold" fill="#38bdf8" text-anchor="middle">${label}</text>
    <text x="240" y="370" font-family="sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">${safeName}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).webp({ quality: 80 }).toBuffer();
}

export class MediaStreamController {
  static async getThumbnailBuffer(filePath) {
    const realPath = await resolveRealOrQuarantinePath(filePath);
    if (!realPath) return null;

    await fs.promises.mkdir(THUMB_DIR, { recursive: true });
    const stat = await fs.promises.stat(realPath);
    const hashKey = crypto.createHash('md5').update(`v5_${realPath}_${stat.mtimeMs}`).digest('hex');
    const thumbPath = path.join(THUMB_DIR, `${hashKey}.webp`);

    if (memCache.has(hashKey)) return memCache.get(hashKey);
    if (fs.existsSync(thumbPath)) {
      const diskBuf = await fs.promises.readFile(thumbPath);
      if (memCache.size < MAX_MEM_CACHE) memCache.set(hashKey, diskBuf);
      return diskBuf;
    }

    const ext = path.extname(realPath).toLowerCase();
    const isVideo = ['.mp4', '.mkv', '.mov', '.avi', '.webm'].includes(ext);
    let buffer;

    if (isVideo) {
      const frameBuf = await VideoKeyframeService.extractFrameBuffer(realPath, 0.5);
      buffer = await sharp(frameBuf || realPath).rotate().resize(480, 480, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    } else {
      try {
        buffer = await sharp(realPath).rotate().resize(480, 480, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
      } catch {
        if (['.dng', '.tif', '.tiff', '.raw'].includes(ext)) {
          buffer = await decodeRawBayerThumbnail(realPath);
        }
        if (!buffer) {
          const frameBuf = await VideoKeyframeService.extractFrameBuffer(realPath, 0.1).catch(() => null);
          if (frameBuf) {
            buffer = await sharp(frameBuf).rotate().resize(480, 480, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer().catch(() => null);
          }
        }
        if (!buffer) {
          buffer = await generatePlaceholder(ext, path.basename(realPath));
        }
      }
    }

    if (buffer) {
      await fs.promises.writeFile(thumbPath, buffer).catch(() => {});
      if (memCache.size < MAX_MEM_CACHE) memCache.set(hashKey, buffer);
    }
    return buffer;
  }

  static async getThumbnail(req, res) {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).send('File path required');

    try {
      const st = await fs.promises.stat(filePath).catch(() => null);
      if (st) {
        const etag = `"${st.size}-${st.mtimeMs}"`;
        if (req.headers['if-none-match'] === etag) {
          return res.status(304).end();
        }
        res.setHeader('ETag', etag);
      }

      let buffer = await MediaStreamController.getThumbnailBuffer(filePath);
      if (!buffer) {
        const ext = path.extname(filePath).toLowerCase();
        buffer = await generatePlaceholder(ext, path.basename(filePath));
      }
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      res.end(buffer);
    } catch {
      const fallback = await generatePlaceholder('.raw', 'file');
      res.setHeader('Content-Type', 'image/webp');
      res.end(fallback);
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

  static async getMediaStream(req, res) {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).send('File path required');

    const realPath = await resolveRealOrQuarantinePath(filePath);
    if (!realPath) return res.status(404).send('Media file not found');

    try {
      const stat = fs.statSync(realPath);
      const fileSize = stat.size;
      const range = req.headers.range;
      const ext = path.extname(realPath).toLowerCase();
      const mimeMap = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
        '.webp': 'image/webp', '.mp4': 'video/mp4', '.mkv': 'video/mp4',
        '.mov': 'video/quicktime', '.webm': 'video/webm'
      };
      const contentType = mimeMap[ext] || 'application/octet-stream';

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const CHUNK_SIZE = 1024 * 1024 * 2;
        const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + CHUNK_SIZE - 1, fileSize - 1);
        const chunksize = end - start + 1;
        const file = fs.createReadStream(realPath, { start, end });
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
        fs.createReadStream(realPath).pipe(res);
      }
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
}
