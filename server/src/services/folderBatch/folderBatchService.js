import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  folderBatchEvents,
  activeBatches,
  scannedBatches,
  persistFolderBatch
} from './folderBatchState.js';
import {
  browseDirectory,
  scanDirectory,
  formatDuration
} from './folderScanner.js';
import { runBatchWorker, updateSpeedAndETA } from './folderBatchWorker.js';
import { retryFailedBatch, copyOriginalsFallbackBatch } from './folderBatchRetry.js';

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

  static updateSpeedAndETA(batch, startTime) {
    return updateSpeedAndETA(batch, startTime);
  }

  static async startBatch({ scanId, sourceDir, destDir, settings = {} }) {
    if (!destDir) throw new Error('Destination folder path is required');
    const normalizedDest = path.resolve(destDir.trim().replace(/^["']|["']$/g, ''));

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
        processed: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
        preservedOptimal: 0,
        imagesDone: 0,
        videosDone: 0,
        othersDone: 0,
        originalBytesProcessed: 0,
        compressedBytesProcessed: 0,
        bytesSaved: 0,
        percent: 0,
        currentFile: '',
        currentType: '',
        currentSpeed: '0 items/s',
        elapsedFormatted: '00:00',
        remainingFormatted: scanData.stats.estimatedFormatted,
        remainingSec: scanData.stats.estimatedTotalSec
      },
      files: scanData.files.map((f) => ({ ...f, status: 'pending', error: null, outputSize: 0 })),
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
    folderBatchEvents.emit('progress', { batchId, ...batch });
    persistFolderBatch(batch);
    return { status: 'running' };
  }

  static cancelBatch(batchId) {
    const batch = activeBatches.get(batchId);
    if (!batch) throw new Error('Batch not found');
    batch.isCancelled = true;
    batch.isPaused = false;
    batch.status = 'cancelled';
    folderBatchEvents.emit('progress', { batchId, ...batch });
    persistFolderBatch(batch);
    return { status: 'cancelled' };
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
    const all = Array.from(activeBatches.values());
    if (all.length > 0) {
      const latest = all[all.length - 1];
      return this.getPublicState(latest.batchId);
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
