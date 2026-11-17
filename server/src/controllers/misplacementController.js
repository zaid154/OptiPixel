import { MisplacementDetectorService } from '../services/duplicate/misplacementDetectorService.js';

export class MisplacementController {
  static async scan(req, res) {
    try {
      const folderPath = req.body.folderPath || req.body.rootPath;
      if (!folderPath) return res.status(400).json({ error: 'folderPath or rootPath required' });

      const result = await MisplacementDetectorService.scan(folderPath);
      res.json(result);
    } catch (err) {
      console.error('[MisplacementController] scan error:', err.message);
      res.status(500).json({ error: err.message });
    }
  }

  static async confirmMove(req, res) {
    try {
      const { filePath, destFolder } = req.body;
      if (!filePath || !destFolder) return res.status(400).json({ error: 'filePath and destFolder required' });

      const result = await MisplacementDetectorService.confirmMove(filePath, destFolder);
      res.json(result);
    } catch (err) {
      console.error('[MisplacementController] confirmMove error:', err.message);
      res.status(500).json({ error: err.message });
    }
  }

  static async rejectFlag(req, res) {
    try {
      const { filePath } = req.body;
      if (!filePath) return res.status(400).json({ error: 'filePath required' });

      const result = await MisplacementDetectorService.rejectFlag(filePath);
      res.json(result);
    } catch (err) {
      console.error('[MisplacementController] rejectFlag error:', err.message);
      res.status(500).json({ error: err.message });
    }
  }
}
