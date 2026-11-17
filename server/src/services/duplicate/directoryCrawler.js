import fs from 'fs';
import path from 'path';
import { workerPool } from '../../workers/workerPool.js';
import { VideoKeyframeService } from './videoKeyframeService.js';

export const VALID_IMG = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.bmp', '.tif', '.tiff', '.dng']);
export const VALID_VID = new Set(['.mp4', '.mkv', '.mov', '.avi', '.webm', '.3gp', '.m4v']);
export const VALID_AUD = new Set(['.mp3', '.opus', '.wav', '.m4a', '.aac', '.flac', '.ogg']);

export async function traverseDirectory(dir, fileList, emitProgress, shouldAbort = () => false) {
  if (shouldAbort()) return;
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '_Duplicates_Quarantine') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await traverseDirectory(full, fileList, emitProgress, shouldAbort);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        const isImg = VALID_IMG.has(ext);
        const isVid = VALID_VID.has(ext);
        const isAud = VALID_AUD.has(ext);
        if (isImg || isVid || isAud) {
          const stat = await fs.promises.stat(full);
          fileList.push({
            path: full,
            size: stat.size,
            mtimeMs: stat.mtimeMs,
            mediaType: isImg ? 'image' : isVid ? 'video' : 'audio'
          });
          if (fileList.length % 150 === 0) {
            emitProgress({ stage: 'discovering', total: fileList.length, currentFile: `Found ${fileList.length} files (${entry.name})` });
          }
        }
      }
    }
  } catch (err) {
    if (err.code !== 'EPERM' && err.code !== 'EACCES') {
      console.warn(`[Crawler] Warning at ${dir}: ${err.message}`);
    }
  }
}

export async function analyzeFile(file) {
  try {
    const partialHash = await workerPool.execute('partial_hash', { filePath: file.path, fileSize: file.size });
    let p = { dHash: null, pHash: null, aspectRatio: null, resolution: { width: 0, height: 0 } };
    let v = { duration: 0, keyframesHash: [] };

    if (file.mediaType === 'image') {
      p = await workerPool.execute('perceptual_image', { filePath: file.path });
    } else if (file.mediaType === 'video') {
      const info = await VideoKeyframeService.getVideoInfo(file.path);
      v = { duration: info.duration, keyframesHash: [] };
      p.resolution = { width: info.width, height: info.height };
      const mp = ((info.width || 0) * (info.height || 0)) / 1000000;
      const resScore = Math.min(100, (mp / 8) * 100);
      const bitrate = (file.size / Math.max(1, info.duration)) / 125000;
      const bitrateScore = Math.min(100, (bitrate / 15) * 100);
      p.visualScore = Math.min(100, Math.max(1, Math.round(0.6 * resScore + 0.4 * bitrateScore)));
      p.sharpness = Math.round(bitrateScore);
      p.clarity = info.height >= 1080 ? 'Full HD' : info.height >= 720 ? 'HD' : 'SD';
    }

    return {
      filePath: file.path, size: file.size, mtimeMs: file.mtimeMs, mediaType: file.mediaType,
      partialHash, fullHash: null, dHash: p.dHash, pHash: p.pHash, aspectRatio: p.aspectRatio,
      resolution: p.resolution, duration: v.duration, keyframesHash: v.keyframesHash,
      sharpness: p.sharpness || 0, visualScore: p.visualScore || 0, clarity: p.clarity || 'Normal'
    };
  } catch {
    return null;
  }
}
