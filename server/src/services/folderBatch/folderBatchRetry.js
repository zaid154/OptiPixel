import fs from 'fs';
import path from 'path';
import {
  folderBatchEvents,
  activeBatches,
  persistFolderBatch
} from './folderBatchState.js';
import { processImage } from './folderImageProcessor.js';
import { processVideo } from './folderVideoProcessor.js';
import { getTargetDestPath } from './folderBatchScheduler.js';

export async function retryFailedBatch(batchId) {
  const batch = activeBatches.get(batchId);
  if (!batch) throw new Error('Batch not found');
  if (batch.failedFiles.length === 0) return { message: 'No failed files to retry', retriedCount: 0 };

  const toRetry = [...batch.failedFiles];
  batch.failedFiles = [];
  batch.status = 'running';
  batch.isPaused = false;
  batch.isCancelled = false;

  (async () => {
    for (const item of toRetry) {
      batch.stats.currentFile = `(Retrying) ${item.relativePath}`;
      folderBatchEvents.emit('progress', { batchId, ...batch });

      const targetDest = getTargetDestPath(batch.destDir, item, batch.settings);
      const targetSubDir = path.dirname(targetDest);
      await fs.promises.mkdir(targetSubDir, { recursive: true }).catch(() => {});

      try {
        let outputSize = 0;
        if (item.type === 'image') {
          const res = await processImage(item.fullPath, targetDest, batch.settings);
          outputSize = res.size;
          batch.stats.imagesDone++;
        } else if (item.type === 'video') {
          const vidRes = await processVideo(item.fullPath, targetDest, batch.settings);
          outputSize = vidRes.size;
          batch.stats.videosDone++;
        } else {
          await fs.promises.copyFile(item.fullPath, targetDest);
          const st = await fs.promises.stat(targetDest);
          outputSize = st.size;
          batch.stats.othersDone++;
        }

        batch.stats.succeeded++;
        batch.stats.failed = Math.max(0, batch.stats.failed - 1);
        batch.stats.originalBytesProcessed += item.size;
        batch.stats.compressedBytesProcessed += outputSize;
      } catch (err) {
        batch.failedFiles.push({ ...item, error: err.message });
      }
      batch.failedFilesCount = batch.failedFiles.length;
      batch.stats.failed = batch.failedFiles.length;
      folderBatchEvents.emit('progress', { batchId, ...batch });
    }
    batch.status = 'completed';
    batch.failedFilesCount = batch.failedFiles.length;
    batch.stats.failed = batch.failedFiles.length;
    folderBatchEvents.emit('progress', { batchId, ...batch });
    persistFolderBatch(batch);
  })();

  return { message: `Retrying ${toRetry.length} failed files...`, retriedCount: toRetry.length };
}

export async function copyOriginalsFallbackBatch(batchId) {
  const batch = activeBatches.get(batchId);
  if (!batch) throw new Error('Batch not found');
  if (!batch.failedFiles || batch.failedFiles.length === 0) {
    return { message: 'No failed files to copy', copiedCount: 0 };
  }

  const failedToCopy = [...batch.failedFiles];
  batch.failedFiles = [];
  let copiedCount = 0;

  for (const item of failedToCopy) {
    try {
      const targetDest = getTargetDestPath(batch.destDir, item, batch.settings);
      const subDir = path.dirname(targetDest);
      await fs.promises.mkdir(subDir, { recursive: true }).catch(() => {});
      await fs.promises.copyFile(item.fullPath, targetDest);
      const st = await fs.promises.stat(targetDest);

      batch.stats.succeeded++;
      batch.stats.failed = Math.max(0, batch.stats.failed - 1);
      batch.stats.originalBytesProcessed += item.size;
      batch.stats.compressedBytesProcessed += st.size;
      copiedCount++;
    } catch (err) {
      batch.failedFiles.push({ ...item, error: `Copy failed: ${err.message}` });
    }
  }

  batch.failedFilesCount = batch.failedFiles.length;
  batch.stats.failed = batch.failedFiles.length;
  folderBatchEvents.emit('progress', { batchId, ...batch });
  persistFolderBatch(batch);

  return {
    success: true,
    copiedCount,
    remainingFailed: batch.failedFiles.length,
    message: `Copied ${copiedCount} files to destination folder.`
  };
}
