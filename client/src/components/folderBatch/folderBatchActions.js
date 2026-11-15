export async function pauseBatch(batchId) {
  if (!batchId) return;
  try { await fetch(`/api/batch-folder/pause/${batchId}`, { method: 'POST' }); } catch {}
}

export async function resumeBatch(batchId) {
  if (!batchId) return;
  try { await fetch(`/api/batch-folder/resume/${batchId}`, { method: 'POST' }); } catch {}
}

export async function cancelBatch(batchId) {
  if (!batchId) return;
  if (window.confirm('Are you sure you want to stop the batch optimization? Completed files will remain intact.')) {
    try { await fetch(`/api/batch-folder/cancel/${batchId}`, { method: 'POST' }); } catch {}
  }
}

export async function retryFailedBatch(batchId) {
  if (!batchId) return false;
  try {
    const res = await fetch(`/api/batch-folder/retry/${batchId}`, { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function copyFallbackBatch(batchId) {
  if (!batchId) return '';
  try {
    const res = await fetch(`/api/batch-folder/copy-fallback/${batchId}`, { method: 'POST' });
    const data = await res.json();
    return data.message || 'Copied all remaining files as originals!';
  } catch {
    return '';
  }
}
