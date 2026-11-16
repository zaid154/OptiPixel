import { duplicateScanService } from '../services/duplicate/duplicateScanService.js';
import { FolderPriorityService } from '../services/duplicate/folderPriorityService.js';
import { ConsolidateActionService } from '../services/duplicate/consolidateActionService.js';
import { MultiEventConsolidateService } from '../services/duplicate/multiEventConsolidateService.js';
import { ConsolidationLog } from '../models/ConsolidationLog.js';

export class PriorityController {
  static previewPriority(req, res) {
    const { masterFolder, options, groups } = req.body;
    if (!masterFolder) return res.status(400).json({ error: 'masterFolder is required' });

    const targetGroups = groups || duplicateScanService.lastGroups || [];
    try {
      const preview = FolderPriorityService.preview(targetGroups, masterFolder, options);
      res.json({ success: true, ...preview });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static applyPriority(req, res) {
    const { masterFolder, options, groups } = req.body;
    if (!masterFolder) return res.status(400).json({ error: 'masterFolder is required' });

    const targetGroups = groups || duplicateScanService.lastGroups || [];
    try {
      const result = FolderPriorityService.preview(targetGroups, masterFolder, options);
      if (!groups) {
        duplicateScanService.lastGroups = result.groups;
      }
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async executeConsolidation(req, res) {
    const { masterFolder, options, groups } = req.body;
    if (!masterFolder) return res.status(400).json({ error: 'masterFolder is required' });

    const targetGroups = groups || duplicateScanService.lastGroups || [];
    try {
      const outcome = await ConsolidateActionService.execute(targetGroups, masterFolder, options);
      res.json(outcome);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static previewAutoAll(req, res) {
    const { rootPath, options, groups } = req.body;
    const targetGroups = groups || duplicateScanService.lastGroups || [];
    try {
      const preview = MultiEventConsolidateService.evaluateAll(targetGroups, rootPath || duplicateScanService.activeRootPath, options);
      res.json({ success: true, ...preview });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async executeAutoAll(req, res) {
    const { rootPath, options, groups } = req.body;
    const targetGroups = groups || duplicateScanService.lastGroups || [];
    try {
      const outcome = await MultiEventConsolidateService.executeAll(targetGroups, rootPath || duplicateScanService.activeRootPath, options);
      res.json(outcome);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async rollbackConsolidation(req, res) {
    const { transactionId } = req.body;
    if (!transactionId) return res.status(400).json({ error: 'transactionId is required' });

    try {
      const outcome = await ConsolidateActionService.rollback(transactionId);
      res.json(outcome);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getHistory(req, res) {
    try {
      const logs = await ConsolidationLog.find().sort({ createdAt: -1 }).limit(10);
      res.json({ success: true, logs });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}
