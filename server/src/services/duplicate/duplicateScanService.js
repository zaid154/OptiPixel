import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import FileCache from '../../models/FileCache.js';
import { OptimizationLog } from '../../models/OptimizationLog.js';
import { workerPool } from '../../workers/workerPool.js';
import { ClusteringService } from './clusteringService.js';
import { traverseDirectory, analyzeFile } from './directoryCrawler.js';
import { DuplicateCacheHelper } from './duplicateCacheHelper.js';

export class DuplicateScanService {
  constructor() {
    this.isScanning = false;
    this.shouldAbort = false;
    this.activeRootPath = null;
    this.currentProgress = {
      isScanning: false, stage: 'idle', processed: 0, total: 0,
      currentFile: '', percent: 0, itemsPerSec: '0', elapsedSeconds: 0
    };
    this.lastGroups = [];
    this.lastProcessedFiles = [];
    this.lastSimilarityThreshold = 95;
    this.lastMatchModes = ['exact', 'visual'];
    this.sessionCachePath = path.resolve(process.cwd(), '.cache/last_duplicate_session.json');
    this.restoreSession();
  }

  restoreSession() {
    try {
      if (fs.existsSync(this.sessionCachePath)) {
        const data = JSON.parse(fs.readFileSync(this.sessionCachePath, 'utf8'));
        this.activeRootPath = data.activeRootPath || null;
        this.lastSimilarityThreshold = data.lastSimilarityThreshold || 95;
        this.lastMatchModes = data.lastMatchModes || ['exact', 'visual'];
        this.lastGroups = data.lastGroups || [];
        this.lastProcessedFiles = data.lastProcessedFiles || [];
      }
    } catch {}
  }

  persistSession() {
    try {
      const dir = path.dirname(this.sessionCachePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.sessionCachePath, JSON.stringify({
        activeRootPath: this.activeRootPath,
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
      isScanning: false, stage: 'idle', processed: 0, total: 0,
      currentFile: 'Scan cancelled.', percent: 0, itemsPerSec: '0', elapsedSeconds: 0
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
    const groups = await ClusteringService.cluster(this.lastProcessedFiles, numThreshold, matchModes, () => false);
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
    this.lastGroups = [];
    this.lastProcessedFiles = [];
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
      const files = [];
      await traverseDirectory(rootPath, files, emitProgress, () => this.shouldAbort);
      const totalFiles = files.length;

      // 0-SECOND INSTANT SCAN CACHE CHECK
      const cachedGroups = await DuplicateCacheHelper.getCachedScanResult(rootPath, totalFiles, similarityThreshold, matchModes);
      if (cachedGroups && cachedGroups.length > 0) {
        this.lastGroups = cachedGroups;
        this.persistSession();
        const wasted = cachedGroups.reduce((acc, g) => acc + (g.wastedBytes || 0), 0);
        this.currentProgress = {
          isScanning: false, stage: 'complete', processed: totalFiles, total: totalFiles, percent: 100, itemsPerSec: 'Cached', elapsedSeconds: 0
        };
        if (io) {
          io.emit('scan:complete', { groupsCount: cachedGroups.length, totalFilesScanned: totalFiles, wastedBytes: wasted, groups: cachedGroups, cached: true });
        }
        return { groups: cachedGroups, totalWastedBytes: wasted, totalFilesScanned: totalFiles, cached: true };
      }

      emitProgress({ stage: 'analyzing', processed: 0, total: totalFiles, currentFile: 'Beginning media analysis...', percent: 0 });
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
            for (const doc of docs) cachedMap.set(doc.filePath, doc);
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
              const analyzed = await analyzeFile(file);
              if (analyzed && mongoose.connection?.readyState === 1) {
                try {
                  await FileCache.findOneAndUpdate({ filePath: file.path }, analyzed, { upsert: true });
                } catch {}
              }
              return analyzed;
            })
          );
          for (const item of analyzedBatch) if (item) processedFiles.push(item);
        }

        processedCount += slice.length;
        const elapsed = (Date.now() - startTime) / 1000;
        emitProgress({
          stage: 'analyzing', processed: processedCount, total: totalFiles,
          currentFile: path.basename(slice[slice.length - 1].path),
          percent: totalFiles > 0 ? Math.round((processedCount / totalFiles) * 100) : 0,
          itemsPerSec: elapsed > 0 ? (processedCount / elapsed).toFixed(1) : '0',
          elapsedSeconds: Math.round(elapsed)
        });
      }

      emitProgress({ stage: 'clustering', currentFile: 'Clustering duplicate groups...', elapsedSeconds: Math.round((Date.now() - startTime) / 1000) });
      const groups = await ClusteringService.cluster(
        processedFiles,
        similarityThreshold,
        matchModes,
        () => this.shouldAbort,
        (clusteringMeta) => {
          emitProgress({
            stage: 'clustering', processed: processedCount, total: totalFiles,
            currentFile: clusteringMeta.currentFile || 'Clustering duplicate groups...',
            percent: 100, itemsPerSec: '0',
            elapsedSeconds: Math.round((Date.now() - startTime) / 1000)
          });
        },
        (partialGroups, tierName) => {
          if (io && partialGroups && partialGroups.length > 0) {
            this.lastGroups = partialGroups;
            io.emit('scan:partial_groups', { groups: partialGroups, count: partialGroups.length, tier: tierName });
          }
        }
      );

      this.lastGroups = groups;
      this.lastProcessedFiles = processedFiles;
      this.lastSimilarityThreshold = similarityThreshold;
      this.lastMatchModes = matchModes;
      this.persistSession();
      DuplicateCacheHelper.saveScanResult(rootPath, totalFiles, similarityThreshold, matchModes, groups);

      const totalWastedBytes = groups.reduce((acc, g) => acc + (g.wastedBytes || 0), 0);
      this.currentProgress = {
        isScanning: false, stage: 'complete', processed: processedCount,
        total: totalFiles, percent: 100, itemsPerSec: '0',
        elapsedSeconds: Math.round((Date.now() - startTime) / 1000)
      };

      if (io) {
        io.emit('scan:complete', { groupsCount: groups.length, totalFilesScanned: processedCount, wastedBytes: totalWastedBytes, groups });
      }

      if (mongoose.connection?.readyState === 1) {
        try {
          const totalScanBytes = processedFiles.reduce((acc, f) => acc + (f.size || 0), 0);
          await OptimizationLog.create({
            originalName: `Scan: ${path.basename(rootPath)} (${groups.length} duplicate groups)`,
            relativePath: rootPath, format: 'scan', module: 'duplicate_scan', status: 'scanned',
            originalSize: totalScanBytes, compressedSize: Math.max(0, totalScanBytes - totalWastedBytes),
            bytesSaved: totalWastedBytes, percentageSaved: totalScanBytes > 0 ? parseFloat(((totalWastedBytes / totalScanBytes) * 100).toFixed(1)) : 0,
            timeTakenMs: Date.now() - startTime
          });
        } catch {}
      }

      return { groups, totalWastedBytes, totalFilesScanned: processedCount };
    } finally {
      this.isScanning = false;
      this.shouldAbort = false;
      this.currentProgress.isScanning = false;
    }
  }
}

export const duplicateScanService = new DuplicateScanService();
