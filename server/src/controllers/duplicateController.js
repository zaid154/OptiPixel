import fs from 'fs';
import { duplicateScanService } from '../services/duplicate/duplicateScanService.js';
import { SafeActionService } from '../services/duplicate/safeActionService.js';
import { MediaStreamController } from './mediaStreamController.js';
import { RawPixelService } from '../services/duplicate/rawPixelService.js';
import { ConsolidationLog } from '../models/ConsolidationLog.js';
import DeletionLog from '../models/DeletionLog.js';
import ScanResultCache from '../models/ScanResultCache.js';
import { compareDuplicateFiles } from '../services/duplicate/filePriorityHelper.js';

export class DuplicateController {
  static async startScan(req, res) {
    let { rootPath, similarityThreshold, matchModes } = req.body;
    if (!rootPath) return res.status(400).json({ error: 'rootPath is required' });

    const cleanPath = rootPath.replace(/^["']+|["']+$/g, '').trim();
    const io = req.app.get('io');
    try {
      duplicateScanService.runScan({ rootPath: cleanPath, similarityThreshold, matchModes }, io).catch((err) => {
        console.error('Duplicate scan error:', err);
        if (io) io.emit('scan:error', { message: err.message });
      });
      res.json({ status: 'started', message: 'Scan initiated successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static stopScan(req, res) {
    const io = req.app.get('io');
    duplicateScanService.stopScan(io);
    res.json({ status: 'stopped', message: 'Scan cancelled successfully' });
  }

  static async recluster(req, res) {
    const { similarityThreshold, matchModes } = req.body;
    try {
      const groups = await duplicateScanService.recluster(similarityThreshold, matchModes);
      res.json({ success: true, groups, count: groups.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static getGroups(req, res) {
    let groups = duplicateScanService.lastGroups || [];

    // Auto-prune files that have already been quarantined, moved, or deleted on disk
    groups = groups
      .map((g) => ({
        ...g,
        files: g.files.filter((f) => fs.existsSync(f.filePath))
      }))
      .filter((g) => g.files.length > 1);

    if (!duplicateScanService.hasUserSelections) {
      groups = groups.map((g) => ({
        ...g,
        files: g.files.map((f) => ({ ...f, markedForDelete: false }))
      }));
    }
    res.json({
      groups,
      rootPath: duplicateScanService.activeRootPath || '',
      similarityThreshold: duplicateScanService.lastSimilarityThreshold || 95,
      matchModes: duplicateScanService.lastMatchModes || ['exact', 'visual'],
      isScanning: duplicateScanService.isScanning,
      telemetry: duplicateScanService.getProgress()
    });

    if (groups.length > 0 && !duplicateScanService.isScanning) {
      MediaStreamController.warmupThumbnails(groups);
    }
  }

  static clearResults(req, res) {
    try {
      duplicateScanService.clearSession();
      const io = req.app.get('io');
      if (io) io.emit('scan:clear', { success: true });
      res.json({ success: true, message: 'Duplicate results and session cleared' });
    } catch (err) {
      console.error('[DuplicateController] clearResults failed:', err.message);
      res.status(500).json({ error: err.message });
    }
  }

  static updateSelection(req, res) {
    const { selections } = req.body;
    if (selections && typeof selections === 'object') {
      duplicateScanService.updateSelections(selections);
    }
    res.json({ success: true });
  }

  static getProgress(req, res) {
    res.json(duplicateScanService.getProgress());
  }

  static streamProgress(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    res.write(`data: ${JSON.stringify(duplicateScanService.getProgress())}\n\n`);

    const timer = setInterval(() => {
      res.write(`data: ${JSON.stringify(duplicateScanService.getProgress())}\n\n`);
      if (!duplicateScanService.isScanning) {
        clearInterval(timer);
        res.end();
      }
    }, 350);

    req.on('close', () => clearInterval(timer));
  }

  static async takeAction(req, res) {
    const { actionType, fileList, rootDir } = req.body;
    if (!actionType || !Array.isArray(fileList) || fileList.length === 0) {
      return res.status(400).json({ error: 'actionType and non-empty fileList are required' });
    }

    try {
      let outcome;
      if (actionType === 'quarantine') {
        outcome = await SafeActionService.quarantineFiles(fileList, rootDir);
      } else if (actionType === 'trash') {
        outcome = await SafeActionService.moveToTrash(fileList);
      } else if (actionType === 'permanent') {
        outcome = await SafeActionService.permanentDelete(fileList);
      } else {
        return res.status(400).json({ error: `Unsupported actionType: ${actionType}` });
      }
      res.json({ success: true, outcome });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async restore(req, res) {
    const { batchId } = req.body;
    if (!batchId) return res.status(400).json({ error: 'batchId is required' });

    try {
      const outcome = await SafeActionService.restoreBatch(batchId);
      res.json({ success: true, outcome });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getHistory(req, res) {
    try {
      let consolidations = [];
      try {
        consolidations = await ConsolidationLog.find().sort({ createdAt: -1 }).limit(50).lean();
      } catch (cErr) {
        console.warn('ConsolidationLog fetch warning:', cErr.message);
      }

      let deletions = [];
      try {
        deletions = await DeletionLog.find().sort({ deletedAt: -1 }).limit(1000).lean();
      } catch (dErr) {
        deletions = await SafeActionService.getHistory(200);
      }

      res.json({
        success: true,
        consolidations,
        deletions,
        history: deletions, // Backwards compatibility for existing consumers
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getPixelDiff(req, res) {
    const { pathA, pathB } = req.query;
    if (!pathA || !pathB) return res.status(400).send('pathA and pathB required');
    try {
      const png = await RawPixelService.generateDiffHeatmap(pathA, pathB);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(png);
    } catch (err) {
      res.status(500).send(err.message);
    }
  }

  static async getPixelCompare(req, res) {
    const { pathA, pathB } = req.query;
    if (!pathA || !pathB) return res.status(400).json({ error: 'pathA and pathB required' });
    try {
      res.json(await RawPixelService.compareRawPixels(pathA, pathB));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async routeFile(req, res) {
    const { filePath, targetDir } = req.body;
    if (!filePath || !targetDir) return res.status(400).json({ error: 'filePath and targetDir are required' });

    try {
      const fs = await import('fs');
      const path = await import('path');
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Source file does not exist' });
      await fs.promises.mkdir(targetDir, { recursive: true });

      const baseName = path.basename(filePath);
      let destPath = path.join(targetDir, baseName);
      if (fs.existsSync(destPath) && destPath.toLowerCase() !== filePath.toLowerCase()) {
        const ext = path.extname(baseName);
        const nameWithoutExt = path.basename(baseName, ext);
        destPath = path.join(targetDir, `${nameWithoutExt}_routed_${Date.now()}${ext}`);
      }

      try {
        await fs.promises.rename(filePath, destPath);
      } catch (e) {
        if (e.code === 'EXDEV') {
          await fs.promises.copyFile(filePath, destPath);
          await fs.promises.unlink(filePath);
        } else throw e;
      }
      res.json({ success: true, oldPath: filePath, newPath: destPath });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getAuditReport(req, res) {
    try {
      const { transactionId } = req.params;
      const query = transactionId ? { transactionId } : {};
      const log = await ConsolidationLog.findOne(query).sort({ createdAt: -1 }).lean();

      if (!log) {
        return res.status(404).json({ error: 'No consolidation transaction log found' });
      }

      // Fetch list of all transactions for the selector
      const allTransactions = await ConsolidationLog.find({}, {
        transactionId: 1, masterFolder: 1, createdAt: 1, status: 1, summary: 1
      }).sort({ createdAt: -1 }).limit(20).lean();

      // Helper to derive event folder
      const deriveEventFolder = (filePath) => {
        if (!filePath) return 'Root / Loose Files';
        const parts = filePath.replace(/\\+/g, '/').replace(/\/+$/, '').split('/');
        parts.pop(); // remove file name
        const folder = parts.pop() || 'Root';
        if (['memories', 'desktop', 'optipixel'].includes(folder.toLowerCase())) {
          return 'Root / Loose Files';
        }
        return folder;
      };

      // Query scan result cache to reconstruct duplicate groups and find kept originals
      const cache = await ScanResultCache.findOne({ folderPath: log.masterFolder }).sort({ updatedAt: -1 }).lean();
      const fileToGroupMap = new Map();
      if (cache && Array.isArray(cache.groups)) {
        for (const g of cache.groups) {
          const kept = g.files.find((f) => f.isOriginal) || g.files[0];
          for (const f of g.files) {
            fileToGroupMap.set((f.filePath || '').toLowerCase(), { group: g, kept });
          }
        }
      }

      // Enrich existing operations (Quarantined, Upgrades, Kept)
      const enrichedQuarantined = [];
      const keptMap = new Map();

      for (const op of log.operations || []) {
        const fileName = (op.sourcePath || '').split(/[/\\]/).pop();
        const ext = fileName.split('.').pop().toLowerCase();
        const mediaType = op.mediaType || (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext) ? 'video' : 'image');
        const eventFolder = op.eventFolder || deriveEventFolder(op.sourcePath);

        const match = fileToGroupMap.get((op.sourcePath || '').toLowerCase());
        const matchedOriginalPath = op.matchedOriginalPath || match?.kept?.filePath || null;
        const matchedOriginalEvent = matchedOriginalPath ? deriveEventFolder(matchedOriginalPath) : null;
        const groupId = op.groupId || match?.group?.id || null;
        const matchType = op.matchType || match?.group?.matchType || 'Exact SHA-256';

        const enrichedOp = {
          ...op,
          fileName,
          mediaType,
          eventFolder,
          previewPath: op.quarantinePath || op.targetPath || op.sourcePath,
          matchedOriginalPath,
          matchedOriginalEvent,
          groupId,
          matchType,
        };

        enrichedQuarantined.push(enrichedOp);

        // Collect kept originals from matching groups
        if (match?.kept) {
          const keptKey = match.kept.filePath.toLowerCase();
          if (!keptMap.has(keptKey)) {
            const kFileName = match.kept.filePath.split(/[/\\]/).pop();
            const kExt = kFileName.split('.').pop().toLowerCase();
            const kMediaType = match.kept.mediaType || (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(kExt) ? 'video' : 'image');
            const kEventFolder = deriveEventFolder(match.kept.filePath);

            keptMap.set(keptKey, {
              action: 'KEEP',
              sourcePath: match.kept.filePath,
              targetPath: match.kept.filePath,
              fileName: kFileName,
              mediaType: kMediaType,
              eventFolder: kEventFolder,
              originalSize: match.kept.size || 0,
              previewPath: match.kept.filePath,
              groupId: match.group.id,
              matchType: match.group.matchType || 'Exact SHA-256',
              linkedQuarantinedCopies: [],
            });
          }

          const keptRecord = keptMap.get(keptKey);
          if (keptRecord && op.action === 'DELETE') {
            keptRecord.linkedQuarantinedCopies.push({
              sourcePath: op.sourcePath,
              quarantinePath: op.quarantinePath,
              fileName,
              eventFolder,
              size: op.originalSize,
            });
          }
        }
      }

      // If log operations did not contain KEEP operations, append the synthesized kept operations
      const hasKeptInLog = (log.operations || []).some((o) => o.action === 'KEEP');
      const allOperations = hasKeptInLog
        ? enrichedQuarantined
        : [...Array.from(keptMap.values()), ...enrichedQuarantined];

      // Group operations by eventFolder
      const eventMap = new Map();
      for (const op of allOperations) {
        const ev = op.eventFolder || 'General';
        if (!eventMap.has(ev)) {
          eventMap.set(ev, {
            eventName: ev,
            totalFiles: 0,
            keptCount: 0,
            deletedCount: 0,
            upgradedCount: 0,
            freedBytes: 0,
            files: [],
          });
        }
        const st = eventMap.get(ev);
        st.totalFiles++;
        if (op.action === 'KEEP') {
          st.keptCount++;
        } else if (op.action === 'DELETE') {
          st.deletedCount++;
          st.freedBytes += (op.originalSize || 0);
        } else if (op.action === 'MOVE_UPGRADE' || op.action === 'RESCUE_MOVE') {
          st.upgradedCount++;
        }
        st.files.push(op);
      }

      const events = Array.from(eventMap.values()).sort((a, b) => b.totalFiles - a.totalFiles);

      res.json({
        success: true,
        transactionId: log.transactionId,
        masterFolder: log.masterFolder,
        status: log.status,
        createdAt: log.createdAt,
        summary: {
          ...log.summary,
          totalOperations: allOperations.length,
          keptCount: keptMap.size || log.summary?.keptCount || 0,
          deletedCount: enrichedQuarantined.filter((o) => o.action === 'DELETE').length,
        },
        events,
        operations: allOperations,
        allTransactions,
      });
    } catch (err) {
      console.error('[getAuditReport error]:', err.message);
      res.status(500).json({ error: err.message });
    }
  }
}
