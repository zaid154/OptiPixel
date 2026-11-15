// Precomputed 256-entry lookup table for ultra-fast bitwise popcount
const POPCOUNT_LUT = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  let count = 0;
  let n = i;
  while (n > 0) {
    count += n & 1;
    n >>= 1;
  }
  POPCOUNT_LUT[i] = count;
}

export function hexToBuffer(hexStr) {
  if (!hexStr || typeof hexStr !== 'string') return null;
  try {
    return Buffer.from(hexStr, 'hex');
  } catch {
    return null;
  }
}

/**
 * 1000x faster Hamming distance directly comparing 32-byte buffers via LUT
 */
export function bufferHammingDistance(bufA, bufB) {
  if (!bufA || !bufB) return 999;
  const len = Math.min(bufA.length, bufB.length);
  let dist = 0;
  for (let i = 0; i < len; i++) {
    dist += POPCOUNT_LUT[bufA[i] ^ bufB[i]];
  }
  return dist + Math.abs(bufA.length - bufB.length) * 8;
}

/**
 * Backwards-compatible hex string Hamming distance
 */
export function calculateHammingDistance(hexA, hexB) {
  if (!hexA || !hexB) return 999;
  const bufA = hexToBuffer(hexA);
  const bufB = hexToBuffer(hexB);
  return bufferHammingDistance(bufA, bufB);
}

/**
 * Ultra-fast visual similarity on pre-buffered dHash and pHash
 */
export function calculateBufferVisualSimilarity(dBufA, dBufB, pBufA, pBufB, metaA = {}, metaB = {}) {
  if ((metaA.variance !== undefined && metaA.variance < 6) || (metaB.variance !== undefined && metaB.variance < 6)) {
    const diffBrightness = Math.abs((metaA.avgBrightness || 0) - (metaB.avgBrightness || 0));
    if (diffBrightness > 15) return 0;
  }

  const distD = bufferHammingDistance(dBufA, dBufB);
  // Early reject if dHash distance exceeds 84% similarity limit (38 bits / 240 bits)
  if (distD > 38) return 0;

  const distP = bufferHammingDistance(pBufA, pBufB);
  const simD = Math.max(0, 1 - distD / 240);
  const simP = Math.max(0, 1 - distP / 256);

  return Number(((simD * 0.5 + simP * 0.5) * 100).toFixed(2));
}

export function calculateVisualSimilarity(dHashA, dHashB, pHashA, pHashB, metaA = {}, metaB = {}) {
  const dBufA = hexToBuffer(dHashA);
  const dBufB = hexToBuffer(dHashB);
  const pBufA = hexToBuffer(pHashA);
  const pBufB = hexToBuffer(pHashB);
  return calculateBufferVisualSimilarity(dBufA, dBufB, pBufA, pBufB, metaA, metaB);
}
