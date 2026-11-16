import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { OptimizationLog } from '../models/OptimizationLog.js';

const LOG_DIR = path.join(process.cwd(), 'logs');
const HISTORY_FILE = path.join(LOG_DIR, 'session_history.json');

export class HistoryService {
  static async ensureFile() {
    await fs.promises.mkdir(LOG_DIR, { recursive: true });
    if (!fs.existsSync(HISTORY_FILE)) {
      await fs.promises.writeFile(HISTORY_FILE, JSON.stringify([], null, 2));
    }
  }

  static async readHistory() {
    await this.ensureFile();
    try {
      const data = await fs.promises.readFile(HISTORY_FILE, 'utf-8');
      return JSON.parse(data) || [];
    } catch {
      return [];
    }
  }

  static async saveBatchRecord(batchData) {
    await this.ensureFile();
    const history = await this.readHistory();
    const id = batchData.id || `batch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const record = {
      id,
      type: 'folder_batch',
      createdAt: new Date().toISOString(),
      sourceDir: batchData.sourceDir || '',
      destDir: batchData.destDir || '',
      startTime: batchData.startTime || new Date().toISOString(),
      endTime: batchData.endTime || new Date().toISOString(),
      durationSeconds: batchData.durationSeconds || 0,
      pauseLog: batchData.pauseLog || [],
      stats: {
        totalFiles: batchData.stats?.totalFiles || 0,
        photos: batchData.stats?.photos || 0,
        videos: batchData.stats?.videos || 0,
        pristine: batchData.stats?.pristine || 0,
        failed: batchData.stats?.failed || 0,
        originalBytes: batchData.stats?.originalBytes || 0,
        compressedBytes: batchData.stats?.compressedBytes || 0,
        savedBytes: (batchData.stats?.originalBytes || 0) - (batchData.stats?.compressedBytes || 0),
        savedPercent: batchData.stats?.savedPercent || 0
      },
      files: (batchData.files || []).slice(0, 1000)
    };

    history.unshift(record);
    await fs.promises.writeFile(HISTORY_FILE, JSON.stringify(history.slice(0, 50), null, 2));

    if (mongoose.connection?.readyState === 1 && batchData.files?.length) {
      try {
        const docs = batchData.files.slice(0, 500).map((f) => ({
          originalName: path.basename(f.path || f.relativePath || 'media'),
          relativePath: f.relativePath || f.path || '',
          format: path.extname(f.path || f.relativePath || '').slice(1) || 'webp',
          module: 'folder_batch',
          status: f.status || 'optimized',
          originalSize: f.originalSize || 0,
          compressedSize: f.compressedSize || 0,
          bytesSaved: Math.max(0, (f.originalSize || 0) - (f.compressedSize || 0)),
          percentageSaved: f.savedPercent || 0,
          timeTakenMs: 100
        }));
        await OptimizationLog.insertMany(docs, { ordered: false }).catch(() => {});
      } catch {}
    }

    return record;
  }

  static async getHistory(type = null) {
    const list = await this.readHistory();
    if (!type || type === 'all') return list;
    return list.filter((item) => item.type === type);
  }

  static async getBatchFiles(batchId) {
    const detailFile = path.join(LOG_DIR, `${batchId}_files.json`);
    if (fs.existsSync(detailFile)) {
      try {
        const data = await fs.promises.readFile(detailFile, 'utf-8');
        return JSON.parse(data) || [];
      } catch {}
    }
    const list = await this.readHistory();
    const batch = list.find((b) => b.id === batchId);
    return batch?.files || [];
  }

  static async generateCsvReport(batchId) {
    const list = await this.readHistory();
    const batch = list.find((b) => b.id === batchId);
    if (!batch) throw new Error('Batch not found');
    const files = await this.getBatchFiles(batchId);

    const headers = ['RelativePath', 'Status', 'OriginalBytes', 'CompressedBytes', 'SavedPercent', 'SpeedMs'];
    const rows = files.map((f) => [
      `"${f.relativePath || f.path || ''}"`,
      f.status || 'optimized',
      f.originalSize || 0,
      f.compressedSize || 0,
      f.savedPercent || 0,
      f.timeMs || 0
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  static async deleteRecord(id) {
    const history = await this.readHistory();
    const filtered = history.filter((b) => b.id !== id);
    await fs.promises.writeFile(HISTORY_FILE, JSON.stringify(filtered, null, 2));
    return { success: true };
  }
}
