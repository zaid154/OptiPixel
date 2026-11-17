import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import trash from 'trash';
import DeletionLog from '../../models/DeletionLog.js';
import { OptimizationLog } from '../../models/OptimizationLog.js';
import { withDbRetry } from '../../utils/dbRetryQueue.js';

const inMemoryLogs = [];

async function safeMoveFile(src, dest) {
  try { await fs.promises.rename(src, dest); }
  catch (e) {
    if (e.code === 'EXDEV') {
      await fs.promises.copyFile(src, dest);
      await fs.promises.unlink(src);
    } else throw e;
  }
}

export class SafeActionService {
  static generateBatchId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  static async logAction(entry) {
    try {
      const delLog = await withDbRetry(() => DeletionLog.create(entry), '[DB] safeActionService DeletionLog');
      // Also sync clean log to OptimizationLog for unified DB tracking
      await withDbRetry(() => OptimizationLog.create({
        originalName: path.basename(entry.originalPath),
        relativePath: entry.originalPath,
        format: path.extname(entry.originalPath).slice(1) || 'file',
        module: 'duplicate_cleaner',
        status: 'cleaned',
        originalSize: entry.fileSize || 0,
        compressedSize: 0,
        bytesSaved: entry.fileSize || 0,
        percentageSaved: 100,
        timeTakenMs: 10
      }), '[DB] safeActionService OptimizationLog');
      if (delLog) return delLog;
    } catch (err) {
      console.error('[DB] safeActionService save failed:', err.message);
    }
    const fallback = { ...entry, _id: Date.now().toString(), deletedAt: new Date(), restored: false };
    inMemoryLogs.unshift(fallback);
    return fallback;
  }

  static async quarantineFiles(fileList, rootDir) {
    const batchId = this.generateBatchId();
    const results = [];
    const quarantineBase = path.join(rootDir || process.cwd(), '_Duplicates_Quarantine');

    for (const item of fileList) {
      const srcPath = typeof item === 'string' ? item : item.filePath;
      try {
        const stat = await fs.promises.stat(srcPath);
        const rel = rootDir ? path.relative(rootDir, srcPath) : path.basename(srcPath);
        const destPath = path.join(quarantineBase, rel);

        await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
        await safeMoveFile(srcPath, destPath);

        const log = await this.logAction({
          batchId,
          originalPath: srcPath,
          quarantinePath: destPath,
          actionType: 'quarantine',
          fileSize: stat.size
        });
        results.push({ path: srcPath, success: true, id: log._id });
      } catch (err) {
        results.push({ path: srcPath, success: false, error: err.message });
      }
    }
    return { batchId, results };
  }

  static async moveToTrash(fileList) {
    const batchId = this.generateBatchId();
    const results = [];

    for (const item of fileList) {
      const srcPath = typeof item === 'string' ? item : item.filePath;
      try {
        const stat = await fs.promises.stat(srcPath);
        await trash(srcPath);
        await this.logAction({
          batchId,
          originalPath: srcPath,
          actionType: 'trash',
          fileSize: stat.size
        });
        results.push({ path: srcPath, success: true });
      } catch (err) {
        results.push({ path: srcPath, success: false, error: err.message });
      }
    }
    return { batchId, results };
  }

  static async permanentDelete(fileList) {
    const batchId = this.generateBatchId();
    const results = [];

    for (const item of fileList) {
      const srcPath = typeof item === 'string' ? item : item.filePath;
      try {
        const stat = await fs.promises.stat(srcPath);
        await fs.promises.unlink(srcPath);
        await this.logAction({
          batchId,
          originalPath: srcPath,
          actionType: 'permanent',
          fileSize: stat.size
        });
        results.push({ path: srcPath, success: true });
      } catch (err) {
        results.push({ path: srcPath, success: false, error: err.message });
      }
    }
    return { batchId, results };
  }

  static async restoreBatch(batchId) {
    let logs = [];
    if (mongoose.connection?.readyState === 1) {
      try {
        logs = await DeletionLog.find({ batchId, actionType: 'quarantine', restored: false });
      } catch {}
    }
    if (logs.length === 0) {
      logs = inMemoryLogs.filter((l) => l.batchId === batchId && l.actionType === 'quarantine' && !l.restored);
    }

    const restored = [];
    for (const entry of logs) {
      try {
        if (entry.quarantinePath && fs.existsSync(entry.quarantinePath)) {
          await fs.promises.mkdir(path.dirname(entry.originalPath), { recursive: true });
          await safeMoveFile(entry.quarantinePath, entry.originalPath);
          entry.restored = true;
          entry.restoredAt = new Date();
          if (typeof entry.save === 'function') await entry.save();
          restored.push({ path: entry.originalPath, success: true });
        }
      } catch (err) {
        restored.push({ path: entry.originalPath, success: false, error: err.message });
      }
    }
    return { batchId, count: restored.filter((r) => r.success).length, results: restored };
  }

  static async getHistory(limit = 20) {
    if (mongoose.connection?.readyState === 1) {
      try {
        return await DeletionLog.find().sort({ deletedAt: -1 }).limit(limit).lean();
      } catch {}
    }
    return inMemoryLogs.slice(0, limit);
  }
}
