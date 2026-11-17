export class PixelClusteringService {
  /**
   * 1:1 Raw Pixel Bitmap Clustering (Format & EXIF Agnostic)
   */
  static async cluster(files, groups, startGroupId, shouldAbort, workerPool) {
    let groupId = startGroupId;
    const images = files.filter((f) => f.mediaType === 'image' && f.resolution?.width > 0);
    const dimMap = new Map();

    for (const img of images) {
      const key = `${img.resolution.width}x${img.resolution.height}`;
      if (!dimMap.has(key)) dimMap.set(key, []);
      dimMap.get(key).push(img);
    }

    const existingPaths = new Set(groups.flatMap((g) => g.files.map((f) => f.filePath)));

    for (const candidates of dimMap.values()) {
      if (shouldAbort()) break;
      if (candidates.length > 1) {
        for (const img of candidates) {
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
            // Only add if not already captured in 100% SHA-256 group
            const isCovered = cluster.every((c) => existingPaths.has(c.filePath));
            if (!isCovered) {
              cluster.sort((a, b) => (b.visualScore || 0) - (a.visualScore || 0) || b.size - a.size);
              const wasted = cluster.slice(1).reduce((sum, item) => sum + item.size, 0);
              groups.push({
                id: `pixel-${groupId++}`,
                matchType: 'raw_pixel',
                confidence: 100,
                wastedBytes: wasted,
                files: cluster.map((file, idx) => ({ ...file, isOriginal: idx === 0, markedForDelete: false, isBestShot: idx === 0 }))
              });
              for (const c of cluster) existingPaths.add(c.filePath);
            }
          }
        }
      }
    }
    return groupId;
  }
}
