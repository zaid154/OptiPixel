import fs from 'fs';
import crypto from 'crypto';
import sharp from 'sharp';

const CHUNK_SIZE = 64 * 1024; // 64 KB

/**
 * Rapid 3-point partial SHA-256 (Start, Middle, End 64KB)
 */
export async function computePartialHash(filePath, fileSize) {
  if (fileSize <= CHUNK_SIZE * 3) {
    return computeFullHash(filePath);
  }

  const fd = await fs.promises.open(filePath, 'r');
  try {
    const bStart = Buffer.alloc(CHUNK_SIZE);
    const bMid = Buffer.alloc(CHUNK_SIZE);
    const bEnd = Buffer.alloc(CHUNK_SIZE);

    const midOffset = Math.floor(fileSize / 2) - Math.floor(CHUNK_SIZE / 2);
    const endOffset = fileSize - CHUNK_SIZE;

    await fd.read(bStart, 0, CHUNK_SIZE, 0);
    await fd.read(bMid, 0, CHUNK_SIZE, midOffset);
    await fd.read(bEnd, 0, CHUNK_SIZE, endOffset);

    const hash = crypto.createHash('sha256');
    hash.update(bStart);
    hash.update(bMid);
    hash.update(bEnd);
    return hash.digest('hex');
  } finally {
    await fd.close();
  }
}

/**
 * 100.00% Bit-for-bit full file streaming SHA-256
 */
export function computeFullHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * High-Precision Perceptual Data, Sharpness & Visual Quality Scoring
 */
export async function computeImagePerceptualData(filePath) {
  const metadata = await sharp(filePath).metadata();
  const width = metadata.width || 1;
  const height = metadata.height || 1;
  const aspectRatio = Number((width / height).toFixed(4));

  // Compute 16x16 buffer for dHash/pHash and 256x256 Laplacian edge convolution in parallel
  const [raw16, edgeRes] = await Promise.all([
    sharp(filePath).resize(16, 16, { fit: 'fill' }).grayscale().raw().toBuffer(),
    sharp(filePath)
      .resize(256, 256, { fit: 'inside' })
      .greyscale()
      .convolve({ width: 3, height: 3, kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0] })
      .raw()
      .toBuffer({ resolveWithObject: true })
      .catch(() => ({ data: null }))
  ]);

  let sum = 0;
  for (let i = 0; i < 256; i++) sum += raw16[i];
  const avg = Math.round(sum / 256);

  let varianceSum = 0;
  for (let i = 0; i < 256; i++) {
    varianceSum += Math.pow(raw16[i] - avg, 2);
  }
  const variance = Math.round(varianceSum / 256);

  // 1. dHash (Row-wise difference: 16 rows * 15 diffs = 240 bits)
  let dHashBits = '';
  for (let r = 0; r < 16; r++) {
    for (let c = 0; c < 15; c++) {
      dHashBits += raw16[r * 16 + c] > raw16[r * 16 + c + 1] ? '1' : '0';
    }
  }

  // 2. pHash (Average value thresholding across 256 pixels)
  let pHashBits = '';
  for (let i = 0; i < 256; i++) {
    pHashBits += raw16[i] >= avg ? '1' : '0';
  }

  // 3. Laplacian Edge Variance (Sharpness & Focus detection)
  let sharpness = 0;
  if (edgeRes?.data) {
    const edgeData = edgeRes.data;
    let eSum = 0, eSumSq = 0;
    const len = edgeData.length;
    for (let i = 0; i < len; i++) {
      const v = edgeData[i];
      eSum += v;
      eSumSq += v * v;
    }
    const eMean = eSum / len;
    sharpness = Math.round((eSumSq / len) - (eMean * eMean));
  }

  // 4. Composite Visual Quality Score (0 - 100)
  const megapixels = (width * height) / 1000000;
  const resScore = Math.min(100, (megapixels / 12) * 100);
  const sharpScore = Math.min(100, (sharpness / 400) * 100);
  const visualScore = Math.min(100, Math.max(1, Math.round(0.45 * resScore + 0.55 * sharpScore)));

  let clarity = 'Crisp';
  if (sharpness < 200) clarity = 'Good';
  if (sharpness < 120) clarity = 'Soft';
  if (sharpness < 60) clarity = 'Blurry';

  return {
    dHash: bitsToHex(dHashBits),
    pHash: bitsToHex(pHashBits),
    avgBrightness: avg,
    variance,
    aspectRatio,
    resolution: { width, height },
    sharpness,
    visualScore,
    clarity
  };
}

export { calculateHammingDistance, calculateVisualSimilarity, hexToBuffer, bufferHammingDistance, calculateBufferVisualSimilarity } from './fastHammingService.js';

function bitsToHex(bits) {
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.substr(i, 4).padEnd(4, '0'), 2).toString(16);
  }
  return hex;
}
