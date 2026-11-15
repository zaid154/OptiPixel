import sharp from 'sharp';
import crypto from 'crypto';

export class RawPixelService {
  /**
   * Extract raw uncompressed RGB bitmap and compute 256-bit raw pixel hash
   */
  static async computePixelHash(filePath) {
    try {
      const raw = await sharp(filePath)
        .toColorspace('srgb')
        .raw()
        .toBuffer({ resolveWithObject: true });

      const hash = crypto.createHash('sha256').update(raw.data).digest('hex');
      return {
        pixelHash: hash,
        width: raw.info.width,
        height: raw.info.height,
        channels: raw.info.channels
      };
    } catch {
      return null;
    }
  }

  /**
   * Compare two images pixel-by-pixel
   */
  static async compareRawPixels(pathA, pathB) {
    try {
      const [imgA, imgB] = await Promise.all([
        sharp(pathA).toColorspace('srgb').raw().toBuffer({ resolveWithObject: true }),
        sharp(pathB).toColorspace('srgb').raw().toBuffer({ resolveWithObject: true })
      ]);

      if (imgA.info.width !== imgB.info.width || imgA.info.height !== imgB.info.height) {
        return { matches: false, similarity: 0, reason: 'Dimension mismatch' };
      }

      const bufA = imgA.data;
      const bufB = imgB.data;
      const totalPixels = imgA.info.width * imgA.info.height;
      let diffPixels = 0;

      for (let i = 0; i < bufA.length; i += 3) {
        if (bufA[i] !== bufB[i] || bufA[i + 1] !== bufB[i + 1] || bufA[i + 2] !== bufB[i + 2]) {
          diffPixels++;
        }
      }

      const matchPct = Number((((totalPixels - diffPixels) / totalPixels) * 100).toFixed(2));
      return {
        matches: diffPixels === 0,
        similarity: matchPct,
        diffPixelCount: diffPixels,
        totalPixels
      };
    } catch (err) {
      return { matches: false, similarity: 0, error: err.message };
    }
  }

  /**
   * Generate glowing neon magenta Pixel Diff Heatmap buffer
   */
  static async generateDiffHeatmap(pathA, pathB) {
    const [imgA, imgB] = await Promise.all([
      sharp(pathA).toColorspace('srgb').raw().toBuffer({ resolveWithObject: true }),
      sharp(pathB).toColorspace('srgb').raw().toBuffer({ resolveWithObject: true })
    ]);

    const width = Math.min(imgA.info.width, imgB.info.width);
    const height = Math.min(imgA.info.height, imgB.info.height);
    const diffBuf = Buffer.alloc(width * height * 4); // RGBA

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idxA = (y * imgA.info.width + x) * 3;
        const idxB = (y * imgB.info.width + x) * 3;
        const outIdx = (y * width + x) * 4;

        const dr = Math.abs(imgA.data[idxA] - imgB.data[idxB]);
        const dg = Math.abs(imgA.data[idxA + 1] - imgB.data[idxB + 1]);
        const db = Math.abs(imgA.data[idxA + 2] - imgB.data[idxB + 2]);
        const delta = dr + dg + db;

        if (delta === 0) {
          // Exactly matching pixel: semi-transparent muted dark gray
          diffBuf[outIdx] = 20;
          diffBuf[outIdx + 1] = 24;
          diffBuf[outIdx + 2] = 30;
          diffBuf[outIdx + 3] = 160;
        } else {
          // Differing pixel: Glowing neon magenta/rose (255, 0, 110)
          const intensity = Math.min(255, 80 + delta * 2);
          diffBuf[outIdx] = intensity;
          diffBuf[outIdx + 1] = 20;
          diffBuf[outIdx + 2] = 100;
          diffBuf[outIdx + 3] = 255;
        }
      }
    }

    return sharp(diffBuf, { raw: { width, height, channels: 4 } }).png().toBuffer();
  }
}
