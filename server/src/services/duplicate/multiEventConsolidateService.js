import path from 'path';
import fs from 'fs';
import { resolveUniquePath } from './consolidateActionService.js';
import { ConsolidationLog } from '../../models/ConsolidationLog.js';
import { duplicateScanService } from './duplicateScanService.js';
import ScanResultCache from '../../models/ScanResultCache.js';
import { withDbRetry } from '../../utils/dbRetryQueue.js';
import { compareDuplicateFiles, isTransitPath, evaluateDuplicateGroupWithQualityUpgrade } from './filePriorityHelper.js';

async function safeMoveFile(src, dest) {
  try { await fs.promises.rename(src, dest); }
  catch (e) {
    if (e.code === 'EXDEV') {
      await fs.promises.copyFile(src, dest);
      await fs.promises.unlink(src);
    } else throw e;
  }
}

function getDirectory(filePath) {
  const norm = filePath.replace(/\\/g, '/');
  const idx = norm.lastIndexOf('/');
  return idx > 0 ? filePath.substring(0, idx) : '';
}

function getFolderDepthScore(filePath, rootPath) {
  if (isTransitPath(filePath)) return -100;
  const dir = getDirectory(filePath).replace(/\\/g, '/').toLowerCase();
  const normRoot = (rootPath || '').replace(/\\/g, '/').toLowerCase();
  if (!dir || dir === normRoot) return 0; // Root file
  const rel = dir.startsWith(normRoot) ? dir.slice(normRoot.length).replace(/^\/+/, '') : dir;
  return Math.max(1, rel.split('/').filter(Boolean).length) * 10;
}

export class MultiEventConsolidateService {
  static evaluateAll(groups, rootPath, options = {}) {
    let keptCount = 0, upgradedCount = 0, rescuedCount = 0, deletedCount = 0, totalFreedBytes = 0;
    const eventBreakdown = new Map();

    const updatedGroups = groups.map((grp) => {
      const { evaluatedFiles, freedBytes } = evaluateDuplicateGroupWithQualityUpgrade(grp.files, rootPath);
      totalFreedBytes += freedBytes;

      let targetDir = '';
      for (const f of evaluatedFiles) {
        if (f.priorityAction === 'KEEP') {
          keptCount++;
          if (!targetDir) targetDir = getDirectory(f.filePath);
        } else if (f.priorityAction === 'MOVE_UPGRADE') {
          upgradedCount++;
          if (!targetDir) targetDir = f.targetFolder;
        } else if (f.priorityAction === 'DELETE') {
          deletedCount++;
        }
      }

      if (targetDir) {
        const evName = path.basename(targetDir) || 'Root';
        eventBreakdown.set(evName, (eventBreakdown.get(evName) || 0) + 1);
      }
      return { ...grp, files: evaluatedFiles };
    });

    return {
      isAutoAll: true,
      masterFolder: rootPath,
      summary: { keptCount, upgradedCount, rescuedCount, deletedCount, freedBytes: totalFreedBytes, discoveredEventsCount: eventBreakdown.size },
      events: Array.from(eventBreakdown.entries()).map(([name, count]) => ({ name, count })),
      groups: updatedGroups,
    };
  }

  static async executeAll(groups, rootPath, options = {}) {
    const preview = this.evaluateAll(groups, rootPath, options);
    const transactionId = `all-${Date.now()}`;
    const quarantineDir = path.join(rootPath, '.optipixel_quarantine', transactionId);
    await fs.promises.mkdir(quarantineDir, { recursive: true });

    const operations = [];
    for (const grp of preview.groups) {
      for (const file of grp.files) {
        if (!fs.existsSync(file.filePath)) continue;

        const folderName = path.basename(path.dirname(file.filePath));
        const ext = path.extname(file.filePath).toLowerCase();
        const mediaType = /\.(mp4|mov|avi|mkv|webm)$/i.test(ext) ? 'video' : 'image';

        if (file.priorityAction === 'MOVE_UPGRADE' && file.targetFolder) {
          const dest = resolveUniquePath(file.targetFolder, path.basename(file.filePath));
          await fs.promises.mkdir(path.dirname(dest), { recursive: true });
          await safeMoveFile(file.filePath, dest);
          operations.push({
            action: 'MOVE_UPGRADE',
            sourcePath: file.filePath,
            targetPath: dest,
            eventFolder: path.basename(file.targetFolder),
            mediaType,
            originalSize: file.size,
            resolution: file.resolution || null,
          });
        } else if (file.priorityAction === 'DELETE') {
          const qDest = resolveUniquePath(quarantineDir, path.basename(file.filePath));
          await safeMoveFile(file.filePath, qDest);
          operations.push({
            action: 'DELETE',
            sourcePath: file.filePath,
            quarantinePath: qDest,
            eventFolder: folderName,
            mediaType,
            originalSize: file.size,
            resolution: file.resolution || null,
          });
        } else if (!file.priorityAction || file.priorityAction === 'KEEP') {
          operations.push({
            action: 'KEEP',
            sourcePath: file.filePath,
            targetPath: file.filePath,
            eventFolder: folderName,
            mediaType,
            originalSize: file.size,
            resolution: file.resolution || null,
          });
        }
      }
    }

    const logEntry = await withDbRetry(
      () => ConsolidationLog.create({
        transactionId, masterFolder: rootPath, status: 'completed', summary: preview.summary, operations
      }),
      '[DB] multiEventConsolidateService ConsolidationLog'
    );

    const processed = new Set(operations.map((o) => o.sourcePath));
    if (duplicateScanService.lastGroups) {
      duplicateScanService.lastGroups = duplicateScanService.lastGroups
        .map((g) => ({ ...g, files: g.files.filter((f) => !processed.has(f.filePath)) }))
        .filter((g) => g.files.length > 1);
    }
    await ScanResultCache.deleteMany({ rootPath: new RegExp(rootPath.replace(/[\\/]/g, '.*'), 'i') }).catch(() => {});

    return { success: true, transactionId, summary: preview.summary, events: preview.events, operations, logId: logEntry._id };
  }
}
