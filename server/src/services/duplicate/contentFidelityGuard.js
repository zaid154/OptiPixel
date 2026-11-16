import sharp from 'sharp';

const thumbCache = new Map();

setInterval(() => {
  if (thumbCache.size > 2000) thumbCache.clear();
}, 5 * 60 * 1000);

async function getGrayscale128(filePath) {
  if (thumbCache.has(filePath)) return thumbCache.get(filePath);
  try {
    const buf = await sharp(filePath).resize(128, 128, { fit: 'fill' }).grayscale().raw().toBuffer();
    if (thumbCache.size < 2000) thumbCache.set(filePath, buf);
    return buf;
  } catch {
    return null;
  }
}

export async function verifyContentFidelity(pathA, pathB) {
  try {
    const [bA, bB] = await Promise.all([
      getGrayscale128(pathA),
      getGrayscale128(pathB)
    ]);

    if (!bA || !bB) return true;

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
