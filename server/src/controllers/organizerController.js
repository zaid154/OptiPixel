import { LibraryOrganizerService } from '../services/duplicate/libraryOrganizerService.js';
import { duplicateScanService } from '../services/duplicate/duplicateScanService.js';

export class OrganizerController {
  static async planOrganize(req, res) {
    const { rootPath, options } = req.body;
    const targetRoot = rootPath || duplicateScanService.activeRootPath;
    if (!targetRoot) return res.status(400).json({ error: 'rootPath is required' });

    try {
      const plan = await LibraryOrganizerService.scanAndPlan(targetRoot, options);
      res.json({ success: true, ...plan });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async executeOrganize(req, res) {
    const { moves } = req.body;
    if (!Array.isArray(moves) || moves.length === 0) {
      return res.status(400).json({ error: 'moves array is required' });
    }

    try {
      const result = await LibraryOrganizerService.executeMoves(moves);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}
