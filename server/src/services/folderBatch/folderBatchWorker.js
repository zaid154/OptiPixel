import os from 'os';
import { HistoryService } from '../historyService.js';
import {
  folderBatchEvents,
  activeBatches,
  persistFolderBatch
} from './folderBatchState.js';
import { formatDuration } from './folderScanner.js';
import { runDualQueuePipeline } from './folderBatchScheduler.js';

export function updateSpeedAndETA(batch, startTime) {
  const now = Date.now();
  const elapsedMs = Math.max(1, now - startTime);
  const elapsedSec = elapsedMs / 1000;
  
  const total = batch.stats.totalFiles || batch.files?.length || 1;
  const actualProcessed = batch.files && batch.files.length > 0
    ? batch.files.filter((f) => f.status && f.status !== 'pending').length
    : Math.min(total, batch.stats.processed || 0);

  batch.stats.processed = Math.min(total, actualProcessed);
  const processed = batch.stats.processed;

  // Rolling window (last 20s) for responsive, accurate ETA that reflects current speed
  if (!batch._rolling) batch._rolling = [];
  batch._rolling.push({ time: now, processed });
  const cutoff = now - 20000;
  while (batch._rolling.length > 2 && batch._rolling[0].time < cutoff) {
    batch._rolling.shift();
  }

  const oldest = batch._rolling[0];
  const deltaSec = (now - oldest.time) / 1000;
  const deltaItems = processed - oldest.processed;
  const rollingSpeed = deltaSec >= 3 && deltaItems >= 0 ? deltaItems / deltaSec : 0;

  const itemsPerSec = rollingSpeed > 0 ? rollingSpeed : (processed / elapsedSec);
  batch.stats.currentSpeed = `${itemsPerSec.toFixed(1)} items/s`;

  const remainingItems = Math.max(0, total - processed);
  const remainingSec = itemsPerSec > 0 ? Math.ceil(remainingItems / itemsPerSec) : 0;
  batch.stats.remainingSec = remainingSec;
  batch.stats.remainingFormatted = formatDuration(remainingSec);
  batch.stats.elapsedFormatted = formatDuration(Math.floor(elapsedSec));
  batch.stats.percent = total > 0 ? Math.min(100, Math.max(0, parseFloat(((processed / total) * 100).toFixed(1)))) : 0;
  batch.stats.bytesSaved = Math.max(0, batch.stats.originalBytesProcessed - batch.stats.compressedBytesProcessed);
  batch.stats.savedMB = Math.round(batch.stats.bytesSaved / (1024 * 1024));
  batch.stats.savedGB = parseFloat((batch.stats.bytesSaved / (1024 * 1024 * 1024)).toFixed(2));
  batch.stats.savedPercent = batch.stats.originalBytesProcessed > 0
    ? Math.round((batch.stats.bytesSaved / batch.stats.originalBytesProcessed) * 100)
    : 0;
}

export async function runBatchWorker(batchId) {
  const batch = activeBatches.get(batchId);
  if (!batch) return;
  batch._workerRunning = true;

  try {
    const startTime = Date.now();
    let lastEmitTime = 0;

    const numCores = os.cpus().length || 4;
    const cpuWorkers = Math.max(2, Math.min(4, numCores - 1));
    const gpuWorkers = 1;

    const emitThrottled = (force = false) => {
      const now = Date.now();
      if (force || now - lastEmitTime > 150) {
        lastEmitTime = now;
        updateSpeedAndETA(batch, startTime);
        folderBatchEvents.emit('progress', { batchId, ...batch });
        folderBatchEvents.emit(`progress:${batchId}`, { batchId, ...batch });
        persistFolderBatch(batch);
      }
    };

    await runDualQueuePipeline({ batch, emitThrottled, cpuWorkers, gpuWorkers });

    if (!batch.isCancelled) {
      batch.status = 'completed';
      batch.endTime = Date.now();
      batch.stats.percent = 100;
      batch.stats.remainingFormatted = 'Completed';
      batch.stats.remainingSec = 0;
      updateSpeedAndETA(batch, startTime);
      folderBatchEvents.emit('progress', { batchId, ...batch });
      folderBatchEvents.emit(`progress:${batchId}`, { batchId, ...batch });
      persistFolderBatch(batch);

      HistoryService.saveBatchRecord({
        id: batchId,
        sourceDir: batch.sourceDir,
        destDir: batch.destDir,
        startTime: new Date(batch.startTime).toISOString(),
        endTime: new Date().toISOString(),
        durationSeconds: Math.round((Date.now() - batch.startTime) / 1000),
        stats: {
          totalFiles: batch.stats.totalFiles,
          photos: batch.stats.imagesDone,
          videos: batch.stats.videosDone,
          pristine: batch.stats.preservedOptimal,
          failed: batch.stats.failed,
          originalBytes: batch.stats.originalBytesProcessed,
          compressedBytes: batch.stats.compressedBytesProcessed,
          savedPercent: batch.stats.totalFiles > 0 ? Math.round((batch.stats.bytesSaved / (batch.stats.originalBytesProcessed || 1)) * 100) : 0
        },
        files: batch.files
      }).catch(() => {});
    } else if (batch.stats.processed > 0) {
      // Also persist partial progress if user stopped/cancelled midway
      const processedFiles = batch.files.filter((f) => f.status && f.status !== 'pending');
      HistoryService.saveBatchRecord({
        id: batchId,
        sourceDir: batch.sourceDir,
        destDir: batch.destDir,
        startTime: new Date(batch.startTime).toISOString(),
        endTime: new Date().toISOString(),
        durationSeconds: Math.round((Date.now() - batch.startTime) / 1000),
        stats: {
          totalFiles: processedFiles.length,
          photos: batch.stats.imagesDone,
          videos: batch.stats.videosDone,
          pristine: batch.stats.preservedOptimal,
          failed: batch.stats.failed,
          originalBytes: batch.stats.originalBytesProcessed,
          compressedBytes: batch.stats.compressedBytesProcessed,
          savedPercent: batch.stats.originalBytesProcessed > 0 ? Math.round((batch.stats.bytesSaved / batch.stats.originalBytesProcessed) * 100) : 0
        },
        files: processedFiles
      }).catch(() => {});
    }
  } finally {
    batch._workerRunning = false;
  }
}
