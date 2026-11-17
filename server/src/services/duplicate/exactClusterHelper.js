import path from 'path';
import { workerPool } from '../../workers/workerPool.js';

const COPY_REGEX = /( - copy|\((\d+)\)|_copy)/i;

function getFilenameScore(filePath) {
  const name = path.basename(filePath || '').toLowerCase();
  if (COPY_REGEX.test(name)) return -50;
  return 20;
}

function getFolderDepthScore(filePath) {
  const segments = (filePath || '').replace(/\\/g, '/').split('/').filter(Boolean);
  return Math.max(0, segments.length - 1);
}

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
          // Smart sort: clean filename > deeper folder > oldest mtime (NOT just size)
          cluster.sort((a, b) =>
            getFilenameScore(b.filePath) - getFilenameScore(a.filePath) ||
            getFolderDepthScore(b.filePath) - getFolderDepthScore(a.filePath) ||
            (a.mtimeMs || 0) - (b.mtimeMs || 0)
          );
          const wasted = cluster.slice(1).reduce((sum, item) => sum + item.size, 0);
          groups.push({
            id: `exact-${groupId++}`, matchType: 'exact_sha256', confidence: 100, wastedBytes: wasted,
            files: cluster.map((file, idx) => ({ ...file, isOriginal: idx === 0, markedForDelete: idx > 0, isBestShot: idx === 0 }))
          });
        }
      }
    }
  }
  return groupId;
}
