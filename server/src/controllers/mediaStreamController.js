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
const inFlightRequests = new Map();

// Helper to reliably resolve path on Windows (handling slashes, encoding, normalization, quarantine)
export async function resolveRealOrQuarantinePath(filePath) {
  if (!filePath || typeof filePath !== 'string') return null;
  let decoded = filePath.trim();
  try {
    if (decoded.includes('%')) decoded = decodeURIComponent(decoded);
  } catch {}

  const normalized = path.resolve(path.normalize(decoded));
  if (fs.existsSync(normalized)) return normalized;
  if (fs.existsSync(decoded)) return decoded;

  try {
    const log = await ConsolidationLog.findOne({
      $or: [
        { 'operations.sourcePath': normalized },
        { 'operations.sourcePath': decoded },
        { 'operations.sourcePath': filePath }
      ]
    }).lean();
    const op = log?.operations?.find((o) =>
      o.sourcePath === normalized || o.sourcePath === decoded || o.sourcePath === filePath
    );
    if (op?.quarantinePath && fs.existsSync(op.quarantinePath)) return op.quarantinePath;
    if (op?.targetPath && fs.existsSync(op.targetPath)) return op.targetPath;
  } catch {}
  return null;
}

// Generates an on-the-fly SVG placeholder buffer. CRITICAL: Never cache this on disk or in memCache!
export async function generatePlaceholder(ext, filename) {
  const label = ((ext || '').replace('.', '') || 'RAW').toUpperCase();
  const safeName = filename && filename.length > 20 ? filename.slice(0, 18) + '...' : (filename || 'File');
  const svg = `<svg width="480" height="480" viewBox="0 0 480 480" xmlns="http://www.w3.org/2000/svg">
    <rect width="480" height="480" fill="#0f172a"/>
    <rect x="140" y="160" width="200" height="130" rx="16" fill="#1e293b" stroke="#334155" stroke-width="4"/>
    <circle cx="240" cy="225" r="32" fill="#334155"/>
    <text x="240" y="335" font-family="system-ui, sans-serif" font-size="28" font-weight="bold" fill="#38bdf8" text-anchor="middle">${label}</text>
    <text x="240" y="370" font-family="system-ui, sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">${safeName}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).webp({ quality: 80 }).toBuffer();
}

// Read file into Buffer with retry for Windows sharing violation immunity
async function readFileWithRetry(filePath, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fs.promises.readFile(filePath);
    } catch (err) {
      if (attempt === maxAttempts || !['EBUSY', 'EPERM', 'EACCES'].includes(err.code)) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 60 * attempt));
    }
  }
  return null;
}

export class MediaStreamController {
  static async getThumbnailBuffer(filePath) {
    const realPath = await resolveRealOrQuarantinePath(filePath);
    if (!realPath) return null;

    await fs.promises.mkdir(THUMB_DIR, { recursive: true });
    let stat;
    try {
      stat = await fs.promises.stat(realPath);
    } catch {
      return null;
    }

    // Stable hash based on normalized path + mtimeMs rounded to seconds (NTFS precision immunity)
    const normPath = path.resolve(realPath).toLowerCase();
    const mtimeSec = Math.floor(stat.mtimeMs / 1000);
    const hashKey = crypto.createHash('md5').update(`v6_${normPath}_${mtimeSec}_${stat.size}`).digest('hex');
    const thumbPath = path.join(THUMB_DIR, `${hashKey}.webp`);

    // 1. Check in-memory cache
    if (memCache.has(hashKey)) {
      return memCache.get(hashKey);
    }

    // 2. Check disk cache
    if (fs.existsSync(thumbPath)) {
      try {
        const diskBuf = await fs.promises.readFile(thumbPath);
        // Sanity check: valid webp header
        if (diskBuf.length > 200 && diskBuf.slice(0, 4).toString() === 'RIFF') {
          if (memCache.size < MAX_MEM_CACHE) memCache.set(hashKey, diskBuf);
          return diskBuf;
        } else {
          // Corrupt cache file, remove it
          await fs.promises.unlink(thumbPath).catch(() => {});
        }
      } catch {}
    }

    // 3. In-flight request deduplication (coalesce concurrent requests for the same file)
    if (inFlightRequests.has(hashKey)) {
      return inFlightRequests.get(hashKey);
    }

    const genPromise = (async () => {
      const ext = path.extname(realPath).toLowerCase();
      const isVideo = ['.mp4', '.mkv', '.mov', '.avi', '.webm', '.3gp', '.m4v'].includes(ext);
      let buffer = null;

      if (isVideo) {
        // Try extracting frame at 0.5s, fallback to 0.1s or 0.0s
        let frameBuf = await VideoKeyframeService.extractFrameBuffer(realPath, 0.5).catch(() => null);
        if (!frameBuf) {
          frameBuf = await VideoKeyframeService.extractFrameBuffer(realPath, 0.1).catch(() => null);
        }
        if (frameBuf) {
          buffer = await sharp(frameBuf, { failOnError: false })
            .rotate()
            .resize(480, 480, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer()
            .catch(() => null);
        }
      } else {
        // IMAGE: Read via Buffer with retry to prevent Windows sharing violations
        try {
          const fileBuf = await readFileWithRetry(realPath, 3);
          if (fileBuf) {
            buffer = await sharp(fileBuf, { failOnError: false })
              .rotate()
              .resize(480, 480, { fit: 'inside', withoutEnlargement: true })
              .webp({ quality: 80 })
              .toBuffer();
          }
        } catch {
          // Fallback for RAW / DNG formats
          if (['.dng', '.tif', '.tiff', '.raw'].includes(ext)) {
            buffer = await decodeRawBayerThumbnail(realPath).catch(() => null);
          }
          // Last ditch: try video frame extractor for animated/atypical files
          if (!buffer) {
            const frameBuf = await VideoKeyframeService.extractFrameBuffer(realPath, 0.0).catch(() => null);
            if (frameBuf) {
              buffer = await sharp(frameBuf, { failOnError: false })
                .rotate()
                .resize(480, 480, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer()
                .catch(() => null);
            }
          }
        }
      }

      // ONLY write genuine thumbnails to disk and memory cache. NEVER cache placeholders!
      if (buffer && buffer.length > 200) {
        await fs.promises.writeFile(thumbPath, buffer).catch(() => {});
        if (memCache.size < MAX_MEM_CACHE) memCache.set(hashKey, buffer);
        return buffer;
      }

      return null;
    })().finally(() => {
      inFlightRequests.delete(hashKey);
    });

    inFlightRequests.set(hashKey, genPromise);
    return genPromise;
  }

  static async getThumbnail(req, res) {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).send('File path required');

    try {
      const realPath = await resolveRealOrQuarantinePath(filePath);
      if (realPath) {
        const st = await fs.promises.stat(realPath).catch(() => null);
        if (st) {
          const etag = `"${st.size}-${Math.floor(st.mtimeMs / 1000)}"`;
          if (req.headers['if-none-match'] === etag) {
            return res.status(304).end();
          }
          res.setHeader('ETag', etag);
        }
      }

      const buffer = await MediaStreamController.getThumbnailBuffer(filePath);
      if (buffer && buffer.length > 200) {
        // Genuine thumbnail: Cache aggressively for 24 hours
        res.setHeader('Content-Type', 'image/webp');
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
        return res.end(buffer);
      }

      // Generation failed: Return on-the-fly placeholder with NO CACHE so it retries automatically
      const ext = path.extname(filePath).toLowerCase();
      const placeholder = await generatePlaceholder(ext, path.basename(filePath));
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      return res.end(placeholder);
    } catch {
      const fallback = await generatePlaceholder('.raw', 'file');
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      return res.end(fallback);
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
      // Gentle concurrency: 3 items per batch to keep CPU/RAM/I-O completely smooth
      const slice = allPaths.slice(idx, idx + 3);
      idx += 3;
      Promise.all(slice.map((p) => this.getThumbnailBuffer(p).catch(() => null))).finally(() => {
        setTimeout(nextBatch, 60);
      });
    };
    setTimeout(nextBatch, 200);
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
