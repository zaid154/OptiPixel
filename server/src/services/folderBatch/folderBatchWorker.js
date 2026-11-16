import fs from 'fs';
import path from 'path';
import os from 'os';
import { HistoryService } from '../historyService.js';
import {
  folderBatchEvents,
  activeBatches,
  persistFolderBatch
} from './folderBatchState.js';
import { formatDuration } from './folderScanner.js';
import { processImage } from './folderImageProcessor.js';
import { processVideo, inspectVideoFast } from './folderVideoProcessor.js';

export function updateSpeedAndETA(batch, startTime) {
  const elapsedMs = Math.max(1, Date.now() - startTime);
  const elapsedSec = elapsedMs / 1000;
  const processed = batch.stats.processed;
  const total = batch.stats.totalFiles;

  const itemsPerSec = processed / elapsedSec;
  batch.stats.currentSpeed = `${itemsPerSec.toFixed(1)} items/s`;

  const remainingItems = Math.max(0, total - processed);
  const remainingSec = itemsPerSec > 0 ? Math.ceil(remainingItems / itemsPerSec) : 0;
  batch.stats.remainingSec = remainingSec;
  batch.stats.remainingFormatted = formatDuration(remainingSec);
  batch.stats.elapsedFormatted = formatDuration(Math.floor(elapsedSec));
  batch.stats.percent = total > 0 ? parseFloat(((processed / total) * 100).toFixed(1)) : 0;
  batch.stats.bytesSaved = Math.max(0, batch.stats.originalBytesProcessed - batch.stats.compressedBytesProcessed);
}

export async function runBatchWorker(batchId) {
  const batch = activeBatches.get(batchId);
  if (!batch) return;

  const { files, destDir, settings } = batch;
  const startTime = Date.now();
  let fileCursor = 0;
  let activeVideoEncodes = 0;
  const MAX_VIDEO_CONCURRENCY = 2;
  let lastEmitTime = 0;
  const CONCURRENCY = Math.max(2, Math.min(6, os.cpus().length || 4));

  const emitThrottled = (force = false) => {
    const now = Date.now();
    if (force || now - lastEmitTime > 150) {
      lastEmitTime = now;
      updateSpeedAndETA(batch, startTime);
      folderBatchEvents.emit('progress', { batchId, ...batch });
      persistFolderBatch(batch);
    }
  };

  const workerTask = async () => {
    while (fileCursor < files.length) {
      if (batch.isCancelled) return;
      while (batch.isPaused) {
        await new Promise((r) => setTimeout(r, 200));
        if (batch.isCancelled) return;
      }

      const idx = fileCursor++;
      if (idx >= files.length) break;
      const item = files[idx];

      batch.stats.currentFile = item.relativePath;
      batch.stats.currentType = item.type;
      emitThrottled();

      const itemSubDir = path.dirname(path.join(destDir, item.relativePath));
      await fs.promises.mkdir(itemSubDir, { recursive: true }).catch(() => {});

      let targetDestPath = path.join(destDir, item.relativePath);
      if (item.type === 'image' && settings.imageFormat === 'webp') {
        const ext = path.extname(item.relativePath);
        targetDestPath = path.join(destDir, `${item.relativePath.slice(0, -ext.length)}.webp`);
      } else if (item.type === 'video') {
        const ext = path.extname(item.relativePath);
        targetDestPath = path.join(destDir, `${item.relativePath.slice(0, -ext.length)}.mp4`);
      }

      try {
        let outputSize = 0;
        if (item.type === 'image') {
          const minKB = settings.minImageSizeKB || 500;
          if (settings.smartQualityGuard && item.size < minKB * 1024) {
            await fs.promises.copyFile(item.fullPath, targetDestPath);
            const st = await fs.promises.stat(targetDestPath);
            outputSize = st.size;
            batch.stats.preservedOptimal++;
          } else {
            const res = await processImage(item.fullPath, targetDestPath, settings);
            outputSize = res.size;
            if (res.action === 'preserved_original') batch.stats.preservedOptimal++;
          }
          batch.stats.imagesDone++;
        } else if (item.type === 'video') {
          if (settings.videoMode === 'copy_all') {
            await fs.promises.copyFile(item.fullPath, targetDestPath);
            const st = await fs.promises.stat(targetDestPath);
            outputSize = st.size;
            batch.stats.preservedOptimal++;
          } else {
            let probe = await inspectVideoFast(item.fullPath);
            if (settings.videoMode === 'smart' && probe?.canSmartCopy) {
              await fs.promises.copyFile(item.fullPath, targetDestPath);
              const st = await fs.promises.stat(targetDestPath);
              outputSize = st.size;
              batch.stats.preservedOptimal++;
            } else {
              while (activeVideoEncodes >= MAX_VIDEO_CONCURRENCY) {
                await new Promise((r) => setTimeout(r, 100));
                if (batch.isCancelled) return;
              }
              activeVideoEncodes++;
              try {
                const vidRes = await processVideo(item.fullPath, targetDestPath, settings, probe);
                outputSize = vidRes.size;
                if (vidRes.action === 'preserved_original') batch.stats.preservedOptimal++;
              } finally {
                activeVideoEncodes--;
              }
            }
          }
          batch.stats.videosDone++;
        } else {
          if (settings.copyNonMedia) {
            await fs.promises.copyFile(item.fullPath, targetDestPath);
            const st = await fs.promises.stat(targetDestPath);
            outputSize = st.size;
          }
          batch.stats.othersDone++;
        }

        item.status = 'completed';
        item.outputSize = outputSize;
        batch.stats.succeeded++;
        batch.stats.processed++;
        batch.stats.originalBytesProcessed += item.size;
        batch.stats.compressedBytesProcessed += outputSize;
      } catch (err) {
        item.status = 'failed';
        item.error = err.message;
        batch.stats.failed++;
        batch.stats.processed++;
        batch.failedFiles.push({ ...item, error: err.message });
      }
      emitThrottled();
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, () => workerTask()));

  if (!batch.isCancelled) {
    batch.status = 'completed';
    batch.endTime = Date.now();
    batch.stats.percent = 100;
    batch.stats.remainingFormatted = 'Completed';
    batch.stats.remainingSec = 0;
    updateSpeedAndETA(batch, startTime);
    folderBatchEvents.emit('progress', { batchId, ...batch });
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
      files: batch.files.slice(0, 500)
    }).catch(() => {});
  }
}
