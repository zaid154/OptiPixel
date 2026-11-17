import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMP_DIR = path.join(__dirname, '../../temp');
const REGISTRY_FILE = path.join(TEMP_DIR, 'jobs_registry.json');
const OUTPUTS_DIR = path.join(TEMP_DIR, 'outputs');
const UPLOADS_DIR = path.join(TEMP_DIR, 'uploads');

const memoryJobs = new Map();

function saveToDisk() {
  try {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    const serializable = {};
    for (const [id, job] of memoryJobs.entries()) {
      const { activeProcess, ...cleanJob } = job;
      serializable[id] = cleanJob;
    }
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(serializable, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to sync jobs_registry.json to disk:', err.message);
  }
}

function loadFromDisk() {
  try {
    if (fs.existsSync(REGISTRY_FILE)) {
      const content = fs.readFileSync(REGISTRY_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      for (const [id, job] of Object.entries(parsed)) {
        memoryJobs.set(id, { ...job, activeProcess: null });
      }
      console.log(`Restored ${memoryJobs.size} video job(s) from persistent registry.`);
    }
  } catch (err) {
    console.warn('Could not load jobs_registry.json:', err.message);
  }
}

loadFromDisk();

export const JobStore = {
  get(jobId) {
    if (!jobId) return null;

    let job = memoryJobs.get(jobId);
    if (job) return job;

    const thumbFile = path.join(OUTPUTS_DIR, `thumb_${jobId}.jpg`);
    const compFile = path.join(OUTPUTS_DIR, `optipixel_${jobId}.mp4`);

    if (fs.existsSync(thumbFile) || fs.existsSync(compFile)) {
      console.log(`Auto-recovering job [${jobId}] from disk files...`);
      let recoveredInputPath = null;
      if (fs.existsSync(UPLOADS_DIR)) {
        const uploads = fs.readdirSync(UPLOADS_DIR).filter((f) => /\.(mp4|mkv|mov|webm)$/i.test(f));
        if (uploads.length > 0) {
          uploads.sort((a, b) => fs.statSync(path.join(UPLOADS_DIR, b)).mtimeMs - fs.statSync(path.join(UPLOADS_DIR, a)).mtimeMs);
          recoveredInputPath = path.join(UPLOADS_DIR, uploads[0]);
        }
      }

      const recoveredJob = {
        id: jobId,
        status: fs.existsSync(compFile) ? 'completed' : 'ready',
        progress: fs.existsSync(compFile) ? 100 : 0,
        fps: 0,
        speed: '1x',
        timeRemainingSec: 0,
        originalName: 'video.mp4',
        inputPath: recoveredInputPath,
        outputPath: fs.existsSync(compFile) ? compFile : null,
        thumbnailPath: fs.existsSync(thumbFile) ? thumbFile : null,
        metadata: {
          sizeMB: 0,
          duration: 0,
          width: 1920,
          height: 1080,
          fps: 30,
          codec: 'unknown'
        },
        result: fs.existsSync(compFile) ? {
          originalSize: 0,
          compressedSize: fs.statSync(compFile).size,
          compressedSizeMB: parseFloat((fs.statSync(compFile).size / (1024 * 1024)).toFixed(2)),
          percentageSaved: 50,
          outputPath: compFile
        } : null,
        error: null,
        createdAt: Date.now(),
        activeProcess: null
      };

      memoryJobs.set(jobId, recoveredJob);
      saveToDisk();
      return recoveredJob;
    }

    return null;
  },

  set(jobId, jobData) {
    if (!jobId) return;
    memoryJobs.set(jobId, jobData);
    saveToDisk();
  },

  update(jobId, updates = {}) {
    const existing = this.get(jobId);
    if (!existing) return null;

    const merged = { ...existing, ...updates };
    memoryJobs.set(jobId, merged);
    saveToDisk();
    return merged;
  },

  delete(jobId) {
    memoryJobs.delete(jobId);
    saveToDisk();
  },

  has(jobId) {
    return memoryJobs.has(jobId) || !!this.get(jobId);
  },

  getAll() {
    return Array.from(memoryJobs.values());
  }
};
