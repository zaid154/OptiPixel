import { compareDuplicateFiles } from './filePriorityHelper.js';

export class PixelClusteringService {
  /**
   * 1:1 Raw Pixel Bitmap Clustering (Format & EXIF Agnostic)
   * Highly optimized: pre-filtered by Dimensions and dHash before raw bitmap decoding
   */
  static async cluster(files, groups, startGroupId, shouldAbort, workerPool, onProgress = () => {}) {
    let groupId = startGroupId;
    const images = files.filter((f) => f.mediaType === 'image' && f.resolution?.width > 0);
    const dimMap = new Map();

    for (const img of images) {
      const key = `${img.resolution.width}x${img.resolution.height}`;
      if (!dimMap.has(key)) dimMap.set(key, []);
      dimMap.get(key).push(img);
    }

    const existingPaths = new Set(groups.flatMap((g) => g.files.map((f) => f.filePath)));
    const candidateGroups = [];

    // Pre-filter: only inspect buckets with >1 image not already in exact SHA groups
    for (const candidates of dimMap.values()) {
      const unassigned = candidates.filter((c) => !existingPaths.has(c.filePath));
      if (unassigned.length > 1) {
        // Group by dHash: 1:1 identical raw pixel bitmaps MUST have identical dHash
        const hashBuckets = new Map();
        for (const img of unassigned) {
          const hKey = img.dHash || `fallback_${img.size}`;
          if (!hashBuckets.has(hKey)) hashBuckets.set(hKey, []);
          hashBuckets.get(hKey).push(img);
        }
        for (const bucket of hashBuckets.values()) {
          if (bucket.length > 1) candidateGroups.push(bucket);
        }
      }
    }

    let processed = 0;
    const totalToVerify = candidateGroups.reduce((acc, b) => acc + b.length, 0);

    for (const candidates of candidateGroups) {
      if (shouldAbort()) break;

      for (const img of candidates) {
        if (shouldAbort()) break;
        processed++;
        if (processed % 5 === 0 || processed === totalToVerify) {
          onProgress({
            stage: 'clustering',
            currentFile: `Verifying 1:1 raw pixels (${processed}/${totalToVerify})...`
          });
        }
        if (!img.pixelHash) {
          const res = await workerPool.execute('raw_pixel', { filePath: img.filePath });
          if (res?.pixelHash) img.pixelHash = res.pixelHash;
        }
      }

      const pixelMap = new Map();
      for (const img of candidates) {
        if (!img.pixelHash) continue;
        if (!pixelMap.has(img.pixelHash)) pixelMap.set(img.pixelHash, []);
        pixelMap.get(img.pixelHash).push(img);
      }

      for (const cluster of pixelMap.values()) {
        if (cluster.length > 1) {
          const isCovered = cluster.every((c) => existingPaths.has(c.filePath));
          if (!isCovered) {
            cluster.sort((a, b) => compareDuplicateFiles(a, b));
            const wasted = cluster.slice(1).reduce((sum, item) => sum + item.size, 0);
            groups.push({
              id: `pixel-${groupId++}`,
              matchType: 'raw_pixel',
              confidence: 100,
              wastedBytes: wasted,
              files: cluster.map((file, idx) => ({
                ...file,
                isOriginal: idx === 0,
                markedForDelete: false,
                isBestShot: idx === 0
              }))
            });
            for (const c of cluster) existingPaths.add(c.filePath);
          }
        }
      }
    }
    return groupId;
  }
}
