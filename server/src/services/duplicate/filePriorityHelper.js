import path from 'path';

/**
 * Patterns that indicate transit, dump, temporary, or unorganized backup locations.
 * Files in these directories must NEVER take priority over curated event folders.
 */
export const TRANSIT_FOLDER_PATTERNS = [
  /whatsapp/i,
  /telegram/i,
  /backup/i,
  /new folder/i,
  /untitled folder/i,
  /downloads?/i,
  /temp/i,
  /tmp/i,
  /cache/i,
  /dcim/i,
  /screenshots?/i,
  /transit/i,
  /recycle/i,
  /\.optipixel_quarantine/i,
];

/**
 * Suffixes indicating duplicate copies created by OS or user.
 */
const COPY_REGEX = /( - copy|\((\d+)\)|_copy)/i;

/**
 * Filename prefixes typical of original digital cameras / phones.
 */
const CAMERA_ORIGINAL_PREFIXES = /^(img_|vid_|dsc_|pxl_|dji_|gopr|_dsc|mov_|mvi_)/i;

/**
 * Filename prefixes typical of social media, compressed transfers, or transit.
 */
const TRANSIT_FILENAME_PREFIXES = /^(doc-\d+-wa|snapchat-|wa\d{4}|received_|fb_img|screenshot)/i;

/**
 * Checks if a file path is inside a transit, dump, or backup directory.
 */
export function isTransitPath(filePath) {
  if (!filePath) return false;
  const norm = filePath.replace(/\\/g, '/').toLowerCase();
  return TRANSIT_FOLDER_PATTERNS.some((p) => p.test(norm));
}

/**
 * Computes an absolute priority score for a file.
 * Higher score = Keep as Original.
 * Lower score = Quarantine / Delete duplicate.
 */
export function computeFilePriorityScore(filePath, meta = {}, rootPath = '') {
  if (!filePath) return -999999;
  const norm = filePath.replace(/\\/g, '/');
  const filename = path.basename(norm);
  const dir = path.dirname(norm);
  const dirLower = dir.toLowerCase();

  let score = 0;

  // 1. TRANSIT & BACKUP FOLDER PENALTY (Massive)
  let transitMatches = 0;
  for (const pattern of TRANSIT_FOLDER_PATTERNS) {
    if (pattern.test(dirLower)) {
      transitMatches++;
    }
  }
  if (transitMatches > 0) {
    // -10,000 base penalty per matching pattern
    score -= transitMatches * 10000;
  } else {
    // 2. CURATED EVENT FOLDER BOOST
    // If not transit, check if it's inside an organized subfolder vs root
    const normRoot = (rootPath || '').replace(/\\/g, '/').replace(/\/+$/, '');
    const isRootFile = !dir || (normRoot && dir.toLowerCase() === normRoot.toLowerCase());

    if (isRootFile) {
      // Loose file in root of library
      score -= 2000;
    } else {
      // Curated event folder (e.g. FEA, Sanjay Van, Mehndi, etc.)
      score += 5000;

      // Depth bonus within curated folders (more specific subfolder = more organized)
      const relDir = normRoot && dir.toLowerCase().startsWith(normRoot.toLowerCase())
        ? dir.slice(normRoot.length).replace(/^\/+/, '')
        : dir;
      const depth = relDir.split('/').filter(Boolean).length;
      score += Math.min(depth * 100, 1000);
    }
  }

  // 3. FILENAME QUALITY
  if (COPY_REGEX.test(filename)) {
    score -= 1500; // Explicit copy suffix
  } else if (CAMERA_ORIGINAL_PREFIXES.test(filename)) {
    score += 1000; // Camera original (IMG_, VID_, DSC_)
  } else if (TRANSIT_FILENAME_PREFIXES.test(filename)) {
    score -= 800; // WhatsApp / Snapchat / Transit name
  }

  // 4. RESOLUTION & VISUAL QUALITY
  if (meta.resolution?.width && meta.resolution?.height) {
    const pixels = meta.resolution.width * meta.resolution.height;
    score += Math.min(Math.floor(pixels / 10000), 2000); // Up to +2,000 for higher res
  }
  if (meta.visualScore) {
    score += Math.min(Math.floor(meta.visualScore * 10), 1000); // Up to +1,000 for higher visual score
  }

  // 5. FILE SIZE
  if (meta.size) {
    score += Math.min(Math.floor(meta.size / (1024 * 1024)), 500); // Small size boost (max 500)
  }

  // 6. TIMESTAMP (Older = earlier original)
  if (meta.mtimeMs) {
    // Small tiebreaker: files modified earlier get tiny fractional advantage
    score -= (meta.mtimeMs / 1e15);
  }

  return score;
}

/**
 * Comparator for sorting files in a duplicate group:
 * Best / Original file first (highest score at index 0).
 */
export function compareDuplicateFiles(fileA, fileB, rootPath = '') {
  const scoreA = computeFilePriorityScore(fileA.filePath, fileA, rootPath);
  const scoreB = computeFilePriorityScore(fileB.filePath, fileB, rootPath);

  if (scoreB !== scoreA) {
    return scoreB - scoreA; // Descending: highest score first
  }

  // Absolute tiebreakers:
  // 1. Resolution
  const resA = (fileA.resolution?.width || 0) * (fileA.resolution?.height || 0);
  const resB = (fileB.resolution?.width || 0) * (fileB.resolution?.height || 0);
  if (resB !== resA) return resB - resA;

  // 2. File size
  if ((fileB.size || 0) !== (fileA.size || 0)) {
    return (fileB.size || 0) - (fileA.size || 0);
  }

  // 3. mtime (older first)
  if (fileA.mtimeMs && fileB.mtimeMs) {
    return fileA.mtimeMs - fileB.mtimeMs;
  }

  // 4. Alphabetical stability
  return (fileA.filePath || '').localeCompare(fileB.filePath || '');
}

/**
 * Checks if a file is located in a curated event folder (and NOT in a transit, backup, or root loose location).
 */
export function isCuratedEventFile(filePath, rootPath = '') {
  if (!filePath) return false;
  if (isTransitPath(filePath)) return false;
  const norm = filePath.replace(/\\/g, '/');
  const dir = path.dirname(norm).toLowerCase();
  const normRoot = (rootPath || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  if (!dir || (normRoot && dir === normRoot)) {
    return false; // Root loose file is not a curated event folder
  }
  return true;
}

/**
 * Compares two files purely by media quality (resolution, visual fidelity, file size).
 * Returns > 0 if B has higher quality than A.
 * Returns < 0 if A has higher quality than B.
 * Returns 0 if both are roughly equal quality.
 */
export function compareMediaQuality(fileA, fileB) {
  // 1. Resolution (pixel area)
  const resA = (fileA.resolution?.width || 0) * (fileA.resolution?.height || 0);
  const resB = (fileB.resolution?.width || 0) * (fileB.resolution?.height || 0);
  if (resA > 0 && resB > 0) {
    if (resB > resA * 1.05) return 1; // B has >5% higher resolution
    if (resA > resB * 1.05) return -1; // A has >5% higher resolution
  }

  // 2. Visual score
  const vDiff = (fileB.visualScore || 0) - (fileA.visualScore || 0);
  if (Math.abs(vDiff) >= 5) return vDiff;

  // 3. File size (noticeable difference, >10%)
  const sizeA = fileA.size || 0;
  const sizeB = fileB.size || 0;
  if (sizeA > 0 && sizeB > 0) {
    if (sizeB > sizeA * 1.10) return 1; // B is >10% larger
    if (sizeA > sizeB * 1.10) return -1; // A is >10% larger
  }

  return 0; // Identical or visually equivalent
}

/**
 * Evaluates a duplicate group with intelligent Quality Upgrade:
 * - If an external/transit copy has BETTER QUALITY than the copy in the Event Folder:
 *     => UPGRADE & MOVE the high-quality copy into the Event Folder.
 *     => DELETE/QUARANTINE the low-quality copy inside the Event Folder.
 * - If the Event Folder copy already has EQUAL or BETTER quality:
 *     => KEEP the Event Folder copy untouched.
 *     => DELETE/QUARANTINE the external copy.
 */
export function evaluateDuplicateGroupWithQualityUpgrade(files, rootPath = '') {
  if (!files || files.length === 0) return { evaluatedFiles: [], freedBytes: 0, upgraded: false };
  if (files.length === 1) {
    return {
      evaluatedFiles: [{ ...files[0], isOriginal: true, markedForDelete: false, priorityAction: 'KEEP' }],
      freedBytes: 0,
      upgraded: false,
    };
  }

  // Sort files by pure quality: best quality first
  const qualitySorted = [...files].sort((a, b) => {
    const qDiff = compareMediaQuality(a, b);
    if (qDiff !== 0) return qDiff; // Best quality first
    return compareDuplicateFiles(a, b, rootPath);
  });
  const bestQualityGlobal = qualitySorted[0];

  // Find files that are already inside curated event folders
  const curatedFiles = files
    .filter((f) => isCuratedEventFile(f.filePath, rootPath))
    .sort((a, b) => compareDuplicateFiles(a, b, rootPath));

  const evaluatedFiles = [];
  let freedBytes = 0;
  let upgraded = false;

  if (curatedFiles.length > 0) {
    const currentEventFile = curatedFiles[0];
    const targetEventDir = path.dirname(currentEventFile.filePath);

    // Check if bestQualityGlobal is an external file that has HIGHER quality than the current event file
    const isExternalBest = !isCuratedEventFile(bestQualityGlobal.filePath, rootPath);
    const hasStrictlyHigherQuality = compareMediaQuality(currentEventFile, bestQualityGlobal) > 0;

    if (isExternalBest && hasStrictlyHigherQuality) {
      // RULE: Move the higher-quality file into the Event Folder, and quarantine the inferior event copy!
      upgraded = true;
      evaluatedFiles.push({
        ...bestQualityGlobal,
        isOriginal: true,
        markedForDelete: false,
        priorityAction: 'MOVE_UPGRADE',
        targetFolder: targetEventDir,
      });

      // The old lower-quality file in the event folder is deleted/quarantined
      evaluatedFiles.push({
        ...currentEventFile,
        isOriginal: false,
        markedForDelete: true,
        priorityAction: 'DELETE',
      });
      freedBytes += currentEventFile.size || 0;

      // All other redundant copies are deleted/quarantined
      for (const f of files) {
        if (f.filePath === bestQualityGlobal.filePath || f.filePath === currentEventFile.filePath) continue;
        evaluatedFiles.push({
          ...f,
          isOriginal: false,
          markedForDelete: true,
          priorityAction: 'DELETE',
        });
        freedBytes += f.size || 0;
      }
    } else {
      // Event folder file already has equal or better quality -> KEEP it in event folder
      evaluatedFiles.push({
        ...currentEventFile,
        isOriginal: true,
        markedForDelete: false,
        priorityAction: 'KEEP',
      });

      for (const f of files) {
        if (f.filePath === currentEventFile.filePath) continue;
        evaluatedFiles.push({
          ...f,
          isOriginal: false,
          markedForDelete: true,
          priorityAction: 'DELETE',
        });
        freedBytes += f.size || 0;
      }
    }
  } else {
    // No curated event folders found (all files are in root loose or dump/transit folders)
    // Keep the best quality file in place
    evaluatedFiles.push({
      ...bestQualityGlobal,
      isOriginal: true,
      markedForDelete: false,
      priorityAction: 'KEEP',
    });

    for (let i = 1; i < qualitySorted.length; i++) {
      evaluatedFiles.push({
        ...qualitySorted[i],
        isOriginal: false,
        markedForDelete: true,
        priorityAction: 'DELETE',
      });
      freedBytes += qualitySorted[i].size || 0;
    }
  }

  return { evaluatedFiles, freedBytes, upgraded };
}
