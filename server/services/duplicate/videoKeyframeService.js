import { spawn } from 'child_process';
import sharp from 'sharp';
import { bufferHammingDistance } from './fastHammingService.js';

export class VideoKeyframeService {
  /**
   * Probe video duration and resolution
   */
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
          const width = videoStream?.width || 0;
          const height = videoStream?.height || 0;
          resolve({ duration, width, height });
        } catch {
          resolve({ duration: 0, width: 0, height: 0 });
        }
      });
      probe.on('error', () => resolve({ duration: 0, width: 0, height: 0 }));
    });
  }

  /**
   * Extract a single frame buffer at specified timestamp (seconds)
   */
  static extractFrameBuffer(filePath, timestamp) {
    return new Promise((resolve) => {
      const args = [
        '-ss', String(Math.max(0.1, timestamp)),
        '-i', filePath,
        '-vf', 'scale=160:-1',
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

  /**
   * Extract compact 30-byte dHash buffer from a single frame timestamp
   */
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
          bitIdx++;
          if (bitIdx === 8) {
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

  /**
   * Extract 5 equidistant keyframe dHashes (10%, 30%, 50%, 70%, 90%)
   */
  static async extractFiveKeyframes(filePath, duration) {
    if (!duration || duration < 0.5) return [];
    const ratios = [0.1, 0.3, 0.5, 0.7, 0.9];
    const hashes = [];
    for (const r of ratios) {
      const buf = await this.extractSingleFrameHash(filePath, duration * r);
      if (buf) hashes.push(buf);
    }
    return hashes;
  }

  /**
   * Ultra-fast video similarity: 1-frame early exit before expensive 5-frame extraction
   */
  static async compareVideos(vidA, vidB, minSimilarity = 95) {
    if (Math.abs((vidA.duration || 0) - (vidB.duration || 0)) > 0.5) {
      return { matches: false, similarity: 0 };
    }

    // Tier 1: Center frame early-exit check (50% timestamp)
    if (!vidA._centerBuf) {
      vidA._centerBuf = await this.extractSingleFrameHash(vidA.filePath, vidA.duration * 0.5);
    }
    if (!vidB._centerBuf) {
      vidB._centerBuf = await this.extractSingleFrameHash(vidB.filePath, vidB.duration * 0.5);
    }

    if (!vidA._centerBuf || !vidB._centerBuf) {
      return { matches: false, similarity: 0 };
    }

    const centerDist = bufferHammingDistance(vidA._centerBuf, vidB._centerBuf);
    if (centerDist > 28) {
      return { matches: false, similarity: 0 }; // 85%+ calls early exit here!
    }

    // Tier 2: Extract 5-frame signature for definitive match
    if (!vidA.keyframesHash?.length) {
      vidA.keyframesHash = await this.extractFiveKeyframes(vidA.filePath, vidA.duration);
    }
    if (!vidB.keyframesHash?.length) {
      vidB.keyframesHash = await this.extractFiveKeyframes(vidB.filePath, vidB.duration);
    }

    const kfA = vidA.keyframesHash || [];
    const kfB = vidB.keyframesHash || [];
    if (kfA.length < 3 || kfB.length < 3) {
      return { matches: false, similarity: 0 };
    }

    const count = Math.min(kfA.length, kfB.length);
    let totalScore = 0;
    for (let i = 0; i < count; i++) {
      const dist = bufferHammingDistance(kfA[i], kfB[i]);
      const sim = Math.max(0, 1 - dist / 240);
      totalScore += sim;
    }

    const avgSimilarity = Number(((totalScore / count) * 100).toFixed(2));
    return {
      matches: avgSimilarity >= minSimilarity,
      similarity: avgSimilarity
    };
  }
}
