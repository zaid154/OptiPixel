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

  static computeFolderBreakdown(files = [], sourceDir = '') {
    const rootName = (sourceDir || '').split(/[\\/]/).filter(Boolean).pop() || 'Root';
    const folderMap = new Map();
    for (const f of files) {
      let folder = f.folder || path.dirname(f.relativePath || f.path || '');
      if (!folder || folder === '.' || folder === 'Root') folder = `${rootName} (Root)`;
      const orig = f.originalSize ?? f.size ?? 0;
      const comp = f.compressedSize ?? f.outputSize ?? orig;
      const saved = Math.max(0, orig - comp);

      if (!folderMap.has(folder)) {
        folderMap.set(folder, { folder, count: 0, origBytes: 0, compBytes: 0, savedBytes: 0 });
      }
      const st = folderMap.get(folder);
      st.count++;
      st.origBytes += orig;
      st.compBytes += comp;
      st.savedBytes += saved;
    }

    return Array.from(folderMap.values())
      .map((f) => ({
        ...f,
        savedPercent: f.origBytes > 0 ? Math.round((f.savedBytes / f.origBytes) * 100) : 0
      }))
      .sort((a, b) => b.savedBytes - a.savedBytes);
  }

  static async saveBatchRecord(batchData) {
    await this.ensureFile();
    const history = await this.readHistory();
    const id = batchData.id || `batch_${Date.now()}`;
    const rootName = (batchData.sourceDir || '').split(/[\\/]/).filter(Boolean).pop() || 'Root';

    const normalizedFiles = (batchData.files || []).map((f) => {
      const orig = f.originalSize ?? f.size ?? 0;
      const comp = f.compressedSize ?? f.outputSize ?? orig;
      const saved = Math.max(0, orig - comp);
      const pct = orig > 0 ? Math.round((saved / orig) * 100) : 0;
      let rawFolder = f.folder || path.dirname(f.relativePath || f.path || '');
      if (!rawFolder || rawFolder === '.' || rawFolder === 'Root') rawFolder = `${rootName} (Root)`;
      return {
        relativePath: f.relativePath || f.path || '',
        folder: rawFolder,
        status: f.status || (saved > 0 ? 'optimized' : 'preserved_optimal'),
        originalSize: orig,
        compressedSize: comp,
        bytesSaved: saved,
        savedPercent: pct,
        type: f.type || 'media'
      };
    });

    const folderBreakdown = this.computeFolderBreakdown(normalizedFiles, batchData.sourceDir);

    // Write full file audit log for drilldown
    const detailFile = path.join(LOG_DIR, `${id}_files.json`);
    await fs.promises.writeFile(detailFile, JSON.stringify(normalizedFiles, null, 2)).catch(() => {});

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
        totalFiles: batchData.stats?.totalFiles || normalizedFiles.length,
        photos: batchData.stats?.photos || 0,
        videos: batchData.stats?.videos || 0,
        pristine: batchData.stats?.pristine || 0,
        failed: batchData.stats?.failed || 0,
        originalBytes: batchData.stats?.originalBytes || 0,
        compressedBytes: batchData.stats?.compressedBytes || 0,
        savedBytes: (batchData.stats?.originalBytes || 0) - (batchData.stats?.compressedBytes || 0),
        savedPercent: batchData.stats?.savedPercent || 0
      },
      folderBreakdown: folderBreakdown.slice(0, 50),
      files: normalizedFiles.slice(0, 200)
    };

    const existingIndex = history.findIndex((b) => b.id === id);
    if (existingIndex >= 0) history[existingIndex] = record;
    else history.unshift(record);

    await fs.promises.writeFile(HISTORY_FILE, JSON.stringify(history.slice(0, 50), null, 2));

    // MongoDB Persistence
    if (mongoose.connection?.readyState === 1 && normalizedFiles.length > 0) {
      try {
        const formatBytes = (bytes) => {
          if (!bytes || bytes <= 0) return '0 B';
          const k = 1024;
          const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
        };

        const docs = normalizedFiles.map((f) => {
          const orig = f.originalSize ?? f.size ?? 0;
          const comp = f.compressedSize ?? f.outputSize ?? orig;
          const saved = Math.max(0, orig - comp);
          const pct = orig > 0 ? Math.round((saved / orig) * 100) : 0;
          return {
            originalName: path.basename(f.relativePath || ''),
            relativePath: f.relativePath || '',
            format: (path.extname(f.relativePath || '').replace('.', '') || 'jpg').toLowerCase(),
            module: 'folder_batch',
            status: f.status === 'failed' ? 'failed' : f.status === 'preserved_optimal' ? 'preserved_optimal' : 'optimized',
            originalSize: formatBytes(orig),
            compressedSize: formatBytes(comp),
            bytesSaved: formatBytes(saved),
            percentageSaved: `${pct}%`,
            rawOriginalBytes: orig,
            rawCompressedBytes: comp,
            rawBytesSaved: saved,
            rawPercentSaved: pct,
            timeTaken: '100ms'
          };
        });

        for (let i = 0; i < docs.length; i += 500) {
          await OptimizationLog.insertMany(docs.slice(i, i + 500), { ordered: false }).catch(() => {});
        }
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

    const headers = ['Folder', 'RelativePath', 'Status', 'OriginalBytes', 'CompressedBytes', 'SavedBytes', 'SavedPercent'];
    const rows = files.map((f) => [
      `"${f.folder || path.dirname(f.relativePath || '')}"`,
      `"${f.relativePath || f.path || ''}"`,
      f.status || 'optimized',
      f.originalSize || 0,
      f.compressedSize || 0,
      f.bytesSaved || 0,
      f.savedPercent || 0
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  static async deleteRecord(id) {
    const history = await this.readHistory();
    const filtered = history.filter((b) => b.id !== id);
    await fs.promises.writeFile(HISTORY_FILE, JSON.stringify(filtered, null, 2));
    const detailFile = path.join(LOG_DIR, `${id}_files.json`);
    if (fs.existsSync(detailFile)) await fs.promises.unlink(detailFile).catch(() => {});
    return { success: true };
  }
}
