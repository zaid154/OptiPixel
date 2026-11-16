import fs from 'fs';
import path from 'path';
import { processImage } from './folderImageProcessor.js';
import { processVideo, inspectVideoFast } from './folderVideoProcessor.js';

export async function processBatchItem(item, batch, destDir, settings, emitThrottled) {
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

  if (settings.skipExisting && fs.existsSync(targetDestPath)) {
    try {
      const st = await fs.promises.stat(targetDestPath);
      if (st.size > 0) {
        item.status = 'completed';
        item.outputSize = st.size;
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

export async function runDualQueuePipeline({ batch, emitThrottled, cpuWorkers = 4, gpuWorkers = 1 }) {
  const { files, destDir, settings } = batch;

  let photoIndex = 0;
  let videoIndex = 0;

  const photoQueue = files.filter((f) => f.type === 'image' || (f.type !== 'video' && settings.copyNonMedia));
  const videoQueue = files.filter((f) => f.type === 'video');

  const waitIfPaused = async () => {
    while (batch.isPaused) {
      await new Promise((r) => setTimeout(r, 200));
      if (batch.isCancelled) return true;
    }
    return batch.isCancelled;
  };

  // CPU Photo Workers (Multi-Core AVX2)
  const cpuWorkerTask = async () => {
    while (photoIndex < photoQueue.length) {
      if (await waitIfPaused()) return;
      const idx = photoIndex++;
      if (idx >= photoQueue.length) break;
      const item = photoQueue[idx];
      if (item.status === 'completed') continue;

      batch.stats.currentFile = item.relativePath;
      batch.stats.currentType = item.type;
      emitThrottled();

      await processBatchItem(item, batch, destDir, settings, emitThrottled);
      // Gentle 10ms thermal breather to keep CPU and NVMe around 80-85%
      await new Promise((r) => setTimeout(r, 10));
    }

    // Work-Stealing: When photos finish, CPU helps probe & smart-copy remaining videos!
    while (videoIndex < videoQueue.length) {
      if (await waitIfPaused()) return;
      const idx = videoIndex++;
      if (idx >= videoQueue.length) break;
      const item = videoQueue[idx];
      if (item.status === 'completed') continue;

      batch.stats.currentFile = item.relativePath;
      batch.stats.currentType = item.type;
      emitThrottled();

      // CPU tries fast smart-probe copy first
      let probe = await inspectVideoFast(item.fullPath).catch(() => null);
      if (probe?.canSmartCopy || settings.videoMode === 'copy_all') {
        const ext = path.extname(item.relativePath);
        const targetDestPath = path.join(destDir, `${item.relativePath.slice(0, -ext.length)}.mp4`);
        await fs.promises.copyFile(item.fullPath, targetDestPath).catch(() => {});
        item.status = 'completed';
        batch.stats.succeeded++;
        batch.stats.processed++;
        batch.stats.preservedOptimal++;
        batch.stats.videosDone++;
        emitThrottled();
      } else {
        // Leave heavy video for GPU worker
        await processBatchItem(item, batch, destDir, settings, emitThrottled);
      }
    }
  };

  // GPU Video Workers (Intel QSV Hardware Pipeline)
  const gpuWorkerTask = async () => {
    while (videoIndex < videoQueue.length) {
      if (await waitIfPaused()) return;
      const idx = videoIndex++;
      if (idx >= videoQueue.length) break;
      const item = videoQueue[idx];
      if (item.status === 'completed') continue;

      batch.stats.currentFile = item.relativePath;
      batch.stats.currentType = 'video';
      emitThrottled();

      await processBatchItem(item, batch, destDir, settings, emitThrottled);
    }
  };

  await Promise.all([
    ...Array.from({ length: cpuWorkers }, () => cpuWorkerTask()),
    ...Array.from({ length: gpuWorkers }, () => gpuWorkerTask())
  ]);
}
