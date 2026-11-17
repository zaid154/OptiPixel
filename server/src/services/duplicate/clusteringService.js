import { hexToBuffer, calculateBufferVisualSimilarity } from './fastHammingService.js';
import { MultiIndexHashService } from './multiIndexHashService.js';
import { VideoKeyframeService } from './videoKeyframeService.js';
import { PixelClusteringService } from './pixelClusteringService.js';
import { clusterExactFiles } from './exactClusterHelper.js';
import { verifyContentFidelity } from './contentFidelityGuard.js';
import { workerPool } from '../../workers/workerPool.js';

export class ClusteringService {
  static async cluster(
    files,
    minSimilarity = 95,
    modes = ['exact', 'visual'],
    shouldAbort = () => false,
    onProgress = () => {},
    onPartialGroups = () => {}
  ) {
    const groups = [];
    let groupId = 1;

    // Tier 1: 100% Exact SHA-256 Match Clusters
    if (modes.includes('exact')) {
      onProgress({ stage: 'clustering', currentFile: 'Clustering exact SHA-256 matches...' });
      groupId = await clusterExactFiles(files, groups, groupId, shouldAbort);
      if (groups.length > 0) onPartialGroups([...groups], 'exact');
    }
    if (shouldAbort()) return groups;

    // Tier 2: 1:1 Raw Pixel Match
    if (modes.includes('pixel') || modes.includes('raw_pixel')) {
      onProgress({ stage: 'clustering', currentFile: 'Clustering raw pixel identicals...' });
      groupId = await PixelClusteringService.cluster(files, groups, groupId, shouldAbort, workerPool);
      if (groups.length > 0) onPartialGroups([...groups], 'pixel');
    }
    if (shouldAbort()) return groups;

    // Tier 3: Visual Image Clusters with Multi-Index Inverted Hashing
    if (modes.includes('visual')) {
      const images = files.filter((f) => f.mediaType === 'image' && f.dHash && f.pHash);
      for (const img of images) {
        img._dBuf = img._dBuf || hexToBuffer(img.dHash);
        img._pBuf = img._pBuf || hexToBuffer(img.pHash);
      }

      const ratioBuckets = new Map();
      for (const img of images) {
        const bucketKey = (img.aspectRatio || 1).toFixed(1);
        if (!ratioBuckets.has(bucketKey)) ratioBuckets.set(bucketKey, []);
        ratioBuckets.get(bucketKey).push(img);
      }

      const visited = new Set();
      let bIdx = 0;
      const totalBuckets = ratioBuckets.size;

      for (const bucket of ratioBuckets.values()) {
        if (shouldAbort()) break;
        bIdx++;
        if (bIdx % 3 === 0 || bIdx === totalBuckets) {
          onProgress({ stage: 'clustering', currentFile: `Clustering visual images (${bIdx}/${totalBuckets})...` });
        }

        const useIndex = bucket.length > 40;
        const tables = useIndex ? MultiIndexHashService.buildIndex(bucket) : null;

        for (let i = 0; i < bucket.length; i++) {
          if (visited.has(bucket[i].filePath)) continue;
          const cluster = [bucket[i]];

          const candidates = useIndex
            ? MultiIndexHashService.getCandidates(tables, bucket[i], i)
            : null;
          const count = candidates ? candidates.length : bucket.length - i - 1;

          for (let c = 0; c < count; c++) {
            const j = candidates ? candidates[c] : i + 1 + c;
            if (visited.has(bucket[j].filePath)) continue;
            if (bucket[i].fullHash && bucket[i].fullHash === bucket[j].fullHash) continue;

            const maxRatioDiff = minSimilarity <= 90 ? 0.05 : 0.03;
            const ratioDiff = Math.abs((bucket[i].aspectRatio || 0) - (bucket[j].aspectRatio || 0));
            if (ratioDiff <= maxRatioDiff) {
              const sim = calculateBufferVisualSimilarity(bucket[i]._dBuf, bucket[j]._dBuf, bucket[i]._pBuf, bucket[j]._pBuf, bucket[i], bucket[j]);
              if (sim >= minSimilarity) {
                const isIdentical = sim >= 98 ? true : await verifyContentFidelity(bucket[i].filePath, bucket[j].filePath);
                if (isIdentical) {
                  cluster.push({ ...bucket[j], matchConfidence: sim });
                  visited.add(bucket[j].filePath);
                }
              }
            }
          }

          if (cluster.length > 1) {
            visited.add(bucket[i].filePath);
            cluster.sort((a, b) => (b.visualScore || 0) - (a.visualScore || 0) || (b.resolution?.width || 0) - (a.resolution?.width || 0) || b.size - a.size);
            const wasted = cluster.slice(1).reduce((sum, item) => sum + item.size, 0);
            const confs = cluster.slice(1).map((f) => f.matchConfidence || minSimilarity);
            const avgConf = Number((confs.reduce((a, b) => a + b, 0) / confs.length).toFixed(1));
            groups.push({
              id: `visual-${groupId++}`, matchType: 'visual_phash', confidence: avgConf, wastedBytes: wasted,
              files: cluster.map((file, idx) => ({ ...file, isOriginal: idx === 0, markedForDelete: false, isBestShot: idx === 0 }))
            });
            if (groups.length % 5 === 0) onPartialGroups([...groups], 'visual');
          }
        }
        if (groups.length > 0) onPartialGroups([...groups], 'visual');
      }
    }
    if (shouldAbort()) return groups;

    // Tier 4: Video Clusters
    const videos = files.filter((f) => f.mediaType === 'video' && f.duration > 0);
    videos.sort((a, b) => (a.duration || 0) - (b.duration || 0));
    const visitedVid = new Set();

    for (let i = 0; i < videos.length; i++) {
      if (shouldAbort()) break;
      if (visitedVid.has(videos[i].filePath)) continue;
      if (i % 10 === 0 || i === videos.length - 1) {
        onProgress({ stage: 'clustering', currentFile: `Matching video signatures (${i + 1}/${videos.length})...` });
      }

      const vA = videos[i];
      const vidCluster = [vA];
      const ratioA = (vA.resolution?.width || 1) / (vA.resolution?.height || 1);

      for (let j = i + 1; j < videos.length; j++) {
        if (visitedVid.has(videos[j].filePath)) continue;
        const vB = videos[j];
        if ((vB.duration - vA.duration) > 0.08) break;
        const ratioB = (vB.resolution?.width || 1) / (vB.resolution?.height || 1);
        if (Math.abs(ratioA - ratioB) > 0.04) continue;
        const maxSz = Math.max(vA.size || 1, vB.size || 1);
        const minSz = Math.max(1, Math.min(vA.size || 1, vB.size || 1));
        if (maxSz / minSz > 2.5) continue;
        if (vA.fullHash && vA.fullHash === vB.fullHash) continue;

        const check = await VideoKeyframeService.compareVideos(vA, vB, minSimilarity);
        if (check.matches) {
          vidCluster.push({ ...vB, matchConfidence: check.similarity });
          visitedVid.add(vB.filePath);
        }
      }

      if (vidCluster.length > 1) {
        visitedVid.add(videos[i].filePath);
        vidCluster.sort((a, b) => (b.visualScore || 0) - (a.visualScore || 0) || (b.resolution?.width || 0) - (a.resolution?.width || 0) || b.size - a.size);
        const wasted = vidCluster.slice(1).reduce((sum, item) => sum + item.size, 0);
        const confs = vidCluster.slice(1).map((f) => f.matchConfidence || minSimilarity);
        const avgConf = Number((confs.reduce((a, b) => a + b, 0) / confs.length).toFixed(1));
        groups.push({
          id: `video-${groupId++}`, matchType: 'video_keyframes', confidence: avgConf, wastedBytes: wasted,
          files: vidCluster.map((file, idx) => ({ ...file, isOriginal: idx === 0, markedForDelete: false, isBestShot: idx === 0 }))
        });
      }
    }
    if (groups.length > 0) onPartialGroups([...groups], 'video');
    return groups;
  }
}
