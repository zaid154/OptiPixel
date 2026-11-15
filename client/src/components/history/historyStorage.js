const DB_NAME = 'OptiPixelDB';
const DB_VERSION = 2;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('media_history')) {
        const store = db.createObjectStore('media_history', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains('batch_history')) {
        const bStore = db.createObjectStore('batch_history', { keyPath: 'id' });
        bStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveBatchToHistory(batchData) {
  try {
    const db = await openDB();
    const entry = {
      id: batchData.id || `batch_${Date.now()}`,
      createdAt: new Date().toISOString(),
      sourceDir: batchData.sourceDir || '',
      destDir: batchData.destDir || '',
      startTime: batchData.startTime || new Date().toISOString(),
      endTime: batchData.endTime || new Date().toISOString(),
      durationSeconds: batchData.durationSeconds || 0,
      pauseLog: batchData.pauseLog || [],
      stats: batchData.stats || {},
      files: (batchData.files || []).slice(0, 500)
    };

    await new Promise((resolve, reject) => {
      const tx = db.transaction('batch_history', 'readwrite');
      tx.objectStore('batch_history').put(entry);
      tx.oncomplete = () => resolve(entry);
      tx.onerror = () => reject(tx.error);
    });

    // Also persist to server disk JSON log
    fetch('/api/history/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    }).catch(() => {});

    return entry;
  } catch (err) {
    console.warn('Failed to save batch to IndexedDB:', err);
    return null;
  }
}

export async function getAllBatchHistory() {
  try {
    const db = await openDB();
    const local = await new Promise((resolve, reject) => {
      const tx = db.transaction('batch_history', 'readonly');
      const req = tx.objectStore('batch_history').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(tx.error);
    });

    // Try server sync
    try {
      const res = await fetch('/api/history?type=folder_batch');
      const serverData = await res.json();
      if (serverData.history?.length) {
        const serverMap = new Map(serverData.history.map((s) => [s.id, s]));
        const merged = local.map((loc) => serverMap.get(loc.id) || loc);
        for (const [id, sItem] of serverMap.entries()) {
          if (!local.some((l) => l.id === id)) merged.push(sItem);
        }
        // Sync updated server items back to local IndexedDB
        try {
          const wtx = db.transaction('batch_history', 'readwrite');
          for (const sItem of serverData.history) wtx.objectStore('batch_history').put(sItem);
        } catch {}
        return merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
    } catch {}

    return local.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch {
    return [];
  }
}

export async function deleteBatchFromHistory(id) {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('batch_history', 'readwrite');
      tx.objectStore('batch_history').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    fetch(`/api/history/${id}`, { method: 'DELETE' }).catch(() => {});
  } catch {}
}
