import path from 'path';
import fs from 'fs';
import { resolveUniquePath } from './consolidateActionService.js';
import { ConsolidationLog } from '../../models/ConsolidationLog.js';
import { duplicateScanService } from './duplicateScanService.js';
import ScanResultCache from '../../models/ScanResultCache.js';

const TRANSIT_PATTERNS = [/whatsapp/i, /telegram/i, /downloads/i, /download/i, /temp/i, /cache/i, /dcim/i];

async function safeMoveFile(src, dest) {
  try { await fs.promises.rename(src, dest); }
  catch (e) {
    if (e.code === 'EXDEV') {
      await fs.promises.copyFile(src, dest);
      await fs.promises.unlink(src);
    } else throw e;
  }
}

function isTransitPath(filePath) {
  const norm = filePath.replace(/\\/g, '/').toLowerCase();
  return TRANSIT_PATTERNS.some((p) => p.test(norm));
}

function getDirectory(filePath) {
  const norm = filePath.replace(/\\/g, '/');
  const idx = norm.lastIndexOf('/');
  return idx > 0 ? filePath.substring(0, idx) : '';
}

function getFilenameScore(filePath) {
  const name = path.basename(filePath).toLowerCase();
  if (/( - copy|\((\d+)\)|_copy)/i.test(name)) return -50;
  return 20;
}

function getFolderDepthScore(filePath, rootPath) {
  if (isTransitPath(filePath)) return -20;
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
      const files = [...grp.files].sort((a, b) => {
        const vDiff = (b.visualScore || 0) - (a.visualScore || 0);
        if (Math.abs(vDiff) >= 5) return vDiff;
        const resA = (a.resolution?.width || 0) * (a.resolution?.height || 0);
        const resB = (b.resolution?.width || 0) * (b.resolution?.height || 0);
        if (resB !== resA) return resB - resA;
        const fnDiff = getFilenameScore(b.filePath) - getFilenameScore(a.filePath);
        if (fnDiff !== 0) return fnDiff;
        const depthDiff = getFolderDepthScore(b.filePath, rootPath) - getFolderDepthScore(a.filePath, rootPath);
        if (depthDiff !== 0) return depthDiff;
        return (a.mtimeMs || 0) - (b.mtimeMs || 0);
      });

      const eventFiles = files.filter((f) => getFolderDepthScore(f.filePath, rootPath) > 0);
      const evaluated = [];
      let targetMasterDir = '';

      if (eventFiles.length > 0) {
        targetMasterDir = getDirectory(eventFiles[0].filePath);
        const bestGlobal = files[0];

        const isBestExternal = getFolderDepthScore(bestGlobal.filePath, rootPath) <= 0;
        if (bestGlobal.filePath !== eventFiles[0].filePath && isBestExternal) {
          evaluated.push({ ...bestGlobal, isOriginal: true, markedForDelete: false, priorityAction: 'MOVE_UPGRADE', targetFolder: targetMasterDir });
          upgradedCount++;
          evaluated.push({ ...eventFiles[0], isOriginal: false, markedForDelete: true, priorityAction: 'DELETE' });
          deletedCount++;
          totalFreedBytes += eventFiles[0].size;

          for (let i = 1; i < files.length; i++) {
            if (files[i].filePath === bestGlobal.filePath || files[i].filePath === eventFiles[0].filePath) continue;
            evaluated.push({ ...files[i], isOriginal: false, markedForDelete: true, priorityAction: 'DELETE' });
            deletedCount++;
            totalFreedBytes += files[i].size;
          }
        } else {
          evaluated.push({ ...eventFiles[0], isOriginal: true, markedForDelete: false, priorityAction: 'KEEP' });
          keptCount++;
          for (const f of files) {
            if (f.filePath === eventFiles[0].filePath) continue;
            evaluated.push({ ...f, isOriginal: false, markedForDelete: true, priorityAction: 'DELETE' });
            deletedCount++;
            totalFreedBytes += f.size;
          }
        }
      } else {
        targetMasterDir = getDirectory(files[0].filePath);
        evaluated.push({ ...files[0], isOriginal: true, markedForDelete: false, priorityAction: 'KEEP' });
        keptCount++;
        for (let i = 1; i < files.length; i++) {
          evaluated.push({ ...files[i], isOriginal: false, markedForDelete: true, priorityAction: 'DELETE' });
          deletedCount++;
          totalFreedBytes += files[i].size;
        }
      }

      if (targetMasterDir) {
        const evName = path.basename(targetMasterDir) || 'Root';
        eventBreakdown.set(evName, (eventBreakdown.get(evName) || 0) + 1);
      }
      return { ...grp, files: evaluated };
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

        if (file.priorityAction === 'MOVE_UPGRADE' && file.targetFolder) {
          const dest = resolveUniquePath(file.targetFolder, path.basename(file.filePath));
          await fs.promises.mkdir(path.dirname(dest), { recursive: true });
          await safeMoveFile(file.filePath, dest);
          operations.push({ action: 'MOVE_UPGRADE', sourcePath: file.filePath, targetPath: dest, originalSize: file.size });
        } else if (file.priorityAction === 'DELETE') {
          const qDest = resolveUniquePath(quarantineDir, path.basename(file.filePath));
          await safeMoveFile(file.filePath, qDest);
          operations.push({ action: 'DELETE', sourcePath: file.filePath, quarantinePath: qDest, originalSize: file.size });
        }
      }
    }

    const logEntry = await ConsolidationLog.create({
      transactionId, masterFolder: rootPath, status: 'completed', summary: preview.summary, operations
    });

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
