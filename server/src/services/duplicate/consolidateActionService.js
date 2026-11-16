import fs from 'fs';
import path from 'path';
import { ConsolidationLog } from '../../models/ConsolidationLog.js';
import { FolderPriorityService } from './folderPriorityService.js';

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

        if (file.priorityAction === 'MOVE_UPGRADE' || file.priorityAction === 'RESCUE_MOVE') {
          const destPath = resolveUniquePath(masterFolder, path.basename(file.filePath));
          await safeMoveFile(file.filePath, destPath);
          operations.push({
            action: file.priorityAction,
            sourcePath: file.filePath,
            targetPath: destPath,
            originalSize: file.size,
          });
        } else if (file.priorityAction === 'DELETE') {
          const qDest = resolveUniquePath(quarantineDir, path.basename(file.filePath));
          await safeMoveFile(file.filePath, qDest);
          operations.push({
            action: 'DELETE',
            sourcePath: file.filePath,
            quarantinePath: qDest,
            originalSize: file.size,
          });
        }
      }
    }

    const logEntry = await ConsolidationLog.create({
      transactionId,
      masterFolder,
      status: 'completed',
      summary: preview.summary,
      operations,
    });

    return {
      success: true,
      transactionId,
      summary: preview.summary,
      logId: logEntry._id,
    };
  }

  static async rollback(transactionId) {
    const log = await ConsolidationLog.findOne({ transactionId });
    if (!log) throw new Error('Consolidation transaction not found.');
    if (log.status === 'rolled_back') throw new Error('Transaction already rolled back.');

    let restoredCount = 0;
    // Reverse operations for atomic rollback
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

    return {
      success: true,
      transactionId,
      restoredCount,
    };
  }
}
