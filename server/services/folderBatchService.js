import fs from 'fs';
import path from 'path';
import EventEmitter from 'events';
import sharp from 'sharp';
import { spawn } from 'child_process';
import crypto from 'crypto';
import { OptimizationLog } from '../models/OptimizationLog.js';

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
    // Images: Sharp multi-core handles ~45-50 images/sec on Intel Core i5/i7/i9
    const imageTimeSec = Math.ceil(imageCount / 45);
    // Videos: Intel Iris Xe QuickSync encodes ~15-20 sec per standard clip
    const videoTimeSec = Math.ceil(videoCount * 18);
    // Non-media file copy: instantaneous (~500 files/sec)
    const otherTimeSec = Math.ceil(otherCount / 500);
    const estimatedTotalSec = imageTimeSec + videoTimeSec + otherTimeSec;

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

    // Default settings with Smart Quality Guard
    const activeSettings = {
      imageFormat: settings.imageFormat || 'webp', // 'webp' | 'original'
      imageQuality: parseInt(settings.imageQuality || 90, 10), // Quality 90 default for studio crisp clarity
      preserveExif: settings.preserveExif !== false,
      videoPreset: settings.videoPreset || 'balanced', // 'balanced' | 'quality' | 'speed'
      videoCrf: parseInt(settings.videoCrf || 23, 10),
      copyNonMedia: settings.copyNonMedia !== false, // Default to true as user requested
      skipExisting: settings.skipExisting !== false,
      // Smart Quality Guard (Only optimize files that genuinely need it)
      smartQualityGuard: settings.smartQualityGuard !== false,
      minImageSizeKB: parseInt(settings.minImageSizeKB ?? 500, 10), // Skip photos already under 500 KB to preserve pristine quality
      minVideoSizeMB: parseInt(settings.minVideoSizeMB ?? 20, 10), // Skip short/small videos under 20 MB
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
   * Worker executing batch items sequentially/in controlled concurrency
   */
  static async runWorker(batchId) {
    const batch = activeBatches.get(batchId);
    if (!batch) return;

    const { files, destDir, sourceDir, settings } = batch;
    const startTime = Date.now();
    let processedSinceLastCalc = 0;
    let lastCalcTime = Date.now();

    for (let i = 0; i < files.length; i++) {
      // Check cancellation
      if (batch.isCancelled) {
        batch.status = 'cancelled';
        batch.endTime = Date.now();
        FolderBatchService.emitProgress(batchId);
        break;
      }

      // Check pause
      while (batch.isPaused) {
        await new Promise(r => setTimeout(r, 500));
        if (batch.isCancelled) break;
      }

      const item = files[i];
      batch.stats.currentFile = item.relativePath;
      batch.stats.currentType = item.type;
      item.status = 'processing';
      FolderBatchService.emitProgress(batchId);

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

            FolderBatchService.updateSpeedAndETA(batch, startTime);
            FolderBatchService.emitProgress(batchId);
            continue;
          }
        } catch (e) {}
      }

      // Execute optimization per file type with Smart Quality Guard
      try {
        let outputSize = 0;
        let action = 'compressed';

        if (item.type === 'image') {
          const minImageBytes = (settings.minImageSizeKB !== undefined ? settings.minImageSizeKB : 500) * 1024;
          // If file is already small (e.g. <= 500KB), preserve pristine original without generation loss!
          if (settings.smartQualityGuard && minImageBytes > 0 && item.size <= minImageBytes) {
            const preserveDestPath = path.join(destDir, item.relativePath);
            await fs.promises.copyFile(item.fullPath, preserveDestPath);
            const st = await fs.promises.stat(preserveDestPath);
            outputSize = st.size;
            action = 'preserved_original';
            batch.stats.preservedOptimal = (batch.stats.preservedOptimal || 0) + 1;
          } else {
            const res = await FolderBatchService.processImage(item.fullPath, targetDestPath, settings);
            outputSize = res.size;
            if (res.action === 'preserved_original') {
              batch.stats.preservedOptimal = (batch.stats.preservedOptimal || 0) + 1;
            }
          }
          batch.stats.imagesDone++;
        } else if (item.type === 'video') {
          const minVideoBytes = (settings.minVideoSizeMB !== undefined ? settings.minVideoSizeMB : 20) * 1024 * 1024;
          // If video is already small (e.g. <= 20MB), preserve pristine original!
          if (settings.smartQualityGuard && minVideoBytes > 0 && item.size <= minVideoBytes) {
            const preserveDestPath = path.join(destDir, item.relativePath);
            await fs.promises.copyFile(item.fullPath, preserveDestPath);
            const st = await fs.promises.stat(preserveDestPath);
            outputSize = st.size;
            action = 'preserved_original';
            batch.stats.preservedOptimal = (batch.stats.preservedOptimal || 0) + 1;
          } else {
            outputSize = await FolderBatchService.processVideo(item.fullPath, targetDestPath, settings);
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

        // Save log to MongoDB Atlas asynchronously so telemetry and stats update live
        if (outputSize > 0) {
          const savedPct = item.size > 0 ? parseFloat((((item.size - outputSize) / item.size) * 100).toFixed(1)) : 0;
          OptimizationLog.create({
            originalName: item.name,
            originalSize: item.size,
            compressedSize: outputSize,
            percentageSaved: savedPct,
            format: item.type === 'video' ? 'mp4' : (settings.imageFormat || 'webp')
          }).catch(() => {});
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

      // Update metrics
      FolderBatchService.updateSpeedAndETA(batch, startTime);

      // Throttle SSE events slightly so we don't choke sockets with 11k fast image events
      processedSinceLastCalc++;
      const now = Date.now();
      if (now - lastCalcTime > 200 || i === files.length - 1) {
        FolderBatchService.emitProgress(batchId);
        lastCalcTime = now;
      }
    }

    if (!batch.isCancelled) {
      batch.status = 'completed';
      batch.endTime = Date.now();
      batch.stats.percent = 100;
      batch.stats.remainingFormatted = 'Completed';
      batch.stats.remainingSec = 0;
      FolderBatchService.emitProgress(batchId);
    }
  }

  /**
   * Sharp Image Processor directly to disk
   */
  static async processImage(srcPath, destPath, settings) {
    const buffer = await fs.promises.readFile(srcPath);
    let pipeline = sharp(buffer, { failOn: 'none' });

    if (settings.preserveExif) {
      pipeline = pipeline.withMetadata();
    }

    const q = Math.max(70, Math.min(100, parseInt(settings.imageQuality || 90, 10)));

    if (settings.imageFormat === 'webp') {
      pipeline = pipeline.webp({
        quality: q,
        effort: 4,
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
          compressionLevel: 8,
          palette: q < 92
        });
      } else if (ext === '.avif') {
        pipeline = pipeline.avif({
          quality: q,
          chromaSubsampling: q >= 85 ? '4:4:4' : '4:2:0'
        });
      } else {
        pipeline = pipeline.webp({
          quality: q
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
      return { size: st.size, action: 'preserved_original' };
    }

    // Otherwise, rename temporary output to final destPath
    if (fs.existsSync(destPath)) await fs.promises.unlink(destPath).catch(() => {});
    await fs.promises.rename(tempDest, destPath);
    return { size: tempStat.size, action: 'compressed' };
  }

  /**
   * Fast probe for original video bitrate
   */
  static async getVideoBitrate(filePath) {
    return new Promise((resolve) => {
      const proc = spawn('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=bit_rate',
        '-of', 'json',
        filePath
      ]);
      let stdout = '';
      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.on('close', () => {
        try {
          const data = JSON.parse(stdout);
          const bitrate = parseInt(data.format?.bit_rate || 0, 10);
          resolve(bitrate);
        } catch (e) {
          resolve(0);
        }
      });
      proc.on('error', () => resolve(0));
    });
  }

  /**
   * FFmpeg Video Processor with Intel Iris Xe QSV & Bitrate Ceiling Guard
   */
  static async processVideo(srcPath, destPath, settings) {
    const origStat = await fs.promises.stat(srcPath);
    const origBitrate = await FolderBatchService.getVideoBitrate(srcPath);

    // Smart Bitrate Guard: If video is already heavily compressed (bitrate <= 1,200 kbps),
    // re-encoding it will only bloat the file or destroy quality! Preserve pristine original!
    if (origBitrate > 0 && origBitrate <= 1200000) {
      if (fs.existsSync(destPath)) await fs.promises.unlink(destPath).catch(() => {});
      await fs.promises.copyFile(srcPath, destPath);
      return origStat.size;
    }

    return new Promise((resolve, reject) => {
      // Temporary file while encoding to prevent partial corruption
      const tempOut = `${destPath}.tmp_${Date.now()}.mp4`;

      let crf = 23;
      if (settings.videoPreset === 'quality') crf = 19;
      if (settings.videoPreset === 'speed') crf = 28;
      if (settings.videoCrf) crf = settings.videoCrf;

      // Intel Iris Xe QuickSync arguments
      const qsvArgs = [
        '-y',
        '-init_hw_device', 'qsv=hw',
        '-filter_hw_device', 'hw',
        '-i', srcPath,
        '-c:v', 'h264_qsv',
        '-global_quality', String(crf),
        '-preset', 'medium',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        tempOut
      ];

      // Safe Bitrate Ceiling: never allow encoder to exceed 80% of original bitrate
      if (origBitrate > 1200000) {
        const maxRateKbps = Math.floor((origBitrate * 0.80) / 1000);
        qsvArgs.splice(qsvArgs.indexOf('-preset'), 0, '-maxrate', `${maxRateKbps}k`);
      }

      // Fallback software x264 arguments
      const softArgs = [
        '-y',
        '-i', srcPath,
        '-c:v', 'libx264',
        '-crf', String(crf),
        '-preset', 'fast',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        tempOut
      ];

      const runFfmpeg = (args, isFallback = false) => {
        const proc = spawn('ffmpeg', args);
        let stderr = '';

        proc.stderr.on('data', (d) => {
          stderr += d.toString();
        });

        proc.on('close', async (code) => {
          if (code === 0 && fs.existsSync(tempOut)) {
            try {
              const origStat = await fs.promises.stat(srcPath);
              const outStat = await fs.promises.stat(tempOut);

              // Video Bloat Guard: If compressed video became larger than original, keep pristine original!
              if (outStat.size >= origStat.size) {
                if (fs.existsSync(tempOut)) await fs.promises.unlink(tempOut).catch(() => {});
                if (fs.existsSync(destPath)) await fs.promises.unlink(destPath).catch(() => {});
                await fs.promises.copyFile(srcPath, destPath);
                resolve(origStat.size);
              } else {
                // Rename temp file to final destination
                if (fs.existsSync(destPath)) {
                  await fs.promises.unlink(destPath).catch(() => {});
                }
                await fs.promises.rename(tempOut, destPath);
                resolve(outStat.size);
              }
            } catch (err) {
              reject(err);
            }
          } else {
            // Clean up temp file
            if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);

            if (!isFallback) {
              console.warn('[Video QSV fallback] Retrying with libx264 software encoder...');
              runFfmpeg(softArgs, true);
            } else {
              reject(new Error(`FFmpeg encoding failed: ${stderr.slice(-200)}`));
            }
          }
        });

        proc.on('error', (err) => {
          if (!isFallback) {
            runFfmpeg(softArgs, true);
          } else {
            reject(err);
          }
        });
      };

      runFfmpeg(qsvArgs, false);
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
            outputSize = await FolderBatchService.processVideo(item.fullPath, targetDestPath, settings);
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
}
