import fs from 'fs';
import path from 'path';
import EventEmitter from 'events';
import sharp from 'sharp';
import { spawn } from 'child_process';
import crypto from 'crypto';
import os from 'os';
import { OptimizationLog } from '../models/OptimizationLog.js';

// Configure Sharp for high-speed multi-core processing with bounded memory cache
sharp.cache({ memory: 128, files: 50, items: 200 });
try {
  sharp.concurrency(Math.max(2, os.cpus().length || 4));
} catch (e) {}

const uuidv4 = () => crypto.randomUUID();

// Global Event Emitter for SSE Live Updates
export const folderBatchEvents = new EventEmitter();
folderBatchEvents.setMaxListeners(100);

// In-Memory Storage for Active & Scanned Batches
const scannedBatches = new Map();
const activeBatches = new Map();

// Supported media extensions
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tiff', '.tif', '.bmp', '.gif']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.mkv', '.avi', '.webm', '.m4v', '.3gp', '.flv', '.wmv', '.mts', '.m2ts']);

// Folders to safely ignore during recursive scan
const IGNORE_FOLDERS = new Set([
  '$recycle.bin',
  'system volume information',
  'node_modules',
  '.git',
  '.vscode',
  '.idea',
  'thumbs.db',
  'desktop.ini'
]);

export class FolderBatchService {
  /**
   * Explores local drives & directories for the visual folder picker
   */
  static async browseDirectory(targetPath = '') {
    try {
      const cleanTarget = (targetPath || '').trim().replace(/^["']|["']$/g, '');
      if (!cleanTarget || cleanTarget === '/' || cleanTarget === '\\') {
        // Return available Windows drives
        const drives = [];
        for (const letter of ['C', 'D', 'E', 'F', 'G']) {
          const drivePath = `${letter}:\\`;
          try {
            if (fs.existsSync(drivePath)) {
              drives.push({ name: `${letter}: Drive`, path: drivePath, isDir: true, isDrive: true });
            }
          } catch (e) {}
        }
        return { currentPath: '', entries: drives };
      }

      const normalized = path.resolve(cleanTarget);
      if (!fs.existsSync(normalized)) {
        throw new Error(`Directory does not exist: ${targetPath}`);
      }

      const dirents = await fs.promises.readdir(normalized, { withFileTypes: true });
      const entries = [];

      for (const d of dirents) {
        if (IGNORE_FOLDERS.has(d.name.toLowerCase())) continue;
        if (d.name.startsWith('$') || d.name.startsWith('.')) continue;

        if (d.isDirectory()) {
          entries.push({
            name: d.name,
            path: path.join(normalized, d.name),
            isDir: true
          });
        }
      }

      // Sort alphabetically
      entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

      // Parent directory
      const parentPath = path.dirname(normalized) !== normalized ? path.dirname(normalized) : '';

      return {
        currentPath: normalized,
        parentPath,
        entries
      };
    } catch (err) {
      throw new Error(`Failed to browse directory: ${err.message}`);
    }
  }

  /**
   * Recursively scans source directory without blocking event loop
   */
  static async scanDirectory(folderPath) {
    if (!folderPath) throw new Error('Source folder path is required');
    const cleanPath = folderPath.trim().replace(/^["']|["']$/g, '');
    const normalized = path.resolve(cleanPath);

    if (!fs.existsSync(normalized)) {
      throw new Error(`Directory not found: "${folderPath}"`);
    }

    const stat = await fs.promises.stat(normalized);
    if (!stat.isDirectory()) {
      throw new Error(`Path is not a directory: "${folderPath}"`);
    }

    const scanId = uuidv4();
    const files = [];
    let subfolderCount = 0;
    let maxDepth = 0;
    let totalBytes = 0;
    let imageCount = 0;
    let imageBytes = 0;
    let videoCount = 0;
    let videoBytes = 0;
    let otherCount = 0;
    let otherBytes = 0;

    // Fast asynchronous queue crawler
    const queue = [{ dir: normalized, depth: 0 }];

    while (queue.length > 0) {
      const { dir, depth } = queue.shift();
      if (depth > maxDepth) maxDepth = depth;

      let dirents;
      try {
        dirents = await fs.promises.readdir(dir, { withFileTypes: true });
      } catch (err) {
        // Skip unreadable / permission denied folders
        continue;
      }

      for (const dirent of dirents) {
        const name = dirent.name;
        if (IGNORE_FOLDERS.has(name.toLowerCase())) continue;
        if (name.startsWith('$') || name === 'Thumbs.db' || name === '.DS_Store') continue;

        const fullPath = path.join(dir, name);
        const relativePath = path.relative(normalized, fullPath);

        if (dirent.isDirectory()) {
          subfolderCount++;
          queue.push({ dir: fullPath, depth: depth + 1 });
        } else if (dirent.isFile()) {
          try {
            const fileStat = await fs.promises.stat(fullPath);
            const size = fileStat.size;
            const ext = path.extname(name).toLowerCase();

            let type = 'other';
            if (IMAGE_EXTENSIONS.has(ext)) {
              type = 'image';
              imageCount++;
              imageBytes += size;
            } else if (VIDEO_EXTENSIONS.has(ext)) {
              type = 'video';
              videoCount++;
              videoBytes += size;
            } else {
              otherCount++;
              otherBytes += size;
            }

            totalBytes += size;
            files.push({
              fullPath,
              relativePath,
              name,
              ext,
              size,
              type
            });
          } catch (e) {
            // Skip unreadable file
          }
        }
      }
    }

    // Benchmark-based realistic time estimation:
    // Images: Multi-worker pool handles ~80-100 images/sec on modern multi-core
    const imageTimeSec = Math.ceil(imageCount / 80);
    // Videos: Smart pass copies in 0.01s, heavy encoding ~15s
    const videoTimeSec = Math.ceil(videoCount * 2);
    // Non-media file copy: instantaneous (~500 files/sec)
    const otherTimeSec = Math.ceil(otherCount / 500);
    const estimatedTotalSec = Math.max(1, imageTimeSec + videoTimeSec + otherTimeSec);

    const scanResult = {
      scanId,
      rootPath: normalized,
      scannedAt: new Date().toISOString(),
      stats: {
        totalFiles: files.length,
        totalBytes,
        totalSizeMB: parseFloat((totalBytes / (1024 * 1024)).toFixed(2)),
        totalSizeGB: parseFloat((totalBytes / (1024 * 1024 * 1024)).toFixed(2)),
        images: {
          count: imageCount,
          bytes: imageBytes,
          sizeMB: parseFloat((imageBytes / (1024 * 1024)).toFixed(2)),
          sizeGB: parseFloat((imageBytes / (1024 * 1024 * 1024)).toFixed(2)),
          estimatedSec: imageTimeSec
        },
        videos: {
          count: videoCount,
          bytes: videoBytes,
          sizeMB: parseFloat((videoBytes / (1024 * 1024)).toFixed(2)),
          sizeGB: parseFloat((videoBytes / (1024 * 1024 * 1024)).toFixed(2)),
          estimatedSec: videoTimeSec
        },
        others: {
          count: otherCount,
          bytes: otherBytes,
          sizeMB: parseFloat((otherBytes / (1024 * 1024)).toFixed(2))
        },
        subfolderCount,
        maxDepth,
        estimatedTotalSec,
        estimatedFormatted: FolderBatchService.formatDuration(estimatedTotalSec)
      },
      files
    };

    // Cache in scannedBatches for rapid start
    scannedBatches.set(scanId, scanResult);

    // Keep memory clean: remove cached scan after 2 hours
    setTimeout(() => scannedBatches.delete(scanId), 2 * 60 * 60 * 1000);

    return scanResult;
  }

  /**
   * Starts batch optimization process
   */
  static async startBatch({
    scanId,
    sourceDir,
    destDir,
    settings = {}
  }) {
    if (!destDir) throw new Error('Destination folder path is required');
    const cleanDest = destDir.trim().replace(/^["']|["']$/g, '');
    const normalizedDest = path.resolve(cleanDest);

    let scanData = scanId ? scannedBatches.get(scanId) : null;
    const cleanSrc = sourceDir ? sourceDir.trim().replace(/^["']|["']$/g, '') : null;
    let normalizedSource = cleanSrc ? path.resolve(cleanSrc) : (scanData?.rootPath || null);

    if (!normalizedSource) {
      throw new Error('Valid source directory is required');
    }

    // Safety checks: Never overwrite source!
    if (normalizedSource.toLowerCase() === normalizedDest.toLowerCase()) {
      throw new Error('Destination folder cannot be the same as Source folder! Original files must remain safe.');
    }

    if (normalizedDest.toLowerCase().startsWith(normalizedSource.toLowerCase() + path.sep)) {
      throw new Error('Destination folder cannot be a sub-folder inside the Source folder to avoid recursive loops.');
    }

    // If scanData is missing (e.g. server restarted), do a fresh scan
    if (!scanData || scanData.rootPath.toLowerCase() !== normalizedSource.toLowerCase()) {
      scanData = await FolderBatchService.scanDirectory(normalizedSource);
    }

    // Ensure destination root directory exists
    await fs.promises.mkdir(normalizedDest, { recursive: true });

    const batchId = uuidv4();

    // Default settings with Smart Quality Guard & Turbo Speed
    const activeSettings = {
      imageFormat: settings.imageFormat || 'webp', // 'webp' | 'original'
      imageQuality: parseInt(settings.imageQuality || 90, 10), // Quality 90 default for studio crisp clarity
      preserveExif: settings.preserveExif !== false,
      videoPreset: settings.videoPreset || 'balanced', // 'balanced' | 'quality' | 'speed'
      videoCrf: parseInt(settings.videoCrf || 23, 10),
      videoMode: settings.videoMode || 'smart', // 'smart' (Smart Turbo Pass) | 'copy_all' | 'reencode_all'
      copyNonMedia: settings.copyNonMedia !== false, // Copy non-media files as-is
      skipExisting: settings.skipExisting !== false,
      // Smart Quality Guard (Only optimize files that genuinely need it)
      smartQualityGuard: settings.smartQualityGuard !== false,
      minImageSizeKB: parseInt(settings.minImageSizeKB ?? 500, 10), // Skip photos already under 500 KB to preserve pristine quality
      minVideoSizeMB: parseInt(settings.minVideoSizeMB ?? 15, 10), // Skip clips under 15 MB
      minSavingsPercent: parseInt(settings.minSavingsPercent ?? 12, 10) // Only keep compressed file if it saves >= 12% space
    };

    const batchState = {
      batchId,
      sourceDir: normalizedSource,
      destDir: normalizedDest,
      settings: activeSettings,
      status: 'running', // 'running' | 'paused' | 'completed' | 'cancelled'
      startTime: Date.now(),
      endTime: null,
      stats: {
        totalFiles: scanData.files.length,
        processed: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
        preservedOptimal: 0, // Photos/videos kept as original because they were already small/optimal
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
      files: scanData.files.map(f => ({ ...f, status: 'pending', error: null, outputSize: 0 })),
      failedFiles: [], // Registry for 1-click retry
      isPaused: false,
      isCancelled: false
    };

    activeBatches.set(batchId, batchState);

    // Launch worker in background (non-blocking)
    FolderBatchService.runWorker(batchId).catch((err) => {
      console.error(`Batch worker error on ${batchId}:`, err);
    });

    return {
      batchId,
      status: 'running',
      totalFiles: batchState.stats.totalFiles,
      sourceDir: normalizedSource,
      destDir: normalizedDest
    };
  }

  /**
   * Multi-Threaded Parallel Worker executing batch items with Smart Video Pass
   */
  static async runWorker(batchId) {
    const batch = activeBatches.get(batchId);
    if (!batch) return;

    const { files, destDir, sourceDir, settings } = batch;
    const startTime = Date.now();
    let fileCursor = 0;
    let activeVideoEncodes = 0;
    const MAX_VIDEO_CONCURRENCY = 2; // Intel Iris Xe dual-stream hardware concurrency
    let lastEmitTime = 0;

    // Concurrency: Use CPU threads (capped at 6 to keep system responsive)
    const CPU_COUNT = os.cpus().length || 4;
    const CONCURRENCY = Math.max(2, Math.min(6, CPU_COUNT));

    const emitThrottled = (force = false) => {
      const now = Date.now();
      if (force || now - lastEmitTime > 150) {
        lastEmitTime = now;
        FolderBatchService.updateSpeedAndETA(batch, startTime);
        FolderBatchService.emitProgress(batchId);
      }
    };

    const workerTask = async () => {
      while (true) {
        if (batch.isCancelled) break;
        while (batch.isPaused) {
          await new Promise(r => setTimeout(r, 400));
          if (batch.isCancelled) return;
        }

        const currentIndex = fileCursor++;
        if (currentIndex >= files.length) break;

        const item = files[currentIndex];
        batch.stats.currentFile = item.relativePath;
        batch.stats.currentType = item.type;
        item.status = 'processing';
        emitThrottled();

        // Construct target destination paths
        const targetSubDir = path.dirname(path.join(destDir, item.relativePath));
        try {
          await fs.promises.mkdir(targetSubDir, { recursive: true });
        } catch (e) {}

        let targetDestPath = path.join(destDir, item.relativePath);
        if (item.type === 'image' && settings.imageFormat === 'webp') {
          const ext = path.extname(item.relativePath);
          const relWithoutExt = item.relativePath.slice(0, -ext.length);
          targetDestPath = path.join(destDir, `${relWithoutExt}.webp`);
        } else if (item.type === 'video') {
          const ext = path.extname(item.relativePath);
          const relWithoutExt = item.relativePath.slice(0, -ext.length);
          targetDestPath = path.join(destDir, `${relWithoutExt}.mp4`);
        }

        // Skip existing check
        if (settings.skipExisting && fs.existsSync(targetDestPath)) {
          try {
            const outStat = await fs.promises.stat(targetDestPath);
            if (outStat.size > 0) {
              item.status = 'skipped';
              item.outputSize = outStat.size;
              batch.stats.skipped++;
              batch.stats.processed++;
              batch.stats.originalBytesProcessed += item.size;
              batch.stats.compressedBytesProcessed += outStat.size;
              if (item.type === 'image') batch.stats.imagesDone++;
              else if (item.type === 'video') batch.stats.videosDone++;
              else batch.stats.othersDone++;

              emitThrottled();
              continue;
            }
          } catch (e) {}
        }

        // Execute optimization per file type with Smart Quality Guard & Rich Telemetry
        const itemStartTime = new Date();
        let qualityBeforeMeta = {
          resolution: 'N/A',
          width: 0,
          height: 0,
          bitrateFormatted: 'N/A',
          bitrateKbps: 0,
          fps: 0
        };
        let qualityAfterMeta = {
          resolution: 'N/A',
          width: 0,
          height: 0,
          bitrateFormatted: 'N/A',
          bitrateKbps: 0,
          crfOrQuality: 'N/A',
          encoderUsed: 'Direct Disk Pass'
        };

        try {
          let outputSize = 0;
          let action = 'compressed';

          if (item.type === 'image') {
            const minImageBytes = (settings.minImageSizeKB !== undefined ? settings.minImageSizeKB : 500) * 1024;
            // If photo is already small (e.g. <= 500KB), preserve pristine original without generation loss!
            if (settings.smartQualityGuard && minImageBytes > 0 && item.size <= minImageBytes) {
              const preserveDestPath = path.join(destDir, item.relativePath);
              await fs.promises.copyFile(item.fullPath, preserveDestPath);
              const st = await fs.promises.stat(preserveDestPath);
              outputSize = st.size;
              action = 'preserved_original';
              batch.stats.preservedOptimal = (batch.stats.preservedOptimal || 0) + 1;
              qualityBeforeMeta = { resolution: 'Preserved', width: 0, height: 0, bitrateFormatted: 'N/A', bitrateKbps: 0, fps: 0 };
              qualityAfterMeta = { resolution: 'Preserved', width: 0, height: 0, bitrateFormatted: 'N/A', bitrateKbps: 0, crfOrQuality: 'Original Kept', encoderUsed: 'Direct Disk Pass' };
            } else {
              const res = await FolderBatchService.processImage(item.fullPath, targetDestPath, settings);
              outputSize = res.size;
              action = res.action;
              if (res.action === 'preserved_original') {
                batch.stats.preservedOptimal = (batch.stats.preservedOptimal || 0) + 1;
              }
              const imgDim = res.width && res.height ? `${res.width}x${res.height}` : 'N/A';
              qualityBeforeMeta = {
                resolution: imgDim,
                width: res.width || 0,
                height: res.height || 0,
                bitrateFormatted: 'N/A',
                bitrateKbps: 0,
                fps: 0
              };
              qualityAfterMeta = {
                resolution: imgDim,
                width: res.width || 0,
                height: res.height || 0,
                bitrateFormatted: 'N/A',
                bitrateKbps: 0,
                crfOrQuality: `Quality ${settings.imageQuality || 90}%`,
                encoderUsed: 'Sharp libvips'
              };
            }
            batch.stats.imagesDone++;
          } else if (item.type === 'video') {
            if (settings.videoMode === 'copy_all') {
              // User selected: Copy All Videos As-Is (Instant)
              const preserveDestPath = path.join(destDir, item.relativePath);
              await fs.promises.copyFile(item.fullPath, preserveDestPath);
              const st = await fs.promises.stat(preserveDestPath);
              outputSize = st.size;
              action = 'preserved_original';
              batch.stats.preservedOptimal = (batch.stats.preservedOptimal || 0) + 1;
              qualityBeforeMeta = { resolution: 'Preserved', width: 0, height: 0, bitrateFormatted: 'N/A', bitrateKbps: 0, fps: 0 };
              qualityAfterMeta = { resolution: 'Preserved', width: 0, height: 0, bitrateFormatted: 'N/A', bitrateKbps: 0, crfOrQuality: 'Original Kept', encoderUsed: 'Direct Disk Pass' };
            } else {
              const minVideoBytes = (settings.minVideoSizeMB !== undefined ? settings.minVideoSizeMB : 15) * 1024 * 1024;
              let canSmartPass = false;
              let probe = null;

              // 1. Max Size Cut bypasses smart guard to compress every video
              if (settings.videoMode === 'reencode_all') {
                canSmartPass = false;
              } else if (settings.smartQualityGuard && minVideoBytes > 0 && item.size <= minVideoBytes) {
                // Instant size check (avoids launching ffprobe for tiny clips <= minVideoBytes)
                canSmartPass = true;
              } else if (settings.smartQualityGuard) {
                // 2. Quick ffprobe check: only skip if video is genuinely ultra-low bitrate (<= 850 kbps)
                probe = await FolderBatchService.inspectVideoFast(item.fullPath);
                if (probe.canSmartCopy) {
                  canSmartPass = true;
                }
              }

              if (canSmartPass) {
                const preserveDestPath = path.join(destDir, item.relativePath);
                await fs.promises.copyFile(item.fullPath, preserveDestPath);
                const st = await fs.promises.stat(preserveDestPath);
                outputSize = st.size;
                action = 'preserved_original';
                batch.stats.preservedOptimal = (batch.stats.preservedOptimal || 0) + 1;
                qualityBeforeMeta = {
                  resolution: probe?.width ? `${probe.width}x${probe.height}` : 'N/A',
                  width: probe?.width || 0,
                  height: probe?.height || 0,
                  bitrateFormatted: FolderBatchService.formatBitrate(probe?.bitrate || 0),
                  bitrateKbps: Math.round((probe?.bitrate || 0) / 1000),
                  fps: probe?.fps || 0
                };
                qualityAfterMeta = {
                  resolution: probe?.width ? `${probe.width}x${probe.height}` : 'N/A',
                  width: probe?.width || 0,
                  height: probe?.height || 0,
                  bitrateFormatted: FolderBatchService.formatBitrate(probe?.bitrate || 0),
                  bitrateKbps: Math.round((probe?.bitrate || 0) / 1000),
                  crfOrQuality: 'Original Optimal',
                  encoderUsed: 'Direct Disk Pass'
                };
              } else {
                if (!probe) {
                  probe = await FolderBatchService.inspectVideoFast(item.fullPath);
                }

                qualityBeforeMeta = {
                  resolution: probe?.width ? `${probe.width}x${probe.height}` : 'N/A',
                  width: probe?.width || 0,
                  height: probe?.height || 0,
                  bitrateFormatted: FolderBatchService.formatBitrate(probe?.bitrate || 0),
                  bitrateKbps: Math.round((probe?.bitrate || 0) / 1000),
                  fps: probe?.fps || 0
                };

                // Wait for semaphore (up to MAX_VIDEO_CONCURRENCY parallel encodes)
                while (activeVideoEncodes >= MAX_VIDEO_CONCURRENCY) {
                  await new Promise(r => setTimeout(r, 100));
                  if (batch.isCancelled) return;
                }
                activeVideoEncodes++;
                try {
                  const vidRes = await FolderBatchService.processVideo(
                    item.fullPath,
                    targetDestPath,
                    settings,
                    probe,
                    (videoPct) => {
                      batch.stats.currentFile = `${item.relativePath} [${videoPct}%]`;
                      emitThrottled();
                    }
                  );
                  outputSize = vidRes.size;
                  action = vidRes.action;
                  if (vidRes.action === 'preserved_original') {
                    batch.stats.preservedOptimal = (batch.stats.preservedOptimal || 0) + 1;
                  }

                  // Quick probe for compressed video properties
                  const afterProbe = await FolderBatchService.inspectVideoFast(targetDestPath);
                  qualityAfterMeta = {
                    resolution: afterProbe?.width ? `${afterProbe.width}x${afterProbe.height}` : qualityBeforeMeta.resolution,
                    width: afterProbe?.width || qualityBeforeMeta.width,
                    height: afterProbe?.height || qualityBeforeMeta.height,
                    bitrateFormatted: FolderBatchService.formatBitrate(afterProbe?.bitrate || 0),
                    bitrateKbps: Math.round((afterProbe?.bitrate || 0) / 1000),
                    crfOrQuality: `CRF ${vidRes.crf || 22}`,
                    encoderUsed: vidRes.encoderUsed || 'Intel Iris Xe QSV'
                  };
                } finally {
                  activeVideoEncodes--;
                }
              }
            }
            batch.stats.videosDone++;
          } else {
            // Other non-media file
            if (settings.copyNonMedia) {
              await fs.promises.copyFile(item.fullPath, targetDestPath);
              const copiedStat = await fs.promises.stat(targetDestPath);
              outputSize = copiedStat.size;
            } else {
              outputSize = 0;
            }
            batch.stats.othersDone++;
          }

          item.status = 'completed';
          item.outputSize = outputSize;
          batch.stats.succeeded++;
          batch.stats.processed++;
          batch.stats.originalBytesProcessed += item.size;
          batch.stats.compressedBytesProcessed += outputSize;

          const itemEndTime = new Date();
          const timeTakenMs = Math.max(1, itemEndTime.getTime() - itemStartTime.getTime());
          const timeTakenFormatted = FolderBatchService.formatDurationMs(timeTakenMs);

          // Save rich log to MongoDB Atlas asynchronously with human-readable units and timestamps
          if (outputSize > 0) {
            const originalBytes = item.size;
            const compressedBytes = outputSize;
            const bytesSaved = Math.max(0, originalBytes - compressedBytes);
            const savedPct = originalBytes > 0 ? parseFloat((((originalBytes - compressedBytes) / originalBytes) * 100).toFixed(1)) : 0;

            const safeName = (item.name && item.name.length > 4 && !item.name.startsWith('.'))
              ? item.name
              : path.basename(item.fullPath);

            OptimizationLog.create({
              originalName: safeName,
              relativePath: item.relativePath,
              format: item.type === 'video' ? 'mp4' : (settings.imageFormat || 'webp'),
              module: 'folder_batch',
              status: action === 'preserved_original' ? 'preserved_optimal' : 'optimized',
              originalSize: originalBytes,
              compressedSize: compressedBytes,
              bytesSaved,
              percentageSaved: savedPct,
              timeTakenMs
            }).catch((err) => {
              console.warn(`[Batch DB Log Warning]: ${err.message}`);
            });
          }

        } catch (err) {
          console.warn(`[Batch Warning] Failed to process ${item.relativePath}:`, err.message);
          item.status = 'failed';
          item.error = err.message;
          batch.stats.failed++;
          batch.stats.processed++;
          batch.failedFiles.push({
            fullPath: item.fullPath,
            relativePath: item.relativePath,
            type: item.type,
            size: item.size,
            error: err.message
          });
        }

        emitThrottled();
      }
    };

    // Run parallel workers!
    const workers = Array.from({ length: CONCURRENCY }, () => workerTask());
    await Promise.all(workers);

    if (!batch.isCancelled) {
      batch.status = 'completed';
      batch.endTime = Date.now();
      batch.stats.percent = 100;
      batch.stats.remainingFormatted = 'Completed';
      batch.stats.remainingSec = 0;
      FolderBatchService.updateSpeedAndETA(batch, startTime);
      FolderBatchService.emitProgress(batchId);
    }
  }

  /**
   * Sharp Image Processor directly to disk with Turbo effort: 2
   */
  static async processImage(srcPath, destPath, settings) {
    const buffer = await fs.promises.readFile(srcPath);
    let pipeline = sharp(buffer, { failOn: 'none' });
    const origMeta = await pipeline.metadata().catch(() => ({}));

    if (settings.preserveExif) {
      pipeline = pipeline.withMetadata();
    }

    const q = Math.max(70, Math.min(100, parseInt(settings.imageQuality || 90, 10)));

    if (settings.imageFormat === 'webp') {
      pipeline = pipeline.webp({
        quality: q,
        effort: 2, // 3x faster than effort 4 with pristine quality!
        smartSubsample: q < 85 // Full 4:4:4 color chroma when quality >= 85 for zero color degradation
      });
    } else {
      // Keep original format optimized
      const ext = path.extname(srcPath).toLowerCase();
      if (ext === '.jpg' || ext === '.jpeg') {
        pipeline = pipeline.jpeg({
          quality: q,
          mozjpeg: true,
          progressive: true,
          trellisQuantisation: true,
          overshootDeringing: true
        });
      } else if (ext === '.png') {
        pipeline = pipeline.png({
          compressionLevel: 7,
          palette: q < 92
        });
      } else if (ext === '.avif') {
        pipeline = pipeline.avif({
          quality: q,
          effort: 2,
          chromaSubsampling: q >= 85 ? '4:4:4' : '4:2:0'
        });
      } else {
        pipeline = pipeline.webp({
          quality: q,
          effort: 2
        });
      }
    }

    // Write to a temporary file first to compare sizes safely
    const tempDest = `${destPath}.tmp_${Date.now()}`;
    await pipeline.toFile(tempDest);
    const tempStat = await fs.promises.stat(tempDest);

    const savedPercent = ((buffer.length - tempStat.size) / buffer.length) * 100;
    const minSavings = settings.minSavingsPercent !== undefined ? settings.minSavingsPercent : 12;

    // Quality Safeguard:
    // 1. If output is LARGER than original, NEVER keep it!
    // 2. If smartQualityGuard is active and compression saves less than minSavings (e.g. < 12%),
    //    keeping the original pristine copy is far better than causing generation loss!
    if (tempStat.size >= buffer.length || (settings.smartQualityGuard && savedPercent < minSavings)) {
      if (fs.existsSync(tempDest)) await fs.promises.unlink(tempDest).catch(() => {});
      // Copy pristine original to destPath
      await fs.promises.copyFile(srcPath, destPath);
      const st = await fs.promises.stat(destPath);
      return {
        size: st.size,
        action: 'preserved_original',
        width: origMeta.width || 0,
        height: origMeta.height || 0,
        format: settings.imageFormat || 'original'
      };
    }

    // Otherwise, rename temporary output to final destPath
    if (fs.existsSync(destPath)) await fs.promises.unlink(destPath).catch(() => {});
    await fs.promises.rename(tempDest, destPath);
    return {
      size: tempStat.size,
      action: 'compressed',
      width: origMeta.width || 0,
      height: origMeta.height || 0,
      format: settings.imageFormat || 'webp'
    };
  }

  /**
   * Fast probe for video resolution, bitrate, fps & duration with safety timeout
   */
  static async inspectVideoFast(filePath, timeoutMs = 6000) {
    return new Promise((resolve) => {
      let resolved = false;
      let proc = null;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          try { if (proc) proc.kill(); } catch (e) {}
          resolve({ canSmartCopy: false, reason: 'probe_timeout', width: 0, height: 0, bitrate: 0, fps: 0, duration: 0 });
        }
      }, timeoutMs);

      try {
        proc = spawn('ffprobe', [
          '-v', 'error',
          '-select_streams', 'v:0',
          '-show_entries', 'stream=width,height,bit_rate,r_frame_rate,avg_frame_rate',
          '-show_entries', 'format=bit_rate,duration',
          '-of', 'json',
          filePath
        ]);

        let stdout = '';
        proc.stdout.on('data', (d) => { stdout += d.toString(); });
        proc.on('close', () => {
          if (resolved) return;
          clearTimeout(timer);
          resolved = true;

          try {
            const data = JSON.parse(stdout);
            const s = data.streams?.[0] || {};
            const fmt = data.format || {};
            const width = parseInt(s.width || 0, 10);
            const height = parseInt(s.height || 0, 10);
            const bitrate = parseInt(fmt.bit_rate || s.bit_rate || 0, 10);
            const duration = parseFloat(fmt.duration || 0);

            let fps = 0;
            const rateStr = s.avg_frame_rate || s.r_frame_rate || '';
            if (rateStr && rateStr.includes('/')) {
              const parts = rateStr.split('/');
              const num = parseFloat(parts[0]);
              const den = parseFloat(parts[1]);
              if (den > 0) fps = Math.round(num / den);
            }

            // Smart Pass Bloat Guard:
            // Skip videos that are genuinely already ultra-low bitrate (<= 850 kbps),
            // because re-encoding sub-850kbps 480p clips yields little and can cause pixelation.
            // Videos >= 850 kbps (1 Mbps - 50 Mbps) CAN and SHOULD be compressed to save 40%-65% space!
            const isAlreadyUltraLowBitrate = bitrate > 0 && bitrate <= 850000;

            if (isAlreadyUltraLowBitrate) {
              resolve({
                canSmartCopy: true,
                reason: 'already_low_bitrate',
                width,
                height,
                bitrate,
                duration,
                fps
              });
            } else {
              resolve({
                canSmartCopy: false,
                width,
                height,
                bitrate,
                duration,
                fps
              });
            }
          } catch (e) {
            resolve({ canSmartCopy: true, reason: 'probe_error', width: 0, height: 0, bitrate: 0, fps: 0, duration: 0 });
          }
        });

        proc.on('error', () => {
          if (resolved) return;
          clearTimeout(timer);
          resolved = true;
          resolve({ canSmartCopy: true, reason: 'probe_spawn_error', width: 0, height: 0, bitrate: 0, fps: 0, duration: 0 });
        });
      } catch (err) {
        if (!resolved) {
          clearTimeout(timer);
          resolved = true;
          resolve({ canSmartCopy: true, reason: 'probe_exception', width: 0, height: 0, bitrate: 0, fps: 0, duration: 0 });
        }
      }
    });
  }

  /**
   * FFmpeg Video Processor with Full Intel Iris Xe GPU Decode + Encode, async_depth 4 & Direct Audio Copy
   */
  static async processVideo(srcPath, destPath, settings, probeData = null, onProgress = null) {
    const origStat = await fs.promises.stat(srcPath);

    return new Promise((resolve, reject) => {
      // Temporary file while encoding to prevent partial corruption
      const tempOut = `${destPath}.tmp_${Date.now()}.mp4`;

      let crf = 21; // Studio-grade pristine clarity (Zero visible difference from raw original)
      if (settings.videoPreset === 'quality') crf = 19;
      if (settings.videoPreset === 'speed') crf = 26;
      if (settings.videoCrf) crf = settings.videoCrf;

      // Smart Bitrate Ceiling based on resolution to ensure 50%-70% compression with 0 visible blur
      const width = probeData?.width || 1920;
      const height = probeData?.height || 1080;
      const maxDim = Math.max(width, height);
      let maxrate = '4.5M';
      let bufsize = '9M';
      if (maxDim >= 3800) {
        maxrate = '8.5M';
        bufsize = '17M';
      } else if (maxDim <= 1280 && maxDim > 0) {
        maxrate = '2.5M';
        bufsize = '5M';
      }

      // Tier 1: Full GPU Pipeline (Intel GPU Decode + GPU Encode) + Bit-for-bit Identical Audio Copy (0 loss, 0ms latency)
      const qsvFullHardwareArgs = [
        '-y',
        '-hwaccel', 'qsv',
        '-hwaccel_output_format', 'qsv',
        '-async_depth', '4',
        '-i', srcPath,
        '-c:v', 'h264_qsv',
        '-global_quality', String(crf),
        '-preset', 'veryfast', // Maximum Intel Iris Xe throughput (TU7)
        '-profile:v', 'high',
        '-maxrate', maxrate,
        '-bufsize', bufsize,
        '-c:a', 'copy', // 100% Bit-Identical Studio Audio (Zero degradation)
        '-movflags', '+faststart',
        tempOut
      ];

      // Tier 2: QSV GPU Encode with Studio 192k AAC (Fallback if hardware decoding or audio copy fails on container)
      const qsvNativeArgs = [
        '-y',
        '-async_depth', '4',
        '-i', srcPath,
        '-c:v', 'h264_qsv',
        '-global_quality', String(crf),
        '-preset', 'veryfast',
        '-profile:v', 'high',
        '-maxrate', maxrate,
        '-bufsize', bufsize,
        '-c:a', 'aac',
        '-b:a', '192k', // Studio High Quality AAC
        '-movflags', '+faststart',
        tempOut
      ];

      // Tier 3: Multi-threaded Software x264 Fallback
      const softArgs = [
        '-y',
        '-i', srcPath,
        '-c:v', 'libx264',
        '-crf', String(crf),
        '-preset', 'veryfast',
        '-profile:v', 'high',
        '-maxrate', maxrate,
        '-bufsize', bufsize,
        '-threads', '0',
        '-c:a', 'copy',
        '-movflags', '+faststart',
        tempOut
      ];

      // Safety timeout: 4 minutes or 3x duration
      const durationSec = probeData?.duration || 60;
      const timeoutLimitMs = Math.max(240000, durationSec * 3000);

      const runFfmpeg = (args, tier = 1) => {
        let timer = null;
        const proc = spawn('ffmpeg', args);
        let stderr = '';

        timer = setTimeout(() => {
          try { proc.kill(); } catch (e) {}
        }, timeoutLimitMs);

        proc.stderr.on('data', (d) => {
          const str = d.toString();
          stderr += str;
          if (onProgress && probeData?.duration > 0) {
            const match = str.match(/time=(\d+):(\d+):(\d+\.\d+)/);
            if (match) {
              const curSec = parseInt(match[1], 10) * 3600 + parseInt(match[2], 10) * 60 + parseFloat(match[3]);
              const pct = Math.min(99, Math.max(1, Math.round((curSec / probeData.duration) * 100)));
              onProgress(pct);
            }
          }
        });

        proc.on('close', async (code) => {
          clearTimeout(timer);
          if (code === 0 && fs.existsSync(tempOut)) {
            try {
              const outStat = await fs.promises.stat(tempOut);

              // Video Bloat Guard: If compressed video became larger than original, keep pristine original!
              if (outStat.size >= origStat.size) {
                if (fs.existsSync(tempOut)) await fs.promises.unlink(tempOut).catch(() => {});
                if (fs.existsSync(destPath)) await fs.promises.unlink(destPath).catch(() => {});
                await fs.promises.copyFile(srcPath, destPath);
                resolve({
                  size: origStat.size,
                  action: 'preserved_original',
                  encoderUsed: tier === 3 ? 'libx264 Software' : 'Intel Iris Xe QSV (Turbo Hardware)',
                  crf
                });
              } else {
                // Rename temp file to final destination
                if (fs.existsSync(destPath)) {
                  await fs.promises.unlink(destPath).catch(() => {});
                }
                await fs.promises.rename(tempOut, destPath);
                resolve({
                  size: outStat.size,
                  action: 'compressed',
                  encoderUsed: tier === 3 ? 'libx264 Software' : 'Intel Iris Xe QSV (Turbo Hardware)',
                  crf
                });
              }
            } catch (err) {
              reject(err);
            }
          } else {
            // Clean up temp file
            if (fs.existsSync(tempOut)) await fs.promises.unlink(tempOut).catch(() => {});

            if (tier === 1) {
              console.warn('[Video QSV Fallback 1] Retrying with native QSV pipeline...');
              runFfmpeg(qsvNativeArgs, 2);
            } else if (tier === 2) {
              console.warn('[Video QSV Fallback 2] Retrying with libx264 software encoder...');
              runFfmpeg(softArgs, 3);
            } else {
              reject(new Error(`FFmpeg encoding failed: ${stderr.slice(-200)}`));
            }
          }
        });

        proc.on('error', (err) => {
          clearTimeout(timer);
          if (tier === 1) {
            runFfmpeg(qsvNativeArgs, 2);
          } else if (tier === 2) {
            runFfmpeg(softArgs, 3);
          } else {
            reject(err);
          }
        });
      };

      runFfmpeg(qsvFullHardwareArgs, 1);
    });
  }

  /**
   * 1-Click Retry Failed Files Only
   */
  static async retryFailed(batchId) {
    const batch = activeBatches.get(batchId);
    if (!batch) throw new Error('Batch not found');
    if (batch.failedFiles.length === 0) {
      return { message: 'No failed files to retry!', retriedCount: 0 };
    }

    const failedToRetry = [...batch.failedFiles];
    batch.failedFiles = []; // Clear current failures to re-populate on retry
    batch.status = 'running';
    batch.isPaused = false;
    batch.isCancelled = false;

    const { destDir, settings } = batch;

    // Run retry asynchronously
    (async () => {
      for (const item of failedToRetry) {
        batch.stats.currentFile = `(Retrying) ${item.relativePath}`;
        FolderBatchService.emitProgress(batchId);

        const targetSubDir = path.dirname(path.join(destDir, item.relativePath));
        await fs.promises.mkdir(targetSubDir, { recursive: true }).catch(() => {});

        let targetDestPath = path.join(destDir, item.relativePath);
        if (item.type === 'image' && settings.imageFormat === 'webp') {
          const ext = path.extname(item.relativePath);
          const relWithoutExt = item.relativePath.slice(0, -ext.length);
          targetDestPath = path.join(destDir, `${relWithoutExt}.webp`);
        } else if (item.type === 'video') {
          const ext = path.extname(item.relativePath);
          const relWithoutExt = item.relativePath.slice(0, -ext.length);
          targetDestPath = path.join(destDir, `${relWithoutExt}.mp4`);
        }

        try {
          let outputSize = 0;
          if (item.type === 'image') {
            const res = await FolderBatchService.processImage(item.fullPath, targetDestPath, settings);
            outputSize = res.size;
            batch.stats.imagesDone++;
          } else if (item.type === 'video') {
            const vidRes = await FolderBatchService.processVideo(item.fullPath, targetDestPath, settings);
            outputSize = vidRes.size;
            batch.stats.videosDone++;
          } else {
            await fs.promises.copyFile(item.fullPath, targetDestPath);
            const st = await fs.promises.stat(targetDestPath);
            outputSize = st.size;
            batch.stats.othersDone++;
          }

          batch.stats.succeeded++;
          batch.stats.failed = Math.max(0, batch.stats.failed - 1);
          batch.stats.originalBytesProcessed += item.size;
          batch.stats.compressedBytesProcessed += outputSize;
        } catch (err) {
          batch.failedFiles.push({
            ...item,
            error: err.message
          });
        }

        FolderBatchService.emitProgress(batchId);
      }

      batch.status = 'completed';
      FolderBatchService.emitProgress(batchId);
    })();

    return {
      message: `Retrying ${failedToRetry.length} failed files...`,
      retriedCount: failedToRetry.length
    };
  }

  /**
   * 1-Click Fallback: Copies the uncompressed original media files directly to destination
   * ensuring 100% of the files are present in the exact mirrored directory structure.
   */
  static async copyOriginalsFallback(batchId) {
    const batch = activeBatches.get(batchId);
    if (!batch) throw new Error('Batch not found');
    if (!batch.failedFiles || batch.failedFiles.length === 0) {
      return { message: 'No failed files to copy!', copiedCount: 0 };
    }

    const failedToCopy = [...batch.failedFiles];
    batch.failedFiles = []; // Clear failed list as they will now exist as original copies
    const { destDir } = batch;

    let copiedCount = 0;
    for (const item of failedToCopy) {
      try {
        const targetSubDir = path.dirname(path.join(destDir, item.relativePath));
        await fs.promises.mkdir(targetSubDir, { recursive: true }).catch(() => {});

        // Keep original extension so it is a bit-for-bit exact copy of the original
        const targetDestPath = path.join(destDir, item.relativePath);
        await fs.promises.copyFile(item.fullPath, targetDestPath);
        const st = await fs.promises.stat(targetDestPath);

        batch.stats.succeeded++;
        batch.stats.failed = Math.max(0, batch.stats.failed - 1);
        batch.stats.originalBytesProcessed += item.size;
        batch.stats.compressedBytesProcessed += st.size;
        copiedCount++;
      } catch (err) {
        console.error(`Failed to copy fallback original ${item.relativePath}:`, err);
        batch.failedFiles.push({
          ...item,
          error: `Copy fallback failed: ${err.message}`
        });
      }
    }

    FolderBatchService.emitProgress(batchId);

    return {
      success: true,
      copiedCount,
      remainingFailed: batch.failedFiles.length,
      message: `Successfully copied ${copiedCount} original files to their exact sub-folders!`
    };
  }

  /**
   * Pauses an active batch
   */
  static pauseBatch(batchId) {
    const batch = activeBatches.get(batchId);
    if (!batch) throw new Error('Batch not found');
    batch.isPaused = true;
    batch.status = 'paused';
    FolderBatchService.emitProgress(batchId);
    return { status: 'paused' };
  }

  /**
   * Resumes a paused batch
   */
  static resumeBatch(batchId) {
    const batch = activeBatches.get(batchId);
    if (!batch) throw new Error('Batch not found');
    batch.isPaused = false;
    batch.status = 'running';
    FolderBatchService.emitProgress(batchId);
    return { status: 'running' };
  }

  /**
   * Cancels an active batch
   */
  static cancelBatch(batchId) {
    const batch = activeBatches.get(batchId);
    if (!batch) throw new Error('Batch not found');
    batch.isCancelled = true;
    batch.isPaused = false;
    batch.status = 'cancelled';
    FolderBatchService.emitProgress(batchId);
    return { status: 'cancelled' };
  }

  /**
   * Calculates Speed and remaining time dynamically
   */
  static updateSpeedAndETA(batch, startTime) {
    const elapsedMs = Math.max(1, Date.now() - startTime);
    const elapsedSec = elapsedMs / 1000;
    const processed = batch.stats.processed;
    const total = batch.stats.totalFiles;

    const itemsPerSec = processed / elapsedSec;
    batch.stats.currentSpeed = `${itemsPerSec.toFixed(1)} items/s`;

    const remainingItems = Math.max(0, total - processed);
    const remainingSec = itemsPerSec > 0 ? Math.ceil(remainingItems / itemsPerSec) : 0;
    batch.stats.remainingSec = remainingSec;
    batch.stats.remainingFormatted = FolderBatchService.formatDuration(remainingSec);
    batch.stats.elapsedFormatted = FolderBatchService.formatDuration(Math.floor(elapsedSec));

    batch.stats.percent = total > 0 ? parseFloat(((processed / total) * 100).toFixed(1)) : 0;
    batch.stats.bytesSaved = Math.max(0, batch.stats.originalBytesProcessed - batch.stats.compressedBytesProcessed);
  }

  /**
   * Helper: format seconds to HH:MM:SS or MM:SS
   */
  static formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  }

  /**
   * Helper: format bytes into KB, MB, GB human-readable units
   */
  static formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Helper: format milliseconds into human-readable duration (e.g. "4.25s", "1m 12s")
   */
  static formatDurationMs(ms) {
    if (!ms || ms <= 0) return '0s';
    const sec = ms / 1000;
    if (sec < 60) return `${sec.toFixed(2)}s`;
    const mins = Math.floor(sec / 60);
    const remSec = Math.floor(sec % 60);
    return `${mins}m ${remSec}s`;
  }

  /**
   * Helper: format bitrate bps into kbps or Mbps
   */
  static formatBitrate(bps) {
    if (!bps || bps <= 0) return 'N/A';
    if (bps >= 1000000) return `${(bps / 1000000).toFixed(2)} Mbps`;
    return `${Math.round(bps / 1000)} kbps`;
  }

  /**
   * Get public state for frontend / SSE
   */
  static getPublicState(batchId) {
    const batch = activeBatches.get(batchId);
    if (!batch) return null;

    const origMB = (batch.stats.originalBytesProcessed / (1024 * 1024)).toFixed(1);
    const compMB = (batch.stats.compressedBytesProcessed / (1024 * 1024)).toFixed(1);
    const savedMB = (batch.stats.bytesSaved / (1024 * 1024)).toFixed(1);
    const savedPercent = batch.stats.originalBytesProcessed > 0
      ? ((batch.stats.bytesSaved / batch.stats.originalBytesProcessed) * 100).toFixed(1)
      : '0.0';

    return {
      batchId: batch.batchId,
      sourceDir: batch.sourceDir,
      destDir: batch.destDir,
      status: batch.status,
      isPaused: batch.isPaused,
      isCancelled: batch.isCancelled,
      stats: {
        ...batch.stats,
        originalMB: parseFloat(origMB),
        compressedMB: parseFloat(compMB),
        savedMB: parseFloat(savedMB),
        savedGB: parseFloat((batch.stats.bytesSaved / (1024 * 1024 * 1024)).toFixed(2)),
        savedPercent: parseFloat(savedPercent)
      },
      failedFiles: batch.failedFiles
    };
  }

  /**
   * Emit SSE progress to listeners
   */
  static emitProgress(batchId) {
    const state = FolderBatchService.getPublicState(batchId);
    if (state) {
      folderBatchEvents.emit(`progress:${batchId}`, state);
    }
  }

  static getActiveOrRecentBatch() {
    for (const [id, batch] of activeBatches.entries()) {
      if (batch.status === 'running' || batch.status === 'paused') {
        return FolderBatchService.getPublicState(id);
      }
    }
    const all = Array.from(activeBatches.keys());
    if (all.length > 0) {
      return FolderBatchService.getPublicState(all[all.length - 1]);
    }
    return null;
  }
}
