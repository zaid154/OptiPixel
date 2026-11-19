import fs from 'fs';
import { exec } from 'child_process';
import os from 'os';
import { FolderBatchService, folderBatchEvents } from '../services/folderBatch/folderBatchService.js';

export class FolderBatchController {
  static async browseDirectory(req, res) {
    try {
      const targetPath = req.query.path || '';
      const result = await FolderBatchService.browseDirectory(targetPath);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async checkDestination(req, res) {
    try {
      const targetPath = req.query.path || '';
      const result = await FolderBatchService.checkDestination(targetPath);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async scanDirectory(req, res) {
    try {
      const { folderPath } = req.body;
      if (!folderPath) {
        return res.status(400).json({ error: 'Folder path is required' });
      }

      const scanResult = await FolderBatchService.scanDirectory(folderPath);
      res.json({
        success: true,
        scanId: scanResult.scanId,
        rootPath: scanResult.rootPath,
        stats: scanResult.stats,
        sampleFiles: scanResult.files.slice(0, 50)
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async startBatch(req, res) {
    try {
      const { scanId, sourceDir, destDir, settings } = req.body;
      const result = await FolderBatchService.startBatch({
        scanId,
        sourceDir,
        destDir,
        settings
      });
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static streamProgress(req, res) {
    const { batchId } = req.params;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendCurrent = () => {
      const state = FolderBatchService.getPublicState(batchId);
      if (state) {
        res.write(`data: ${JSON.stringify(state)}\n\n`);
      }
    };

    sendCurrent();

    const onProgress = (data) => {
      if (data && (!data.batchId || data.batchId === batchId)) {
        sendCurrent();
      }
    };

    const specificEvent = `progress:${batchId}`;
    folderBatchEvents.on(specificEvent, onProgress);
    folderBatchEvents.on('progress', onProgress);

    const heartbeat = setInterval(() => {
      sendCurrent();
    }, 1000);

    req.on('close', () => {
      clearInterval(heartbeat);
      folderBatchEvents.off(specificEvent, onProgress);
      folderBatchEvents.off('progress', onProgress);
    });
  }

  static pauseBatch(req, res) {
    try {
      const result = FolderBatchService.pauseBatch(req.params.batchId);
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static resumeBatch(req, res) {
    try {
      const result = FolderBatchService.resumeBatch(req.params.batchId);
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static cancelBatch(req, res) {
    try {
      const result = FolderBatchService.cancelBatch(req.params.batchId);
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static clearBatch(req, res) {
    try {
      const result = FolderBatchService.clearBatch(req.params.batchId);
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async retryFailed(req, res) {
    try {
      const result = await FolderBatchService.retryFailed(req.params.batchId);
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async copyFallback(req, res) {
    try {
      const result = await FolderBatchService.copyOriginalsFallback(req.params.batchId);
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static getActive(req, res) {
    const activeBatch = FolderBatchService.getActiveOrRecentBatch();
    res.json({ activeBatch });
  }

  static async openFolder(req, res) {
    try {
      const folderPath = (req.body.path || req.query.path || '').trim();
      if (!folderPath || !fs.existsSync(folderPath)) {
        return res.status(400).json({ error: 'Folder does not exist or path is invalid' });
      }

      const platform = os.platform();
      if (platform === 'win32') {
        exec(`explorer "${folderPath.replace(/\//g, '\\')}"`);
      } else if (platform === 'darwin') {
        exec(`open "${folderPath}"`);
      } else {
        exec(`xdg-open "${folderPath}"`);
      }

      return res.json({ success: true, path: folderPath });
    } catch (err) {
      console.error('[FolderBatchController] openFolder error:', err.message);
      return res.status(500).json({ error: err.message || 'Failed to open directory' });
    }
  }
}
