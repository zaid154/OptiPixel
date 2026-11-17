import { LibraryOrganizerService } from '../services/duplicate/libraryOrganizerService.js';
import { duplicateScanService } from '../services/duplicate/duplicateScanService.js';

export class OrganizerController {
  static async planOrganize(req, res) {
    const { rootPath, options } = req.body;
    const targetRoot = rootPath || duplicateScanService.activeRootPath;
    if (!targetRoot) return res.status(400).json({ error: 'rootPath is required' });

    try {
      const plan = await LibraryOrganizerService.scanAndPlan(targetRoot, options);
      // Send preview (500 items) + count, but NOT allMoves (too heavy for preview)
      const { allMoves, ...previewData } = plan;
      res.json({ success: true, ...previewData });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async executeOrganize(req, res) {
    const { rootPath, moves } = req.body;

    try {
      let movesToExecute = moves;
      // If rootPath provided, re-scan to get ALL moves (not just preview 500)
      if (rootPath) {
        const plan = await LibraryOrganizerService.scanAndPlan(rootPath);
        movesToExecute = plan.allMoves || plan.plannedMoves || [];
      }
      if (!Array.isArray(movesToExecute) || movesToExecute.length === 0) {
        return res.status(400).json({ error: 'No files to organize' });
      }
      const result = await LibraryOrganizerService.executeMoves(movesToExecute);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}
