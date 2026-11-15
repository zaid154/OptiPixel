import express from 'express';
import { FolderBatchService, folderBatchEvents } from '../services/folderBatchService.js';

const router = express.Router();

/**
 * GET /api/batch-folder/browse
 * Directory navigation for visual folder selection
 */
router.get('/browse', async (req, res) => {
  try {
    const targetPath = req.query.path || '';
    const result = await FolderBatchService.browseDirectory(targetPath);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/batch-folder/scan
 * Recursively scans directory and returns files breakdown and time estimates
 */
router.post('/scan', async (req, res) => {
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
      sampleFiles: scanResult.files.slice(0, 50) // Send sample of 50 for quick preview
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/batch-folder/start
 * Initiates the batch optimization process
 */
router.post('/start', async (req, res) => {
  try {
    const { scanId, sourceDir, destDir, settings } = req.body;
    const result = await FolderBatchService.startBatch({
      scanId,
      sourceDir,
      destDir,
      settings
    });
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/batch-folder/progress/:batchId
 * Server-Sent Events (SSE) live progress stream
 */
router.get('/progress/:batchId', (req, res) => {
  const { batchId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial state immediately
  const initialState = FolderBatchService.getPublicState(batchId);
  if (initialState) {
    res.write(`data: ${JSON.stringify(initialState)}\n\n`);
  }

  // Listener for real-time progress
  const onProgress = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const eventName = `progress:${batchId}`;
  folderBatchEvents.on(eventName, onProgress);

  // Keep-alive heartbeat every 15s to prevent proxy/browser timeout
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    folderBatchEvents.off(eventName, onProgress);
  });
});

/**
 * POST /api/batch-folder/pause/:batchId
 */
router.post('/pause/:batchId', (req, res) => {
  try {
    const result = FolderBatchService.pauseBatch(req.params.batchId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/batch-folder/resume/:batchId
 */
router.post('/resume/:batchId', (req, res) => {
  try {
    const result = FolderBatchService.resumeBatch(req.params.batchId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/batch-folder/cancel/:batchId
 */
router.post('/cancel/:batchId', (req, res) => {
  try {
    const result = FolderBatchService.cancelBatch(req.params.batchId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/batch-folder/retry/:batchId
 * 1-Click Retry Failed Files
 */
router.post('/retry/:batchId', async (req, res) => {
  try {
    const result = await FolderBatchService.retryFailed(req.params.batchId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/batch-folder/copy-fallback/:batchId
 * 1-Click Copy Originals for Failed Files
 */
router.post('/copy-fallback/:batchId', async (req, res) => {
  try {
    const result = await FolderBatchService.copyOriginalsFallback(req.params.batchId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/batch-folder/active
 * Re-connects UI on page refresh or tab switch to active/recent batch
 */
router.get('/active', (req, res) => {
  const activeBatch = FolderBatchService.getActiveOrRecentBatch();
  res.json({ activeBatch });
});

export default router;
