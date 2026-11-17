import fs from 'fs';
import path from 'path';
import EventEmitter from 'events';

export const folderBatchEvents = new EventEmitter();
folderBatchEvents.setMaxListeners(100);

export const scannedBatches = new Map();
export const activeBatches = new Map();

const CACHE_DIR = path.join(process.cwd(), '.optipixel_cache');
const PERSIST_FILE = path.join(CACHE_DIR, 'last_folder_batch.json');

export function loadPersistedFolderBatch() {
  try {
    if (fs.existsSync(PERSIST_FILE)) {
      const raw = fs.readFileSync(PERSIST_FILE, 'utf8');
      const data = JSON.parse(raw);
      if (data && data.batchId && (data.status === 'running' || data.status === 'paused' || data.status === 'completed')) {
        activeBatches.set(data.batchId, data);
        console.log(`Restored folder batch session [${data.batchId}] (${data.status})`);
      }
    }
  } catch (err) {
    console.warn('Could not load last_folder_batch.json:', err.message);
  }
}

export function persistFolderBatch(batchObj) {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    // Strip process instances / un-serializable handles
    const { abortController, ...serializable } = batchObj;
    fs.writeFileSync(PERSIST_FILE, JSON.stringify(serializable, null, 2), 'utf8');
  } catch (err) {
    console.warn('Failed to persist folder batch session:', err.message);
  }
}

export function clearPersistedFolderBatch() {
  try {
    if (fs.existsSync(PERSIST_FILE)) fs.unlinkSync(PERSIST_FILE);
  } catch (e) {}
}

loadPersistedFolderBatch();
