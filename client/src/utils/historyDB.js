// IndexedDB persistent storage for OptiPixel session history
const DB_NAME = 'OptiPixelDB';
const DB_VERSION = 3;
const STORE_NAME = 'media_history';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function saveToHistory(item) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const entry = {
        id: item.id || `item_${Date.now()}`,
        name: item.name,
        type: item.type || 'image', // 'image' | 'video'
        originalSize: item.originalSize,
        compressedSize: item.compressedSize,
        percentageSaved: item.percentageSaved,
        format: item.format,
        timestamp: Date.now(),
        originalBlob: item.originalBlob || null,
        compressedBlob: item.compressedBlob || null,
        settings: item.settings || {}
      };

      store.put(entry);

      tx.oncomplete = () => {
        try {
          sessionStorage.setItem('optipixel_active_id', entry.id);
        } catch (e) {}
        resolve(entry);
      };

      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB save failed:', err);
    return null;
  }
}

export async function getAllHistory() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result || [];
        items.sort((a, b) => b.timestamp - a.timestamp);
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB get failed:', err);
    return [];
  }
}

export async function getHistoryItem(id) {
  if (!id) return null;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    return null;
  }
}

export async function deleteHistoryItem(id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    return false;
  }
}

export async function clearAllHistory() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => {
        try { sessionStorage.removeItem('optipixel_active_id'); } catch (e) {}
        resolve(true);
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    return false;
  }
}

export function getActiveSessionId() {
  try {
    return sessionStorage.getItem('optipixel_active_id');
  } catch (e) {
    return null;
  }
}

export function setActiveSessionId(id) {
  try {
    if (id) {
      sessionStorage.setItem('optipixel_active_id', id);
    } else {
      sessionStorage.removeItem('optipixel_active_id');
    }
  } catch (e) {}
}
