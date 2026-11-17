import { duplicateScanService } from '../services/duplicate/duplicateScanService.js';
import { SafeActionService } from '../services/duplicate/safeActionService.js';
import { MediaStreamController } from './mediaStreamController.js';
import { RawPixelService } from '../services/duplicate/rawPixelService.js';

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
    const groups = duplicateScanService.lastGroups || [];
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
      const history = await SafeActionService.getHistory();
      res.json({ history });
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
}
