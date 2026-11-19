import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  folderBatchEvents,
  activeBatches,
  scannedBatches,
  persistFolderBatch,
  clearPersistedFolderBatch
} from './folderBatchState.js';
import {
  browseDirectory,
  scanDirectory,
  formatDuration,
  checkDestinationPath
} from './folderScanner.js';
import { runBatchWorker, updateSpeedAndETA } from './folderBatchWorker.js';
import { retryFailedBatch, copyOriginalsFallbackBatch } from './folderBatchRetry.js';
import { getTargetDestPath } from './folderBatchScheduler.js';

export { folderBatchEvents };

export class FolderBatchService {
  static browseDirectory(targetPath) {
    return browseDirectory(targetPath);
  }

  static scanDirectory(folderPath) {
    return scanDirectory(folderPath);
  }

  static formatDuration(sec) {
    return formatDuration(sec);
  }

  static checkDestination(destPath) {
    return checkDestinationPath(destPath);
  }

  static updateSpeedAndETA(batch, startTime) {
    return updateSpeedAndETA(batch, startTime);
  }

  static async startBatch({ scanId, sourceDir, destDir, settings = {} }) {
    if (!destDir) throw new Error('Destination folder path is required');
    const normalizedDest = path.resolve(destDir.trim().replace(/^["']|["']$/g, ''));

    // Guard against starting duplicate concurrent batches
    const existing = this.getActiveOrRecentBatch();
    if (existing && (existing.status === 'running' || existing.status === 'paused')) {
      console.log(`[FolderBatch] Active batch [${existing.batchId}] is already active (${existing.status}). Returning existing batch.`);
      return {
        batchId: existing.batchId,
        status: existing.status,
        totalFiles: existing.stats?.totalFiles,
        sourceDir: existing.sourceDir,
        destDir: existing.destDir,
        isExisting: true
      };
    }

    let scanData = scanId ? scannedBatches.get(scanId) : null;
    const cleanSrc = sourceDir ? sourceDir.trim().replace(/^["']|["']$/g, '') : null;
    let normalizedSource = cleanSrc ? path.resolve(cleanSrc) : (scanData?.rootPath || null);

    if (!normalizedSource) throw new Error('Valid source directory is required');
    if (normalizedSource.toLowerCase() === normalizedDest.toLowerCase()) {
      throw new Error('Destination cannot be identical to Source directory.');
    }
    if (normalizedDest.toLowerCase().startsWith(normalizedSource.toLowerCase() + path.sep)) {
      throw new Error('Destination cannot be inside Source directory.');
    }

    if (!scanData || scanData.rootPath.toLowerCase() !== normalizedSource.toLowerCase()) {
      scanData = await scanDirectory(normalizedSource);
    }

    await fs.promises.mkdir(normalizedDest, { recursive: true });
    const batchId = crypto.randomUUID();

    const activeSettings = {
      imageFormat: settings.imageFormat || 'original',
      imageQuality: parseInt(settings.imageQuality || 96, 10),
      preserveExif: settings.preserveExif !== false,
      videoPreset: settings.videoPreset || 'balanced',
      videoCrf: parseInt(settings.videoCrf || 23, 10),
      videoMode: settings.videoMode || 'smart',
      copyNonMedia: settings.copyNonMedia !== false,
      skipExisting: settings.skipExisting !== false,
      smartQualityGuard: settings.smartQualityGuard !== false,
      minImageSizeKB: parseInt(settings.minImageSizeKB ?? 500, 10),
      minVideoSizeMB: parseInt(settings.minVideoSizeMB ?? 15, 10),
      minSavingsPercent: parseInt(settings.minSavingsPercent ?? 12, 10)
    };

    // Pre-scan for already completed files when skipExisting is active (Smart Resume)
    let preCompletedCount = 0;
    let prePreservedCount = 0;
    let preOrigBytes = 0;
    let preCompBytes = 0;
    let preImagesDone = 0;
    let preVideosDone = 0;
    let preOthersDone = 0;

    const mappedFiles = scanData.files.map((f) => {
      if (activeSettings.skipExisting) {
        const targetDest = getTargetDestPath(normalizedDest, f, activeSettings);
        try {
          if (fs.existsSync(targetDest)) {
            const st = fs.statSync(targetDest);
            if (st.size > 0) {
              preCompletedCount++;
              prePreservedCount++;
              preOrigBytes += f.size;
              preCompBytes += st.size;
              if (f.type === 'image') preImagesDone++;
              else if (f.type === 'video') preVideosDone++;
              else preOthersDone++;

              return {
                ...f,
                status: 'completed',
                outputSize: st.size,
                originalSize: f.size,
                compressedSize: st.size,
                bytesSaved: Math.max(0, f.size - st.size),
                savedPercent: f.size > 0 ? Math.round(((f.size - st.size) / f.size) * 100) : 0,
                folder: path.dirname(f.relativePath),
                error: null
              };
            }
          }
        } catch {}
      }
      return { ...f, status: 'pending', error: null, outputSize: 0 };
    });

    const batchState = {
      batchId,
      sourceDir: normalizedSource,
      destDir: normalizedDest,
      settings: activeSettings,
      status: 'running',
      startTime: Date.now(),
      endTime: null,
      stats: {
        totalFiles: scanData.files.length,
        totalImages: scanData.stats?.images?.count || 0,
        totalVideos: scanData.stats?.videos?.count || 0,
        totalPdfs: scanData.stats?.pdfs?.count || 0,
        totalOthers: (scanData.stats?.others?.count || 0) + (scanData.stats?.pdfs?.count || 0),
        processed: preCompletedCount,
        succeeded: preCompletedCount,
        failed: 0,
        skipped: 0,
        preservedOptimal: prePreservedCount,
        imagesDone: preImagesDone,
        videosDone: preVideosDone,
        othersDone: preOthersDone,
        originalBytesProcessed: preOrigBytes,
        compressedBytesProcessed: preCompBytes,
        bytesSaved: Math.max(0, preOrigBytes - preCompBytes),
        percent: scanData.files.length > 0
          ? Math.min(100, parseFloat(((preCompletedCount / scanData.files.length) * 100).toFixed(1)))
          : 0,
        currentFile: '',
        currentType: '',
        currentSpeed: '0 items/s',
        elapsedFormatted: '00:00',
        remainingFormatted: scanData.stats.estimatedFormatted,
        remainingSec: scanData.stats.estimatedTotalSec
      },
      files: mappedFiles,
      failedFiles: [],
      isPaused: false,
      isCancelled: false
    };

    activeBatches.set(batchId, batchState);
    persistFolderBatch(batchState);

    runBatchWorker(batchId).catch((err) => {
      console.error(`Batch worker error [${batchId}]:`, err);
    });

    return {
      batchId,
      status: 'running',
      totalFiles: batchState.stats.totalFiles,
      sourceDir: normalizedSource,
      destDir: normalizedDest
    };
  }

  static pauseBatch(batchId) {
    const batch = activeBatches.get(batchId);
    if (!batch) throw new Error('Batch not found');
    batch.isPaused = true;
    batch.status = 'paused';
    folderBatchEvents.emit('progress', { batchId, ...batch });
    persistFolderBatch(batch);
    return { status: 'paused' };
  }

  static resumeBatch(batchId) {
    const batch = activeBatches.get(batchId);
    if (!batch) throw new Error('Batch not found');
    batch.isPaused = false;
    batch.status = 'running';
    persistFolderBatch(batch);
    folderBatchEvents.emit('progress', { batchId, ...batch });
    folderBatchEvents.emit(`progress:${batchId}`, { batchId, ...batch });

    if (!batch._workerRunning) {
      runBatchWorker(batchId).catch((err) => console.error('Resume error:', err));
    }
    return { status: 'running' };
  }

  static cancelBatch(batchId) {
    const batch = activeBatches.get(batchId);
    if (batch) {
      batch.isCancelled = true;
      batch.isPaused = false;
      batch.status = 'cancelled';
      folderBatchEvents.emit('progress', { batchId, ...batch });
      activeBatches.delete(batchId);
    }
    clearPersistedFolderBatch();
    return { status: 'cancelled' };
  }

  static clearBatch(batchId) {
    if (batchId) {
      const batch = activeBatches.get(batchId);
      if (batch) {
        batch.isCancelled = true;
        batch.status = 'cancelled';
        activeBatches.delete(batchId);
      }
    } else {
      for (const batch of activeBatches.values()) {
        batch.isCancelled = true;
        batch.status = 'cancelled';
      }
      activeBatches.clear();
    }
    clearPersistedFolderBatch();
    return { status: 'cleared' };
  }

  static retryFailed(batchId) {
    return retryFailedBatch(batchId);
  }

  static copyOriginalsFallback(batchId) {
    return copyOriginalsFallbackBatch(batchId);
  }

  static getActiveOrRecentBatch() {
    for (const [, batch] of activeBatches.entries()) {
      if (batch.status === 'running' || batch.status === 'paused') {
        return this.getPublicState(batch.batchId);
      }
    }
    return null;
  }

  static getPublicState(batchId) {
    const batch = activeBatches.get(batchId);
    if (!batch) return null;
    return {
      batchId: batch.batchId,
      status: batch.status,
      stats: batch.stats,
      settings: batch.settings,
      sourceDir: batch.sourceDir,
      destDir: batch.destDir,
      failedFilesCount: batch.failedFiles.length,
      isPaused: batch.isPaused,
      isCancelled: batch.isCancelled
    };
  }
}
