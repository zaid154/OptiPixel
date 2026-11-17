import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const VALID_MEDIA = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.heic', '.dng', '.tif', '.tiff',
  '.mp4', '.mov', '.mkv', '.avi', '.3gp', '.mp3', '.opus', '.wav', '.m4a'
]);

export function parseDateFromFilename(fileName) {
  if (!fileName) return null;
  // WhatsApp: IMG-20251106-WA0001, VID-20260412-WA0025, DOC-20260411-WA0018
  const waMatch = /(?:IMG|VID|DOC)[-_](\d{4})(\d{2})(\d{2})[-_]/i.exec(fileName);
  if (waMatch) {
    const [, y, m, d] = waMatch;
    return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  }

  // Camera standard: IMG_20250910_132751, VID20260411224312
  const camMatch = /(?:IMG|VID)[-_]?(\d{4})(\d{2})(\d{2})[-_]?(\d{2})(\d{2})(\d{2})/i.exec(fileName);
  if (camMatch) {
    const [, y, m, d, hh, mm, ss] = camMatch;
    return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), parseInt(hh, 10), parseInt(mm, 10), parseInt(ss, 10));
  }

  // Unix Epoch Timestamp (e.g. 1VideoSpeed1775942060034)
  const epochMatch = /(\d{13})/i.exec(fileName);
  if (epochMatch) {
    const epochMs = parseInt(epochMatch[1], 10);
    if (epochMs > 946684800000 && epochMs < 2524608000000) { // 2000 to 2050
      return new Date(epochMs);
    }
  }

  return null;
}

export async function extractMediaDate(filePath) {
  // Layer 1: Check Filename Date first (immune to modified/download dates)
  const fnDate = parseDateFromFilename(path.basename(filePath));
  if (fnDate && !isNaN(fnDate.getTime())) return { date: fnDate, source: 'filename' };

  // Layer 2: Embedded EXIF metadata for images
  const ext = path.extname(filePath).toLowerCase();
  if (['.jpg', '.jpeg', '.webp', '.tif', '.tiff'].includes(ext)) {
    try {
      const meta = await sharp(filePath).metadata();
      if (meta && meta.exif) {
        // Search EXIF buffer for date format 'YYYY:MM:DD HH:MM:SS'
        const exifStr = meta.exif.toString('binary');
        const match = /(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(exifStr);
        if (match) {
          const [, y, m, d, hh, mm, ss] = match;
          const exifDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), parseInt(hh, 10), parseInt(mm, 10), parseInt(ss, 10));
          if (!isNaN(exifDate.getTime())) return { date: exifDate, source: 'exif' };
        }
      }
    } catch {}
  }

  // Layer 3: File System mtime
  try {
    const st = await fs.promises.stat(filePath);
    return { date: new Date(st.mtimeMs), source: 'mtime' };
  } catch {
    return { date: new Date(), source: 'fallback' };
  }
}

export class LibraryOrganizerService {
  static async scanAndPlan(rootPath, options = {}) {
    if (!rootPath || !fs.existsSync(rootPath)) throw new Error('Valid rootPath required');

    const subfolders = [];
    const allFiles = [];

    async function walk(dir, depth = 0) {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const ent of entries) {
        if (ent.name.startsWith('.') || ent.name === 'node_modules' || ent.name === '_Duplicates_Quarantine') continue;
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          if (depth > 0) subfolders.push(full);
          await walk(full, depth + 1);
        } else if (ent.isFile()) {
          const ext = path.extname(ent.name).toLowerCase();
          if (VALID_MEDIA.has(ext)) {
            allFiles.push({ path: full, name: ent.name, depth, dir });
          }
        }
      }
    }

    await walk(rootPath, 0);

    // Build event folders map
    const eventFolders = subfolders.map((sf) => ({
      path: sf,
      name: path.basename(sf),
      rel: path.relative(rootPath, sf)
    }));

    const plannedMoves = [];

    // Analyze loose files (depth === 0 or transit folders like 'Camera')
    for (const f of allFiles) {
      const isLoose = f.depth === 0 || /camera|dcim|downloads|temp/i.test(path.basename(f.dir));
      if (!isLoose) continue; // Already in organized event subfolder

      const { date, source } = await extractMediaDate(f.path);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthName = monthNames[date.getMonth()];

      // Check if file matches existing event folder by name or date proximity
      let matchedEvent = null;
      for (const ev of eventFolders) {
        const evLower = ev.name.toLowerCase();
        // Specific names like FEA, Mehndi, Farewell, etc.
        if (f.name.toLowerCase().includes(evLower) || evLower.includes(f.name.toLowerCase().slice(0, 5))) {
          matchedEvent = ev;
          break;
        }
      }

      let targetDir = '';
      let targetReason = '';

      if (matchedEvent) {
        targetDir = matchedEvent.path;
        targetReason = `Event Match (${matchedEvent.name})`;
      } else {
        // Timeline Organization: YYYY / MM - MonthName
        targetDir = path.join(rootPath, String(yyyy), `${mm} - ${monthName}`);
        targetReason = `Timeline (${source}: ${yyyy}-${mm})`;
      }

      const destPath = path.join(targetDir, f.name);
      if (destPath.toLowerCase() !== f.path.toLowerCase()) {
        plannedMoves.push({
          sourcePath: f.path,
          destPath,
          fileName: f.name,
          currentFolder: path.basename(f.dir) || 'Root',
          targetFolder: path.basename(targetDir),
          targetDir,
          detectedDate: date.toISOString().split('T')[0],
          reason: targetReason
        });
      }
    }

    return {
      totalFiles: allFiles.length,
      looseFilesCount: plannedMoves.length,
      eventFoldersCount: eventFolders.length,
      plannedMoves: plannedMoves.slice(0, 500), // Preview limit for snappy UI
      allMovesCount: plannedMoves.length
    };
  }

  static async executeMoves(moves = []) {
    const executed = [];
    const errors = [];

    for (const m of moves) {
      try {
        if (!fs.existsSync(m.sourcePath)) continue;
        await fs.promises.mkdir(m.targetDir, { recursive: true });

        let finalDest = m.destPath;
        if (fs.existsSync(finalDest) && finalDest.toLowerCase() !== m.sourcePath.toLowerCase()) {
          const ext = path.extname(m.fileName);
          const base = path.basename(m.fileName, ext);
          finalDest = path.join(m.targetDir, `${base}_${Date.now()}${ext}`);
        }

        await fs.promises.rename(m.sourcePath, finalDest);
        executed.push({ source: m.sourcePath, dest: finalDest });
      } catch (err) {
        errors.push({ file: m.sourcePath, error: err.message });
      }
    }

    return { success: true, movedCount: executed.length, errors };
  }
}
