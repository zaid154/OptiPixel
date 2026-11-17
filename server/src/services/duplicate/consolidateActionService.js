import fs from 'fs';
import path from 'path';
import { ConsolidationLog } from '../../models/ConsolidationLog.js';
import { FolderPriorityService } from './folderPriorityService.js';
import { duplicateScanService } from './duplicateScanService.js';
import ScanResultCache from '../../models/ScanResultCache.js';
import { withDbRetry } from '../../utils/dbRetryQueue.js';

async function safeMoveFile(src, dest) {
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  try {
    await fs.promises.rename(src, dest);
  } catch (err) {
    if (err.code === 'EXDEV') {
      await fs.promises.copyFile(src, dest);
      await fs.promises.unlink(src);
    } else {
      throw err;
    }
  }
}

export function resolveUniquePath(targetDir, filename) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  let dest = path.join(targetDir, filename);
  let counter = 1;

  while (fs.existsSync(dest)) {
    dest = path.join(targetDir, `${base} (${counter})${ext}`);
    counter++;
  }
  return dest;
}

export class ConsolidateActionService {
  static async execute(groups, masterFolder, options = {}) {
    const preview = FolderPriorityService.preview(groups, masterFolder, options);
    const transactionId = `con-${Date.now()}`;
    const quarantineDir = path.join(masterFolder, '.optipixel_quarantine', transactionId);
    await fs.promises.mkdir(quarantineDir, { recursive: true });

    const operations = [];

    for (const grp of preview.groups) {
      for (const file of grp.files) {
        if (!fs.existsSync(file.filePath)) continue;

        const folderName = path.basename(path.dirname(file.filePath));
        const ext = path.extname(file.filePath).toLowerCase();
        const mediaType = /\.(mp4|mov|avi|mkv|webm)$/i.test(ext) ? 'video' : 'image';

        if (file.priorityAction === 'MOVE_UPGRADE' || file.priorityAction === 'RESCUE_MOVE') {
          const destPath = resolveUniquePath(masterFolder, path.basename(file.filePath));
          await safeMoveFile(file.filePath, destPath);
          operations.push({
            action: file.priorityAction,
            sourcePath: file.filePath,
            targetPath: destPath,
            eventFolder: path.basename(masterFolder),
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
        transactionId,
        masterFolder,
        status: 'completed',
        summary: preview.summary,
        operations,
      }),
      '[DB] consolidateActionService ConsolidationLog'
    );

    const processed = new Set(operations.map((o) => o.sourcePath));
    if (duplicateScanService.lastGroups) {
      duplicateScanService.lastGroups = duplicateScanService.lastGroups
        .map((g) => ({
          ...g,
          files: g.files.filter((f) => !processed.has(f.filePath)),
        }))
        .filter((g) => g.files.length > 1);
    }
    await ScanResultCache.deleteMany({ rootPath: new RegExp(masterFolder.replace(/[\\/]/g, '.*'), 'i') }).catch(() => {});

    return {
      success: true,
      transactionId,
      summary: preview.summary,
      operations,
      logId: logEntry._id,
    };
  }

  static async rollback(transactionId) {
    const log = await ConsolidationLog.findOne({ transactionId });
    if (!log) throw new Error('Consolidation transaction not found.');
    if (log.status === 'rolled_back') throw new Error('Transaction already rolled back.');

    let restoredCount = 0;
    const ops = [...log.operations].reverse();

    for (const op of ops) {
      try {
        if (op.action === 'DELETE' && op.quarantinePath && fs.existsSync(op.quarantinePath)) {
          await safeMoveFile(op.quarantinePath, op.sourcePath);
          restoredCount++;
        } else if ((op.action === 'MOVE_UPGRADE' || op.action === 'RESCUE_MOVE') && op.targetPath && fs.existsSync(op.targetPath)) {
          await safeMoveFile(op.targetPath, op.sourcePath);
          restoredCount++;
        }
      } catch (err) {
        console.error(`Rollback error on file ${op.sourcePath}:`, err.message);
      }
    }

    log.status = 'rolled_back';
    await log.save();
    await ScanResultCache.deleteMany({ rootPath: new RegExp(log.masterFolder.replace(/[\\/]/g, '.*'), 'i') }).catch(() => {});

    return {
      success: true,
      transactionId,
      restoredCount,
    };
  }
}
