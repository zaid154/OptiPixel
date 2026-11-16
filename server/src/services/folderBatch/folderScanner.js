import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tiff', '.tif', '.bmp', '.gif']);
export const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.mkv', '.avi', '.webm', '.m4v', '.3gp', '.flv', '.wmv', '.mts', '.m2ts']);

export const IGNORE_FOLDERS = new Set([
  '$recycle.bin',
  'system volume information',
  'node_modules',
  '.git',
  '.vscode',
  '.idea',
  'thumbs.db',
  'desktop.ini'
]);

export function formatDuration(sec) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}m ${s > 0 ? s + 's' : ''}`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return `${h}h ${remM}m`;
}

export async function browseDirectory(targetPath = '') {
  const cleanTarget = (targetPath || '').trim().replace(/^["']|["']$/g, '');
  if (!cleanTarget || cleanTarget === '/' || cleanTarget === '\\') {
    const drives = [];
    for (const letter of ['C', 'D', 'E', 'F', 'G']) {
      const drivePath = `${letter}:\\`;
      try {
        if (fs.existsSync(drivePath)) {
          drives.push({ name: `${letter}: Drive`, path: drivePath, isDir: true, isDrive: true });
        }
      } catch (e) {}
    }
    return { currentPath: '', entries: drives };
  }

  const normalized = path.resolve(cleanTarget);
  if (!fs.existsSync(normalized)) {
    throw new Error(`Directory does not exist: ${targetPath}`);
  }

  const dirents = await fs.promises.readdir(normalized, { withFileTypes: true });
  const entries = [];

  for (const d of dirents) {
    if (IGNORE_FOLDERS.has(d.name.toLowerCase())) continue;
    if (d.name.startsWith('$') || d.name.startsWith('.')) continue;

    if (d.isDirectory()) {
      entries.push({
        name: d.name,
        path: path.join(normalized, d.name),
        isDir: true
      });
    }
  }

  entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  const parentPath = path.dirname(normalized) !== normalized ? path.dirname(normalized) : '';

  return { currentPath: normalized, parentPath, entries };
}

export async function scanDirectory(folderPath) {
  if (!folderPath) throw new Error('Source folder path is required');
  const cleanPath = folderPath.trim().replace(/^["']|["']$/g, '');
  const normalized = path.resolve(cleanPath);

  if (!fs.existsSync(normalized)) throw new Error(`Directory not found: "${folderPath}"`);
  const stat = await fs.promises.stat(normalized);
  if (!stat.isDirectory()) throw new Error(`Path is not a directory: "${folderPath}"`);

  const scanId = crypto.randomUUID();
  const files = [];
  let subfolderCount = 0;
  let maxDepth = 0;
  let totalBytes = 0;
  let imageCount = 0;
  let imageBytes = 0;
  let videoCount = 0;
  let videoBytes = 0;
  let otherCount = 0;
  let otherBytes = 0;

  const queue = [{ dir: normalized, depth: 0 }];

  while (queue.length > 0) {
    const { dir, depth } = queue.shift();
    if (depth > maxDepth) maxDepth = depth;

    let dirents;
    try {
      dirents = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch (err) {
      continue;
    }

    for (const dirent of dirents) {
      const name = dirent.name;
      if (IGNORE_FOLDERS.has(name.toLowerCase())) continue;
      if (name.startsWith('$') || name === 'Thumbs.db' || name === '.DS_Store') continue;

      const fullPath = path.join(dir, name);
      const relativePath = path.relative(normalized, fullPath);

      if (dirent.isDirectory()) {
        if (dir !== normalized && /_Optimized(\s*\(\d+\))?$/i.test(name)) {
          continue;
        }
        subfolderCount++;
        queue.push({ dir: fullPath, depth: depth + 1 });
      } else if (dirent.isFile()) {
        try {
          const fileStat = await fs.promises.stat(fullPath);
          const size = fileStat.size;
          const ext = path.extname(name).toLowerCase();

          let type = 'other';
          if (IMAGE_EXTENSIONS.has(ext)) {
            type = 'image';
            imageCount++;
            imageBytes += size;
          } else if (VIDEO_EXTENSIONS.has(ext)) {
            type = 'video';
            videoCount++;
            videoBytes += size;
          } else {
            otherCount++;
            otherBytes += size;
          }

          totalBytes += size;
          files.push({ fullPath, relativePath, name, ext, size, type });
        } catch (e) {}
      }
    }
  }

  const imageTimeSec = Math.ceil(imageCount / 80);
  const videoTimeSec = Math.ceil(videoCount * 2);
  const otherTimeSec = Math.ceil(otherCount / 500);
  const estimatedTotalSec = Math.max(1, imageTimeSec + videoTimeSec + otherTimeSec);

  return {
    scanId,
    rootPath: normalized,
    scannedAt: new Date().toISOString(),
    stats: {
      totalFiles: files.length,
      totalBytes,
      totalSizeMB: parseFloat((totalBytes / (1024 * 1024)).toFixed(2)),
      totalSizeGB: parseFloat((totalBytes / (1024 * 1024 * 1024)).toFixed(2)),
      images: {
        count: imageCount,
        bytes: imageBytes,
        sizeMB: parseFloat((imageBytes / (1024 * 1024)).toFixed(2)),
        sizeGB: parseFloat((imageBytes / (1024 * 1024 * 1024)).toFixed(2)),
        estimatedSec: imageTimeSec
      },
      videos: {
        count: videoCount,
        bytes: videoBytes,
        sizeMB: parseFloat((videoBytes / (1024 * 1024)).toFixed(2)),
        sizeGB: parseFloat((videoBytes / (1024 * 1024 * 1024)).toFixed(2)),
        estimatedSec: videoTimeSec
      },
      others: {
        count: otherCount,
        bytes: otherBytes,
        sizeMB: parseFloat((otherBytes / (1024 * 1024)).toFixed(2))
      },
      subfolderCount,
      maxDepth,
      estimatedTotalSec,
      estimatedFormatted: formatDuration(estimatedTotalSec)
    },
    files
  };
}

export async function checkDestinationPath(destPath = '') {
  const clean = (destPath || '').trim().replace(/^["']|["']$/g, '');
  if (!clean) return { exists: false, itemCount: 0, isEmpty: true, suggestedNewPath: clean };
  const normalized = path.resolve(clean);
  if (!fs.existsSync(normalized)) {
    return { exists: false, itemCount: 0, isEmpty: true, suggestedNewPath: normalized };
  }
  try {
    const dirents = await fs.promises.readdir(normalized);
    const itemCount = dirents.length;
    let counter = 1;
    let suggested = `${normalized} (${counter})`;
    while (fs.existsSync(suggested)) {
      counter++;
      suggested = `${normalized} (${counter})`;
    }
    return {
      exists: true,
      itemCount,
      isEmpty: itemCount === 0,
      suggestedNewPath: suggested,
      suggestedSuffix: `(${counter})`
    };
  } catch {
    return { exists: true, itemCount: 0, isEmpty: false, suggestedNewPath: `${normalized} (1)` };
  }
}
