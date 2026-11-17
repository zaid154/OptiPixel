import path from 'path';
import { compareDuplicateFiles, compareMediaQuality, evaluateDuplicateGroupWithQualityUpgrade } from './filePriorityHelper.js';

/**
 * Normalizes file paths for reliable cross-platform comparison.
 */
export function normalizePath(p) {
  if (!p) return '';
  return path.resolve(p).replace(/[\\/]+/g, '/').toLowerCase();
}

/**
 * Checks if a target file is located inside the master folder (or subfolder).
 */
export function isInsideMaster(filePath, masterFolder) {
  const normFile = normalizePath(filePath);
  const normMaster = normalizePath(masterFolder);
  return normFile.startsWith(normMaster.endsWith('/') ? normMaster : normMaster + '/');
}

export class FolderPriorityService {
  /**
   * Evaluates a single duplicate group against the Master Folder.
   */
  static evaluateGroup(group, masterFolder, options = {}) {
    const {
      upgradeQuality = true,
      rescueMissing = true,
      cleanExternalDuplicates = true,
    } = options;

    const files = [...group.files];
    const masterFiles = files.filter((f) => isInsideMaster(f.filePath, masterFolder));

    // If masterFolder contains all files (e.g. library root), use intelligent quality & event routing
    if (masterFiles.length === files.length) {
      return evaluateDuplicateGroupWithQualityUpgrade(files, masterFolder);
    }

    // Strict priority sort: Curated Event Folders > Camera Original > Non-transit > Quality > Depth > Oldest
    files.sort((a, b) => compareDuplicateFiles(a, b, masterFolder));
    const externalFiles = files.filter((f) => !isInsideMaster(f.filePath, masterFolder));

    const evaluatedFiles = [];
    let freedBytes = 0;

    if (masterFiles.length > 0) {
      // Case A: Master folder already contains at least one copy
      const bestMaster = masterFiles[0];
      const bestGlobal = files[0];

      if (upgradeQuality && bestGlobal.filePath !== bestMaster.filePath && !isInsideMaster(bestGlobal.filePath, masterFolder)) {
        // Higher quality version exists outside master folder -> UPGRADE
        evaluatedFiles.push({
          ...bestGlobal,
          isOriginal: true,
          markedForDelete: false,
          priorityAction: 'MOVE_UPGRADE',
          targetFolder: masterFolder,
        });

        // The old lower-quality file in master is replaced
        evaluatedFiles.push({
          ...bestMaster,
          isOriginal: false,
          markedForDelete: true,
          priorityAction: 'DELETE',
        });
        freedBytes += bestMaster.size;

        // Clean all other files
        for (const f of files) {
          if (f.filePath === bestGlobal.filePath || f.filePath === bestMaster.filePath) continue;
          evaluatedFiles.push({
            ...f,
            isOriginal: false,
            markedForDelete: cleanExternalDuplicates,
            priorityAction: cleanExternalDuplicates ? 'DELETE' : 'KEEP',
          });
          if (cleanExternalDuplicates) freedBytes += f.size;
        }
      } else {
        // Master copy is either the best or quality upgrade is disabled -> KEEP master
        evaluatedFiles.push({
          ...bestMaster,
          isOriginal: true,
          markedForDelete: false,
          priorityAction: 'KEEP',
        });

        for (const f of files) {
          if (f.filePath === bestMaster.filePath) continue;
          const shouldDelete = isInsideMaster(f.filePath, masterFolder) || cleanExternalDuplicates;
          evaluatedFiles.push({
            ...f,
            isOriginal: false,
            markedForDelete: shouldDelete,
            priorityAction: shouldDelete ? 'DELETE' : 'KEEP',
          });
          if (shouldDelete) freedBytes += f.size;
        }
      }
    } else if (rescueMissing && externalFiles.length > 0) {
      // Case B: No copy exists in master folder -> RESCUE the best copy into master
      const bestExternal = externalFiles[0];
      evaluatedFiles.push({
        ...bestExternal,
        isOriginal: true,
        markedForDelete: false,
        priorityAction: 'RESCUE_MOVE',
        targetFolder: masterFolder,
      });

      for (let i = 1; i < externalFiles.length; i++) {
        evaluatedFiles.push({
          ...externalFiles[i],
          isOriginal: false,
          markedForDelete: cleanExternalDuplicates,
          priorityAction: cleanExternalDuplicates ? 'DELETE' : 'KEEP',
        });
        if (cleanExternalDuplicates) freedBytes += externalFiles[i].size;
      }
    } else {
      // Fallback: Default group behavior
      for (let i = 0; i < files.length; i++) {
        evaluatedFiles.push({
          ...files[i],
          isOriginal: i === 0,
          markedForDelete: i > 0,
          priorityAction: i === 0 ? 'KEEP' : 'DELETE',
        });
        if (i > 0) freedBytes += files[i].size;
      }
    }

    return { evaluatedFiles, freedBytes };
  }

  /**
   * Previews priority consolidation over all duplicate groups.
   */
  static preview(groups, masterFolder, options = {}) {
    let keptCount = 0;
    let upgradedCount = 0;
    let rescuedCount = 0;
    let deletedCount = 0;
    let totalFreedBytes = 0;

    const updatedGroups = groups.map((grp) => {
      const { evaluatedFiles, freedBytes } = this.evaluateGroup(grp, masterFolder, options);
      totalFreedBytes += freedBytes;

      for (const f of evaluatedFiles) {
        if (f.priorityAction === 'KEEP') keptCount++;
        else if (f.priorityAction === 'MOVE_UPGRADE') upgradedCount++;
        else if (f.priorityAction === 'RESCUE_MOVE') rescuedCount++;
        else if (f.priorityAction === 'DELETE') deletedCount++;
      }

      return {
        ...grp,
        files: evaluatedFiles,
      };
    });

    return {
      masterFolder,
      summary: {
        keptCount,
        upgradedCount,
        rescuedCount,
        deletedCount,
        freedBytes: totalFreedBytes,
      },
      groups: updatedGroups,
    };
  }
}
