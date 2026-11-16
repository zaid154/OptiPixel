import { spawn } from 'child_process';
import sharp from 'sharp';
import { bufferHammingDistance } from './fastHammingService.js';
import FileCache from '../../models/FileCache.js';

export class VideoKeyframeService {
  static getVideoInfo(filePath) {
    return new Promise((resolve) => {
      const args = ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath];
      const probe = spawn('ffprobe', args);
      let out = '';
      probe.stdout.on('data', (d) => (out += d.toString()));
      probe.on('close', (code) => {
        if (code !== 0) return resolve({ duration: 0, width: 0, height: 0 });
        try {
          const json = JSON.parse(out);
          const duration = parseFloat(json?.format?.duration || '0');
          const videoStream = json?.streams?.find((s) => s.codec_type === 'video');
          resolve({ duration, width: videoStream?.width || 0, height: videoStream?.height || 0 });
        } catch {
          resolve({ duration: 0, width: 0, height: 0 });
        }
      });
      probe.on('error', () => resolve({ duration: 0, width: 0, height: 0 }));
    });
  }

  static extractFrameBuffer(filePath, timestamp) {
    return new Promise((resolve) => {
      const args = [
        '-ss', String(Math.max(0.1, timestamp)),
        '-noaccurate_seek',
        '-i', filePath,
        '-vframes', '1',
        '-f', 'image2pipe',
        '-vcodec', 'mjpeg',
        '-'
      ];
      const ffmpeg = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'ignore'] });
      const chunks = [];
      const timer = setTimeout(() => {
        try { ffmpeg.kill(); } catch {}
        resolve(null);
      }, 3000);

      ffmpeg.stdout.on('data', (d) => chunks.push(d));
      ffmpeg.on('close', () => {
        clearTimeout(timer);
        resolve(Buffer.concat(chunks));
      });
      ffmpeg.on('error', () => {
        clearTimeout(timer);
        resolve(null);
      });
    });
  }

  static async extractSingleFrameHash(filePath, timestamp) {
    try {
      const frameBuf = await this.extractFrameBuffer(filePath, timestamp);
      if (!frameBuf || frameBuf.length === 0) return null;
      const raw16 = await sharp(frameBuf)
        .resize(16, 16, { fit: 'fill' })
        .grayscale()
        .raw()
        .toBuffer();

      const buf = Buffer.alloc(30);
      let byteIdx = 0, bitIdx = 0, currentByte = 0;
      for (let r = 0; r < 16; r++) {
        for (let c = 0; c < 15; c++) {
          const bit = raw16[r * 16 + c] > raw16[r * 16 + c + 1] ? 1 : 0;
          currentByte = (currentByte << 1) | bit;
          if (++bitIdx === 8) {
            buf[byteIdx++] = currentByte;
            bitIdx = 0;
            currentByte = 0;
          }
        }
      }
      return buf;
    } catch {
      return null;
    }
  }

  static async getOrExtractCenterHash(vid) {
    if (vid._centerBuf) return vid._centerBuf;
    if (vid.centerFrameHash) {
      vid._centerBuf = Buffer.from(vid.centerFrameHash, 'hex');
      return vid._centerBuf;
    }
    const buf = await this.extractSingleFrameHash(vid.filePath, (vid.duration || 1) * 0.5);
    if (buf) {
      vid._centerBuf = buf;
      vid.centerFrameHash = buf.toString('hex');
      FileCache.updateOne({ filePath: vid.filePath }, { $set: { centerFrameHash: vid.centerFrameHash } }).catch(() => {});
    }
    return buf;
  }

  static async getOrExtractKeyframes(vid) {
    if (vid._kfBuffers?.length) return vid._kfBuffers;
    if (vid.keyframesHash?.length) {
      vid._kfBuffers = vid.keyframesHash.map((h) => (typeof h === 'string' ? Buffer.from(h, 'hex') : h));
      return vid._kfBuffers;
    }
    if (!vid.duration || vid.duration < 0.5) return [];

    const ratios = [0.1, 0.3, 0.5, 0.7, 0.9];
    const hashes = [];
    const hexArray = [];
    for (const r of ratios) {
      const buf = await this.extractSingleFrameHash(vid.filePath, vid.duration * r);
      if (buf) {
        hashes.push(buf);
        hexArray.push(buf.toString('hex'));
      }
    }
    vid._kfBuffers = hashes;
    vid.keyframesHash = hexArray;
    FileCache.updateOne({ filePath: vid.filePath }, { $set: { keyframesHash: hexArray } }).catch(() => {});
    return hashes;
  }

  static async compareVideos(vidA, vidB, minSimilarity = 95) {
    if (Math.abs((vidA.duration || 0) - (vidB.duration || 0)) > 0.5) {
      return { matches: false, similarity: 0 };
    }

    const [cA, cB] = await Promise.all([
      this.getOrExtractCenterHash(vidA),
      this.getOrExtractCenterHash(vidB)
    ]);

    if (!cA || !cB) return { matches: false, similarity: 0 };

    const centerDist = bufferHammingDistance(cA, cB);
    const maxCenterDist = Math.max(38, Math.floor((1 - (minSimilarity / 100)) * 240) + 4);
    if (centerDist > maxCenterDist) {
      return { matches: false, similarity: 0 };
    }

    const [kfA, kfB] = await Promise.all([
      this.getOrExtractKeyframes(vidA),
      this.getOrExtractKeyframes(vidB)
    ]);

    if (!kfA?.length || !kfB?.length || kfA.length < 3 || kfB.length < 3) {
      return { matches: false, similarity: 0 };
    }

    const count = Math.min(kfA.length, kfB.length);
    let totalScore = 0;
    for (let i = 0; i < count; i++) {
      const dist = bufferHammingDistance(kfA[i], kfB[i]);
      totalScore += Math.max(0, 1 - dist / 240);
    }

    const avgSimilarity = Number(((totalScore / count) * 100).toFixed(2));
    return {
      matches: avgSimilarity >= minSimilarity,
      similarity: avgSimilarity
    };
  }
}
