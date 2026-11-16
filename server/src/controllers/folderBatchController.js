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

    const initialState = FolderBatchService.getPublicState(batchId);
    if (initialState) {
      res.write(`data: ${JSON.stringify(initialState)}\n\n`);
    }

    const onProgress = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const eventName = `progress:${batchId}`;
    folderBatchEvents.on(eventName, onProgress);

    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      folderBatchEvents.off(eventName, onProgress);
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
}
