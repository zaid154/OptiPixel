import os from 'os';
import path from 'path';
import { HistoryService } from '../historyService.js';
import { OptimizationLog } from '../../models/OptimizationLog.js';
import { withDbRetry } from '../../utils/dbRetryQueue.js';
import {
  folderBatchEvents,
  activeBatches,
  persistFolderBatch
} from './folderBatchState.js';
import { formatDuration } from './folderScanner.js';
import { runDualQueuePipeline } from './folderBatchScheduler.js';

const formatBytes = (bytes) => {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

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

  // Rolling window (last 30s) for responsive, smoothed speed
  if (!batch._rolling) batch._rolling = [];
  batch._rolling.push({ time: now, processed });
  const cutoff = now - 30000;
  while (batch._rolling.length > 2 && batch._rolling[0].time < cutoff) {
    batch._rolling.shift();
  }

  const oldest = batch._rolling[0];
  const deltaSec = (now - oldest.time) / 1000;
  const deltaItems = processed - oldest.processed;
  const rollingSpeed = deltaSec >= 3 && deltaItems >= 0 ? deltaItems / deltaSec : 0;
  const overallSpeed = elapsedSec > 5 ? (processed / elapsedSec) : 5;

  // Smart Blended Velocity (EMA): 65% Historic Average + 35% Recent Rolling Window
  const rawBlended = rollingSpeed > 0 ? (0.65 * overallSpeed + 0.35 * rollingSpeed) : overallSpeed;
  const clampedSpeed = Math.max(0.5, rawBlended);

  // Smooth through Exponential Moving Average (prevents wild swings when hitting 64MP photos)
  if (!batch._smoothedSpeed) {
    batch._smoothedSpeed = clampedSpeed;
  } else {
    batch._smoothedSpeed = (0.80 * batch._smoothedSpeed) + (0.20 * clampedSpeed);
  }

  batch.stats.currentSpeed = `${batch._smoothedSpeed.toFixed(1)} items/s`;

  const remainingItems = Math.max(0, total - processed);
  const remainingSec = batch._smoothedSpeed > 0 ? Math.ceil(remainingItems / batch._smoothedSpeed) : 0;
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
    const startTime = batch.startTime || Date.now();
    let lastEmitTime = 0;

    const numCores = os.cpus().length || 4;
    // Dynamic Turbo Allocation: Scale workers up to 6 on 8-core CPU for maximum photo throughput
    const cpuWorkers = Math.max(3, Math.min(6, numCores - 1));
    // Dual QuickSync engines on Intel Iris Xe: 2 parallel GPU video workers
    const gpuWorkers = 2;

    const pendingDbDocs = [];
    const savedSourcePaths = new Set();
    let lastDbFlush = Date.now();

    const flushDbBuffer = async (force = false) => {
      if (pendingDbDocs.length === 0) return;
      const now = Date.now();
      if (!force && pendingDbDocs.length < 30 && now - lastDbFlush < 10000) {
        return;
      }
      const toSave = pendingDbDocs.splice(0, pendingDbDocs.length);
      lastDbFlush = now;
      await withDbRetry(
        () => OptimizationLog.insertMany(toSave, { ordered: false }),
        '[DB] FolderBatch live write'
      );
    };

    const onItemProcessed = (item) => {
      const rel = item.relativePath || item.path || '';
      const sourcePath = batch.sourceDir ? path.join(batch.sourceDir, rel) : rel;
      if (savedSourcePaths.has(sourcePath)) return;
      savedSourcePaths.add(sourcePath);

      const orig = item.originalSize ?? item.size ?? 0;
      const comp = item.compressedSize ?? item.outputSize ?? orig;
      const saved = Math.max(0, orig - comp);
      const pct = orig > 0 ? Math.round((saved / orig) * 100) : 0;

      pendingDbDocs.push({
        originalName: path.basename(rel),
        relativePath: rel,
        sourcePath,
        destinationPath: batch.destDir ? path.join(batch.destDir, rel) : '',
        sourceDir: batch.sourceDir || '',
        destinationDir: batch.destDir || '',
        batchId,
        format: (path.extname(rel).replace('.', '') || 'jpg').toLowerCase(),
        module: 'folder_batch',
        status: item.status === 'failed' ? 'failed' : item.status === 'preserved_optimal' ? 'preserved_optimal' : 'optimized',
        originalSize: formatBytes(orig),
        compressedSize: formatBytes(comp),
        bytesSaved: formatBytes(saved),
        percentageSaved: `${pct}%`,
        rawOriginalBytes: orig,
        rawCompressedBytes: comp,
        rawBytesSaved: saved,
        rawPercentSaved: pct,
        timeTaken: '100ms'
      });

      flushDbBuffer(false).catch((err) => console.error('[DB] folderBatchWorker flush failed:', err.message));
    };

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

    await runDualQueuePipeline({ batch, emitThrottled, cpuWorkers, gpuWorkers, onItemProcessed });
    await flushDbBuffer(true);

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
      }).catch((err) => console.error('[DB] folderBatchWorker saveBatchRecord failed:', err.message));
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
      }).catch((err) => console.error('[DB] folderBatchWorker saveBatchRecord failed:', err.message));
    }
  } finally {
    batch._workerRunning = false;
  }
}
