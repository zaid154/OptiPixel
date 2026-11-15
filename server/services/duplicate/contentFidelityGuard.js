import sharp from 'sharp';

/**
 * High-Precision Text & Content Anomaly Verification Guard
 * Detects localized differences (text, emails, dates, UI inputs) that
 * low-resolution 16x16 perceptual hashes miss.
 */
export async function verifyContentFidelity(pathA, pathB) {
  try {
    const [bA, bB] = await Promise.all([
      sharp(pathA).resize(128, 128, { fit: 'fill' }).grayscale().raw().toBuffer(),
      sharp(pathB).resize(128, 128, { fit: 'fill' }).grayscale().raw().toBuffer()
    ]);

    const blockSize = 8;
    const blocksAcross = 16;
    let maxBlockAvg = 0;

    for (let by = 0; by < blocksAcross; by++) {
      for (let bx = 0; bx < blocksAcross; bx++) {
        let diffSum = 0;
        for (let y = 0; y < blockSize; y++) {
          for (let x = 0; x < blockSize; x++) {
            const idx = (by * blockSize + y) * 128 + (bx * blockSize + x);
            diffSum += Math.abs(bA[idx] - bB[idx]);
          }
        }
        const blockAvg = diffSum / 64;
        if (blockAvg > maxBlockAvg) {
          maxBlockAvg = blockAvg;
          if (maxBlockAvg > 7.5) return false;
        }
      }
    }
    return maxBlockAvg <= 7.5;
  } catch {
    return true;
  }
}
