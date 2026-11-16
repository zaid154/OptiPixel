/**
 * Multi-Index Hashing Service (Pigeonhole Inverted Sub-Index)
 * Reduces O(N^2) pairwise comparisons to O(N) by partitioning hashes
 * into 4 16-bit blocks and indexing them for O(1) candidate lookup.
 */
export class MultiIndexHashService {
  /**
   * Build 4-chunk inverted indices for an array of images.
   * @param {Array} images Array of file objects with _pBuf or pHash
   * @returns {Array<Map<number, number[]>>} 4 sub-tables
   */
  static buildIndex(images) {
    const tables = [new Map(), new Map(), new Map(), new Map()];

    for (let idx = 0; idx < images.length; idx++) {
      const buf = images[idx]._pBuf;
      if (!buf || buf.length < 8) continue;

      const keys = [
        (buf[0] << 8) | buf[1],
        (buf[2] << 8) | buf[3],
        (buf[4] << 8) | buf[5],
        (buf[6] << 8) | buf[7],
      ];

      for (let t = 0; t < 4; t++) {
        const key = keys[t];
        let list = tables[t].get(key);
        if (!list) {
          list = [];
          tables[t].set(key, list);
        }
        list.push(idx);
      }
    }

    return tables;
  }

  /**
   * Find candidate indices for image at `targetIdx` that share at least one exact 16-bit chunk.
   * Only returns candidate indices j > targetIdx to avoid redundant comparisons.
   * @param {Array<Map<number, number[]>>} tables
   * @param {object} image
   * @param {number} targetIdx
   * @returns {number[]} candidate indices
   */
  static getCandidates(tables, image, targetIdx) {
    const buf = image._pBuf;
    if (!buf || buf.length < 8) return [];

    const keys = [
      (buf[0] << 8) | buf[1],
      (buf[2] << 8) | buf[3],
      (buf[4] << 8) | buf[5],
      (buf[6] << 8) | buf[7],
    ];

    const candidateSet = new Set();
    for (let t = 0; t < 4; t++) {
      const list = tables[t].get(keys[t]);
      if (list) {
        for (let k = 0; k < list.length; k++) {
          const j = list[k];
          if (j > targetIdx) {
            candidateSet.add(j);
          }
        }
      }
    }

    return Array.from(candidateSet);
  }
}
