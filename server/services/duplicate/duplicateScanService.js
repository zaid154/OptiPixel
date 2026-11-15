import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import FileCache from '../../models/FileCache.js';
import { OptimizationLog } from '../../models/OptimizationLog.js';
import { workerPool } from '../../workers/workerPool.js';
import { VideoKeyframeService } from './videoKeyframeService.js';
import { ClusteringService } from './clusteringService.js';

const VALID_IMG = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.bmp', '.tif', '.tiff', '.dng']);
const VALID_VID = new Set(['.mp4', '.mkv', '.mov', '.avi', '.webm', '.3gp', '.m4v']);
const VALID_AUD = new Set(['.mp3', '.opus', '.wav', '.m4a', '.aac', '.flac', '.ogg']);

export class DuplicateScanService {
  constructor() {
    this.isScanning = false;
    this.shouldAbort = false;
    this.lastGroups = [];
    this.lastProcessedFiles = [];
    this.lastSimilarityThreshold = 95;
    this.lastMatchModes = ['exact', 'visual'];
    this.activeRootPath = '';
    this.currentProgress = {
      isScanning: false,
      stage: 'idle',
      processed: 0,
      total: 0,
      currentFile: '',
      percent: 0,
      itemsPerSec: '0',
      elapsedSeconds: 0
    };
    this.loadPersistedSession();
  }

  loadPersistedSession() {
    try {
      const cacheDir = path.join(process.cwd(), '.optipixel_cache');
      const cacheFile = path.join(cacheDir, 'last_duplicate_scan.json');
      if (fs.existsSync(cacheFile)) {
        const raw = fs.readFileSync(cacheFile, 'utf8');
        const data = JSON.parse(raw);
        if (data?.lastGroups?.length) {
          this.lastGroups = data.lastGroups;
          this.lastProcessedFiles = data.lastProcessedFiles || [];
          this.activeRootPath = data.activeRootPath || '';
          this.lastSimilarityThreshold = data.lastSimilarityThreshold || 95;
          this.lastMatchModes = data.lastMatchModes || ['exact', 'visual'];
        }
      }
    } catch {}
  }

  persistSession() {
    try {
      const cacheDir = path.join(process.cwd(), '.optipixel_cache');
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
      const cacheFile = path.join(cacheDir, 'last_duplicate_scan.json');
      fs.writeFileSync(cacheFile, JSON.stringify({
        activeRootPath: this.activeRootPath || '',
        lastSimilarityThreshold: this.lastSimilarityThreshold,
        lastMatchModes: this.lastMatchModes,
        lastGroups: this.lastGroups,
        lastProcessedFiles: this.lastProcessedFiles
      }));
    } catch {}
  }

  updateSelections(selectionsMap = {}) {
    if (!this.lastGroups || !Array.isArray(this.lastGroups)) return;
    for (const g of this.lastGroups) {
      for (const f of g.files) {
        if (selectionsMap[f.filePath] !== undefined) {
          f.markedForDelete = Boolean(selectionsMap[f.filePath]);
        }
      }
    }
    this.persistSession();
  }

  stopScan(io = null) {
    this.shouldAbort = true;
    this.isScanning = false;
    this.currentProgress = {
      isScanning: false,
      stage: 'idle',
      processed: 0,
      total: 0,
      currentFile: 'Scan cancelled.',
      percent: 0,
      itemsPerSec: '0',
      elapsedSeconds: 0
    };
    workerPool.clearQueue();
    if (io) io.emit('scan:progress', this.currentProgress);
  }

  getProgress() {
    return { ...this.currentProgress, isScanning: this.isScanning };
  }

  async recluster(similarityThreshold = 95, matchModes = ['exact', 'visual']) {
    if (!this.lastProcessedFiles || this.lastProcessedFiles.length === 0) {
      return this.lastGroups || [];
    }
    const numThreshold = Number(similarityThreshold) || 95;
    const groups = await ClusteringService.cluster(
      this.lastProcessedFiles,
      numThreshold,
      matchModes,
      () => false
    );
    this.lastGroups = groups;
    this.lastSimilarityThreshold = numThreshold;
    this.lastMatchModes = matchModes;
    this.persistSession();
    return groups;
  }

  async runScan(options = {}, io = null) {
    let { rootPath, similarityThreshold = 95, matchModes = ['exact', 'visual'] } = options;
    rootPath = (rootPath || '').replace(/^["']+|["']+$/g, '').trim();
    if (!rootPath || !fs.existsSync(rootPath)) {
      throw new Error(`Directory does not exist or is invalid: ${rootPath}`);
    }

    if (this.isScanning) {
      this.stopScan(io);
      await new Promise((r) => setTimeout(r, 100));
    }

    this.isScanning = true;
    this.shouldAbort = false;
    this.activeRootPath = rootPath;
    const startTime = Date.now();

    const emitProgress = (payload) => {
      this.currentProgress = {
        ...this.currentProgress,
        activeRootPath: this.activeRootPath,
        ...payload,
        isScanning: true
      };
      if (io) io.emit('scan:progress', this.currentProgress);
    };

    try {
      emitProgress({ stage: 'discovering', processed: 0, total: 0, currentFile: `Scanning ${path.basename(rootPath)}...`, percent: 0 });

      // 1. Recursive directory traversal with live discovery feedback
      const files = [];
      await this.traverseDirectory(rootPath, files, emitProgress);
      const totalFiles = files.length;

      emitProgress({ stage: 'analyzing', processed: 0, total: totalFiles, currentFile: 'Beginning media analysis...', percent: 0 });

      // 2. High-throughput Bulk DB Cache resolution + Parallel Worker Analysis
      const processedFiles = [];
      let processedCount = 0;
      const CHUNK_SIZE = 500;

      for (let i = 0; i < files.length; i += CHUNK_SIZE) {
        if (this.shouldAbort) break;

        const slice = files.slice(i, i + CHUNK_SIZE);
        const cachedMap = new Map();

        if (mongoose.connection?.readyState === 1) {
          try {
            const paths = slice.map((f) => f.path);
            const docs = await FileCache.find({ filePath: { $in: paths } }).lean();
            for (const doc of docs) {
              cachedMap.set(doc.filePath, doc);
            }
          } catch {}
        }

        const unanalyzed = [];
        for (const file of slice) {
          const cached = cachedMap.get(file.path);
          if (cached && cached.size === file.size && cached.mtimeMs === file.mtimeMs) {
            processedFiles.push(cached);
          } else {
            unanalyzed.push(file);
          }
        }

        if (unanalyzed.length > 0) {
          const analyzedBatch = await Promise.all(
            unanalyzed.map(async (file) => {
              if (this.shouldAbort) return null;
              const analyzed = await this.analyzeFile(file);
              if (analyzed && mongoose.connection?.readyState === 1) {
                try {
                  await FileCache.findOneAndUpdate({ filePath: file.path }, analyzed, { upsert: true });
                } catch {}
              }
              return analyzed;
            })
          );
          for (const item of analyzedBatch) {
            if (item) processedFiles.push(item);
          }
        }

        processedCount += slice.length;
        const elapsed = (Date.now() - startTime) / 1000;
        const itemsPerSec = elapsed > 0 ? (processedCount / elapsed).toFixed(1) : '0';
        emitProgress({
          stage: 'analyzing',
          processed: processedCount,
          total: totalFiles,
          currentFile: path.basename(slice[slice.length - 1].path),
          percent: totalFiles > 0 ? Math.round((processedCount / totalFiles) * 100) : 0,
          itemsPerSec,
          elapsedSeconds: Math.round(elapsed)
        });
      }

      // 3. 4-Tier Non-Blocking Clustering with Live Progress Telemetry
      emitProgress({ stage: 'clustering', currentFile: 'Clustering duplicate groups...', elapsedSeconds: Math.round((Date.now() - startTime) / 1000) });
      const groups = await ClusteringService.cluster(
        processedFiles,
        similarityThreshold,
        matchModes,
        () => this.shouldAbort,
        (clusteringMeta) => {
          emitProgress({
            stage: 'clustering',
            processed: processedCount,
            total: totalFiles,
            currentFile: clusteringMeta.currentFile || 'Clustering duplicate groups...',
            percent: 100,
            itemsPerSec: '0',
            elapsedSeconds: Math.round((Date.now() - startTime) / 1000)
          });
        }
      );
      this.lastGroups = groups;
      this.lastProcessedFiles = processedFiles;
      this.lastSimilarityThreshold = similarityThreshold;
      this.lastMatchModes = matchModes;
      this.persistSession();
      const totalWastedBytes = groups.reduce((acc, g) => acc + g.wastedBytes, 0);

      this.currentProgress = {
        isScanning: false,
        stage: 'complete',
        processed: processedCount,
        total: totalFiles,
        percent: 100,
        itemsPerSec: '0',
        elapsedSeconds: Math.round((Date.now() - startTime) / 1000)
      };

      if (io) {
        io.emit('scan:complete', {
          groupsCount: groups.length,
          totalFilesScanned: processedCount,
          wastedBytes: totalWastedBytes,
          groups
        });
      }

      // Record Scan Session Log in MongoDB
      if (mongoose.connection?.readyState === 1) {
        try {
          const totalScanBytes = processedFiles.reduce((acc, f) => acc + (f.size || 0), 0);
          await OptimizationLog.create({
            originalName: `Scan: ${path.basename(rootPath)} (${groups.length} duplicate groups)`,
            relativePath: rootPath,
            format: 'scan',
            module: 'duplicate_scan',
            status: 'scanned',
            originalSize: totalScanBytes,
            compressedSize: Math.max(0, totalScanBytes - totalWastedBytes),
            bytesSaved: totalWastedBytes,
            percentageSaved: totalScanBytes > 0 ? parseFloat(((totalWastedBytes / totalScanBytes) * 100).toFixed(1)) : 0,
            timeTakenMs: Date.now() - startTime
          });
        } catch (dbErr) {
          console.warn(`[Scan DB Log Warning]: ${dbErr.message}`);
        }
      }

      return { groups, totalWastedBytes, totalFilesScanned: processedCount };
    } finally {
      this.isScanning = false;
      this.shouldAbort = false;
      this.currentProgress.isScanning = false;
    }
  }

  async traverseDirectory(dir, fileList, emitProgress) {
    if (this.shouldAbort) return;
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '_Duplicates_Quarantine') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await this.traverseDirectory(full, fileList, emitProgress);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          const isImg = VALID_IMG.has(ext);
          const isVid = VALID_VID.has(ext);
          const isAud = VALID_AUD.has(ext);
          if (isImg || isVid || isAud) {
            const stat = await fs.promises.stat(full);
            fileList.push({
              path: full,
              size: stat.size,
              mtimeMs: stat.mtimeMs,
              mediaType: isImg ? 'image' : isVid ? 'video' : 'audio'
            });
            if (fileList.length % 150 === 0) {
              emitProgress({ stage: 'discovering', total: fileList.length, currentFile: `Found ${fileList.length} files (${entry.name})` });
            }
          }
        }
      }
    } catch {}
  }

  async analyzeFile(file) {
    try {
      const partialHash = await workerPool.execute('partial_hash', { filePath: file.path, fileSize: file.size });
      let p = { dHash: null, pHash: null, aspectRatio: null, resolution: { width: 0, height: 0 } };
      let v = { duration: 0, keyframesHash: [] };

      if (file.mediaType === 'image') {
        p = await workerPool.execute('perceptual_image', { filePath: file.path });
      } else if (file.mediaType === 'video') {
        const info = await VideoKeyframeService.getVideoInfo(file.path);
        v = { duration: info.duration, keyframesHash: [] };
        p.resolution = { width: info.width, height: info.height };
        const mp = ((info.width || 0) * (info.height || 0)) / 1000000;
        const resScore = Math.min(100, (mp / 8) * 100);
        const bitrate = (file.size / Math.max(1, info.duration)) / 125000;
        const bitrateScore = Math.min(100, (bitrate / 15) * 100);
        p.visualScore = Math.min(100, Math.max(1, Math.round(0.6 * resScore + 0.4 * bitrateScore)));
        p.sharpness = Math.round(bitrateScore);
        p.clarity = info.height >= 1080 ? 'Full HD' : info.height >= 720 ? 'HD' : 'SD';
      }

      return {
        filePath: file.path, size: file.size, mtimeMs: file.mtimeMs, mediaType: file.mediaType,
        partialHash, fullHash: null, dHash: p.dHash, pHash: p.pHash, aspectRatio: p.aspectRatio,
        resolution: p.resolution, duration: v.duration, keyframesHash: v.keyframesHash,
        sharpness: p.sharpness || 0, visualScore: p.visualScore || 0, clarity: p.clarity || 'Normal'
      };
    } catch {
      return null;
    }
  }
}

export const duplicateScanService = new DuplicateScanService();
