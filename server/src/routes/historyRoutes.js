import express from 'express';
import { HistoryService } from '../services/historyService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const list = await HistoryService.getHistory(req.query.type);
    res.json({ history: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/batch', async (req, res) => {
  try {
    const record = await HistoryService.saveBatchRecord(req.body);
    res.json({ success: true, record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/batch/:batchId/files', async (req, res) => {
  try {
    const files = await HistoryService.getBatchFiles(req.params.batchId);
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/batch/:batchId/export', async (req, res) => {
  try {
    const csv = await HistoryService.generateCsvReport(req.params.batchId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="batch_audit_${req.params.batchId}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(404).send(err.message);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const outcome = await HistoryService.deleteRecord(req.params.id);
    res.json(outcome);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
