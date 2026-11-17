export function getSavedDupSettings() {
  try {
    return JSON.parse(localStorage.getItem('optipixel_dup_state') || '{}');
  } catch {
    return {};
  }
}

export function saveDupSettings(settings) {
  try {
    localStorage.setItem('optipixel_dup_state', JSON.stringify(settings));
  } catch {}
}

export function getSavedSelections() {
  try {
    return JSON.parse(localStorage.getItem('optipixel_dup_sel') || '{}');
  } catch {
    return {};
  }
}

let syncTimer = null;

export function saveDupSelections(groups) {
  const sel = {};
  for (const g of groups) {
    for (const f of g.files) sel[f.filePath] = f.markedForDelete;
  }
  try {
    localStorage.setItem('optipixel_dup_sel', JSON.stringify(sel));
  } catch {}

  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    fetch('/api/duplicates/selection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selections: sel })
    }).catch(() => {});
  }, 600);
}

export function clearDupSelections() {
  try {
    localStorage.removeItem('optipixel_dup_sel');
  } catch {}
}
