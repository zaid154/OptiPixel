export function applyGroupAutoSelect(groups, groupId, rule) {
  return groups.map((g) => {
    if (g.id !== groupId) return g;
    const sorted = [...g.files].sort((a, b) => {
      if (rule === 'keep_best_quality' || rule === 'keep_best_visual') {
        return (b.visualScore || 0) - (a.visualScore || 0) ||
          (b.resolution?.width || 0) - (a.resolution?.width || 0) ||
          b.size - a.size;
      }
      if (rule === 'keep_largest') return b.size - a.size;
      return (a.mtimeMs || 0) - (b.mtimeMs || 0);
    });
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

export function applyGlobalAutoSelect(groups, rule) {
  return groups.map((g) => {
    if (rule === 'deselect_all') {
      return { ...g, files: g.files.map((f) => ({ ...f, markedForDelete: false })) };
    }
    const sorted = [...g.files].sort((a, b) =>
      rule === 'keep_best_quality' || rule === 'keep_best_visual'
        ? (b.visualScore || 0) - (a.visualScore || 0) ||
          (b.resolution?.width || 0) - (a.resolution?.width || 0) ||
          b.size - a.size
        : (a.mtimeMs || 0) - (b.mtimeMs || 0)
    );
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
