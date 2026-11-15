import express from 'express';
import { duplicateScanService } from '../services/duplicate/duplicateScanService.js';
import { SafeActionService } from '../services/duplicate/safeActionService.js';
import { MediaStreamController } from '../controllers/mediaStreamController.js';
import { RawPixelService } from '../services/duplicate/rawPixelService.js';

const router = express.Router();

// Trigger Scan
router.post('/scan', async (req, res) => {
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
});

// Abort Scan
router.post('/stop', (req, res) => {
  const io = req.app.get('io');
  duplicateScanService.stopScan(io);
  res.json({ status: 'stopped', message: 'Scan cancelled successfully' });
});

// Retrieve Groups & Status
router.get('/groups', (req, res) => {
  const groups = duplicateScanService.lastGroups || [];
  res.json({
    groups,
    isScanning: duplicateScanService.isScanning,
    telemetry: duplicateScanService.getProgress()
  });

  // Background non-blocking warm-up for thumbnails so scrolling is instant
  if (groups.length > 0 && !duplicateScanService.isScanning) {
    MediaStreamController.warmupThumbnails(groups);
  }
});

// Live Progress Snapshot (HTTP Polling)
router.get('/progress', (req, res) => {
  res.json(duplicateScanService.getProgress());
});

// Live Progress Stream (SSE)
router.get('/progress-stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(`data: ${JSON.stringify(duplicateScanService.getProgress())}\n\n`);

  const timer = setInterval(() => {
    res.write(`data: ${JSON.stringify(duplicateScanService.getProgress())}\n\n`);
    if (!duplicateScanService.isScanning) {
      clearInterval(timer);
    }
  }, 350);

  req.on('close', () => clearInterval(timer));
});

// Safe Action (Quarantine, Trash, Permanent)
router.post('/action', async (req, res) => {
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
});

// 1-Click Restore / Undo
router.post('/restore', async (req, res) => {
  const { batchId } = req.body;
  if (!batchId) return res.status(400).json({ error: 'batchId is required' });

  try {
    const outcome = await SafeActionService.restoreBatch(batchId);
    res.json({ success: true, outcome });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// History of Deletions
router.get('/history', async (req, res) => {
  try {
    const history = await SafeActionService.getHistory();
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Media Streaming & Thumbnails
router.get('/thumbnail', MediaStreamController.getThumbnail);
router.get('/stream', MediaStreamController.getMediaStream);

// Pixel Diff Heatmap & Compare
router.get('/pixel-diff', async (req, res) => {
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
});

router.get('/pixel-compare', async (req, res) => {
  const { pathA, pathB } = req.query;
  if (!pathA || !pathB) return res.status(400).json({ error: 'pathA and pathB required' });
  try {
    res.json(await RawPixelService.compareRawPixels(pathA, pathB));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
