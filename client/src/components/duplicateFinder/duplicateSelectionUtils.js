export function getFilenameScore(filePath) {
  if (!filePath) return 0;
  const name = filePath.split(/[/\\]/).pop().toLowerCase();
  // Heavy penalty for Windows copy suffixes like ' - Copy', '(1)', '_copy'
  if (/( - copy|\((\d+)\)|_copy)/i.test(name)) return -50;
  return 20;
}

export function getFolderScore(filePath, rootPath = '') {
  if (!filePath) return 0;
  const normFile = filePath.replace(/\\/g, '/').toLowerCase();
  const normRoot = (rootPath || '').replace(/\\/g, '/').toLowerCase();
  const rel = normFile.startsWith(normRoot) ? normFile.slice(normRoot.length).replace(/^\/+/, '') : normFile;
  const segments = rel.split('/').filter(Boolean);

  // Transit or temp folders get lowest score
  const isTransit = /(whatsapp|telegram|downloads|download|temp|cache)/i.test(normFile);
  if (isTransit) return -20;
  // Stray root files get 0
  if (segments.length <= 1) return 0;
  // Deeper, organized event folders get higher priority (e.g. College/PCTI/College 6th Sem = 30)
  return segments.length * 10;
}

export function compareDuplicateCandidates(a, b, rule = 'keep_best_quality', rootPath = '') {
  if (rule === 'keep_largest') {
    const sizeDiff = b.size - a.size;
    if (sizeDiff !== 0) return sizeDiff;
    return getFilenameScore(b.filePath) - getFilenameScore(a.filePath);
  }

  if (rule === 'keep_best_quality' || rule === 'keep_best_visual') {
    // 1. Visual Score Difference (if significant)
    const scoreDiff = (b.visualScore || 0) - (a.visualScore || 0);
    if (Math.abs(scoreDiff) >= 5) return scoreDiff;

    // 2. Resolution Area
    const resA = (a.resolution?.width || 0) * (a.resolution?.height || 0);
    const resB = (b.resolution?.width || 0) * (b.resolution?.height || 0);
    if (resB !== resA) return resB - resA;

    // 3. File Size (higher quality uncompressed copy)
    const sizeDiff = b.size - a.size;
    if (Math.abs(sizeDiff) > 50 * 1024) return sizeDiff;
  }

  // 4. Filename Cleanliness (Real original name ALWAYS beats '... - Copy.jpg')
  const fnScoreDiff = getFilenameScore(b.filePath) - getFilenameScore(a.filePath);
  if (fnScoreDiff !== 0) return fnScoreDiff;

  // 5. Folder Depth & Specificity (Organized subfolder ALWAYS beats Root stray file)
  const folderScoreDiff = getFolderScore(b.filePath, rootPath) - getFolderScore(a.filePath, rootPath);
  if (folderScoreDiff !== 0) return folderScoreDiff;

  // 6. Chronological: Original oldest modified time
  return (a.mtimeMs || 0) - (b.mtimeMs || 0);
}

export function applyGroupAutoSelect(groups, groupId, rule, rootPath = '') {
  return groups.map((g) => {
    if (g.id !== groupId) return g;
    const sorted = [...g.files].sort((a, b) => compareDuplicateCandidates(a, b, rule, rootPath));
    const keepPath = sorted[0].filePath;
    return {
      ...g,
      files: g.files.map((f) => ({
        ...f,
        markedForDelete: f.filePath !== keepPath,
        isBestShot: f.filePath === keepPath
      }))
    };
  });
}

export function applyGlobalAutoSelect(groups, rule, targetGroupIds = null, rootPath = '') {
  const targetSet = targetGroupIds ? new Set(targetGroupIds) : null;
  return groups.map((g) => {
    if (targetSet && !targetSet.has(g.id)) return g;
    if (rule === 'deselect_all') {
      return { ...g, files: g.files.map((f) => ({ ...f, markedForDelete: false })) };
    }
    const sorted = [...g.files].sort((a, b) => compareDuplicateCandidates(a, b, rule, rootPath));
    const keepPath = sorted[0].filePath;
    return {
      ...g,
      files: g.files.map((f) => ({
        ...f,
        markedForDelete: f.filePath !== keepPath,
        isBestShot: f.filePath === keepPath
      }))
    };
  });
}
