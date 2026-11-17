export async function pauseBatch(batchId) {
  if (!batchId) return false;
  try {
    const res = await fetch(`/api/batch-folder/pause/${batchId}`, { method: 'POST' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to pause batch');
    }
    return true;
  } catch (err) {
    console.error('[folderBatchActions] pauseBatch failed:', err.message);
    throw err;
  }
}

export async function resumeBatch(batchId) {
  if (!batchId) return false;
  try {
    const res = await fetch(`/api/batch-folder/resume/${batchId}`, { method: 'POST' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to resume batch');
    }
    return true;
  } catch (err) {
    console.error('[folderBatchActions] resumeBatch failed:', err.message);
    throw err;
  }
}

export async function cancelBatch(batchId) {
  if (!batchId) return false;
  if (window.confirm('Are you sure you want to stop the batch optimization? Completed files will remain intact.')) {
    try {
      const res = await fetch(`/api/batch-folder/cancel/${batchId}`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to cancel batch');
      }
      return true;
    } catch (err) {
      console.error('[folderBatchActions] cancelBatch failed:', err.message);
      throw err;
    }
  }
  return false;
}

export async function retryFailedBatch(batchId) {
  if (!batchId) return false;
  try {
    const res = await fetch(`/api/batch-folder/retry/${batchId}`, { method: 'POST' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to retry batch');
    }
    return true;
  } catch (err) {
    console.error('[folderBatchActions] retryFailedBatch failed:', err.message);
    return false;
  }
}

export async function copyFallbackBatch(batchId) {
  if (!batchId) return '';
  try {
    const res = await fetch(`/api/batch-folder/copy-fallback/${batchId}`, { method: 'POST' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to copy fallback files');
    }
    const data = await res.json();
    return data.message || 'Copied all remaining files as originals!';
  } catch (err) {
    console.error('[folderBatchActions] copyFallbackBatch failed:', err.message);
    throw err;
  }
}
