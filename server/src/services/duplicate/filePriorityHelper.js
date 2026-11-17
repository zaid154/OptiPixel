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
