import { workerPool } from '../../workers/workerPool.js';

export async function clusterExactFiles(files, groups, startGroupId, shouldAbort = () => false) {
  let groupId = startGroupId;
  const candidateMap = new Map();
  for (const f of files) {
    if (!f.partialHash) continue;
    const key = `${f.mediaType || 'file'}_${f.size}_${f.partialHash}`;
    if (!candidateMap.has(key)) candidateMap.set(key, []);
    candidateMap.get(key).push(f);
  }

  for (const candidates of candidateMap.values()) {
    if (shouldAbort()) break;
    if (candidates.length > 1) {
      for (const f of candidates) {
        if (!f.fullHash) f.fullHash = await workerPool.execute('full_hash', { filePath: f.filePath });
      }
      const exactMap = new Map();
      for (const f of candidates) {
        if (!f.fullHash) continue;
        if (!exactMap.has(f.fullHash)) exactMap.set(f.fullHash, []);
        exactMap.get(f.fullHash).push(f);
      }
      for (const cluster of exactMap.values()) {
        if (cluster.length > 1) {
          cluster.sort((a, b) => b.size - a.size);
          const wasted = cluster.slice(1).reduce((sum, item) => sum + item.size, 0);
          groups.push({
            id: `exact-${groupId++}`, matchType: 'exact_sha256', confidence: 100, wastedBytes: wasted,
            files: cluster.map((file, idx) => ({ ...file, isOriginal: idx === 0, markedForDelete: idx > 0 }))
          });
        }
      }
    }
  }
  return groupId;
}
