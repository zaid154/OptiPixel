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
        data._workerRunning = false;
        activeBatches.set(data.batchId, data);
        console.log(`[FolderBatch] Restored batch session [${data.batchId}] (${data.status})`);

        // If it was actively running, auto-resume the worker immediately without getting stuck in idle
        if (data.status === 'running') {
          data.isPaused = false;
          import('./folderBatchWorker.js')
            .then(({ runBatchWorker }) => {
              console.log(`[FolderBatch] Auto-resuming worker for batch [${data.batchId}]...`);
              runBatchWorker(data.batchId).catch((err) => console.error('[FolderBatch] Auto-resume error:', err));
            })
            .catch((err) => console.error('[FolderBatch] Worker import error:', err));
        }
      }
    }
  } catch (err) {
    console.warn('Could not load last_folder_batch.json:', err.message);
  }
}

export function persistFolderBatch(batchObj) {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    // Strip process instances / un-serializable handles / worker state
    const { abortController, _workerRunning, ...serializable } = batchObj;
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
