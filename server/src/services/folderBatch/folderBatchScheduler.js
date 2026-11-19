import fs from 'fs';
import path from 'path';
import { processImage } from './folderImageProcessor.js';
import { processVideo, inspectVideoFast } from './folderVideoProcessor.js';
import { processPdf } from './folderPdfProcessor.js';

export function getTargetDestPath(destDir, item, settings = {}) {
  const itemDir = path.dirname(item.relativePath || '');
  const ext = path.extname(item.relativePath || '');
  let base = path.basename(item.relativePath || '', ext);

  let outFilename = base;
  if (item.type === 'image') {
    const outExt = settings.imageFormat === 'webp' ? '.webp' : ext;
    const cleanBase = base.endsWith('_optimized') ? base : `${base}_optimized`;
    outFilename = `${cleanBase}${outExt}`;
  } else if (item.type === 'video') {
    const cleanBase = base.endsWith('_optimized') ? base : `${base}_optimized`;
    outFilename = `${cleanBase}.mp4`;
  } else if (item.type === 'pdf') {
    const cleanBase = base.endsWith('_optimized') ? base : `${base}_optimized`;
    outFilename = `${cleanBase}.pdf`;
  } else {
    outFilename = `${base}${ext}`;
  }

  return path.join(destDir, itemDir, outFilename);
}

export async function processBatchItem(item, batch, destDir, settings, emitThrottled) {
  const targetDestPath = getTargetDestPath(destDir, item, settings);
  const itemSubDir = path.dirname(targetDestPath);
  await fs.promises.mkdir(itemSubDir, { recursive: true }).catch(() => {});

  if (settings.skipExisting && fs.existsSync(targetDestPath)) {
    try {
      const st = await fs.promises.stat(targetDestPath);
      if (st.size > 0) {
        item.status = 'completed';
        item.outputSize = st.size;
        item.originalSize = item.size;
        item.compressedSize = st.size;
        item.bytesSaved = Math.max(0, item.size - st.size);
        item.savedPercent = item.size > 0 ? Math.round(((item.size - st.size) / item.size) * 100) : 0;
        item.folder = path.dirname(item.relativePath);
        batch.stats.succeeded++;
        batch.stats.processed++;
        batch.stats.preservedOptimal++;
        batch.stats.originalBytesProcessed += item.size;
        batch.stats.compressedBytesProcessed += st.size;
        emitThrottled();
        return;
      }
    } catch {}
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
          const vidRes = await processVideo(item.fullPath, targetDestPath, settings, probe);
          outputSize = vidRes.size;
          if (vidRes.action === 'preserved_original') batch.stats.preservedOptimal++;
        }
      }
      batch.stats.videosDone++;
    } else if (item.type === 'pdf') {
      if (settings.optimizePdf !== false) {
        const pdfRes = await processPdf(item.fullPath, targetDestPath, settings);
        outputSize = pdfRes.size;
        if (pdfRes.action === 'preserved_original') batch.stats.preservedOptimal++;
      } else {
        await fs.promises.copyFile(item.fullPath, targetDestPath);
        const st = await fs.promises.stat(targetDestPath);
        outputSize = st.size;
        batch.stats.preservedOptimal++;
      }
      batch.stats.othersDone++;
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
    item.originalSize = item.size;
    item.compressedSize = outputSize;
    item.bytesSaved = Math.max(0, item.size - outputSize);
    item.savedPercent = item.size > 0 ? Math.round(((item.size - outputSize) / item.size) * 100) : 0;
    item.folder = path.dirname(item.relativePath);
    batch.stats.succeeded++;
    batch.stats.processed++;
    batch.stats.originalBytesProcessed += item.size;
    batch.stats.compressedBytesProcessed += outputSize;
  } catch (err) {
    item.status = 'failed';
    item.error = err.message;
    item.originalSize = item.size;
    item.compressedSize = item.size;
    item.bytesSaved = 0;
    item.savedPercent = 0;
    item.folder = path.dirname(item.relativePath);
    batch.stats.failed++;
    batch.stats.processed++;
    batch.failedFiles.push({ ...item, error: err.message });
  }

  emitThrottled();
}

export async function runDualQueuePipeline({ batch, emitThrottled, cpuWorkers = 6, gpuWorkers = 2, onItemProcessed = null }) {
  const { files, destDir, settings } = batch;

  let photoIndex = 0;
  let videoIndex = 0;

  const photoQueue = files.filter((f) => f.type === 'image' || f.type === 'pdf' || (f.type !== 'video' && settings.copyNonMedia));
  const videoQueue = files.filter((f) => f.type === 'video');

  const claimedVideoIndices = new Set();
  const claimNextVideo = () => {
    while (videoIndex < videoQueue.length) {
      const idx = videoIndex++;
      if (!claimedVideoIndices.has(idx)) {
        claimedVideoIndices.add(idx);
        return idx;
      }
    }
    return -1;
  };

  const waitIfPaused = async () => {
    while (batch.isPaused) {
      await new Promise((r) => setTimeout(r, 200));
      if (batch.isCancelled) return true;
    }
    return batch.isCancelled;
  };

  // CPU Photo Workers: Multi-Core AVX2 for images/docs, then Work-Stealing helper for videos
  const cpuWorkerTask = async (isHelper = false) => {
    while (photoIndex < photoQueue.length) {
      if (await waitIfPaused()) return;
      const idx = photoIndex++;
      if (idx >= photoQueue.length) break;
      const item = photoQueue[idx];
      if (item.status === 'completed' || item.status === 'failed') continue;

      batch.stats.currentFile = item.relativePath;
      batch.stats.currentType = item.type;
      emitThrottled();

      await processBatchItem(item, batch, destDir, settings, emitThrottled);
      if (onItemProcessed) onItemProcessed(item);
      // Fast 2ms thermal breather to maintain balanced CPU temperature and max throughput
      await new Promise((r) => setTimeout(r, 2));
    }

    // Work-Stealing: CPU Helper Worker assists with videos once photos are finished!
    if (isHelper) {
      while (true) {
        if (await waitIfPaused()) return;
        const idx = claimNextVideo();
        if (idx === -1 || idx >= videoQueue.length) break;
        const item = videoQueue[idx];
        if (item.status === 'completed' || item.status === 'failed') continue;

        batch.stats.currentFile = item.relativePath;
        batch.stats.currentType = 'video';
        emitThrottled();

        await processBatchItem(item, batch, destDir, settings, emitThrottled);
        if (onItemProcessed) onItemProcessed(item);
        await new Promise((r) => setTimeout(r, 10));
      }
    }
  };

  // Video Workers: Multi-channel GPU Hardware Acceleration (QSV), then auto-assist Photos/Docs
  const videoWorkerTask = async () => {
    while (true) {
      if (await waitIfPaused()) return;
      const idx = claimNextVideo();
      if (idx === -1 || idx >= videoQueue.length) break;
      const item = videoQueue[idx];
      if (item.status === 'completed' || item.status === 'failed') continue;

      batch.stats.currentFile = item.relativePath;
      batch.stats.currentType = 'video';
      emitThrottled();

      await processBatchItem(item, batch, destDir, settings, emitThrottled);
      if (onItemProcessed) onItemProcessed(item);
    }

    // Reverse Work-Stealing: When video queue finishes, GPU worker threads immediately assist with remaining photos/docs!
    while (photoIndex < photoQueue.length) {
      if (await waitIfPaused()) return;
      const idx = photoIndex++;
      if (idx >= photoQueue.length) break;
      const item = photoQueue[idx];
      if (item.status === 'completed' || item.status === 'failed') continue;

      batch.stats.currentFile = item.relativePath;
      batch.stats.currentType = item.type;
      emitThrottled();

      await processBatchItem(item, batch, destDir, settings, emitThrottled);
      if (onItemProcessed) onItemProcessed(item);
      await new Promise((r) => setTimeout(r, 2));
    }
  };

  const videoWorkerTasks = Array.from({ length: Math.max(1, gpuWorkers) }, () => videoWorkerTask());
  const cpuTasks = Array.from({ length: cpuWorkers }, (_, i) => cpuWorkerTask(i === 0));
  await Promise.all([
    ...cpuTasks,
    ...videoWorkerTasks
  ]);
}
