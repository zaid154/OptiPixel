import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function safeMoveFile(src, dest) {
  try { await fs.promises.rename(src, dest); }
  catch (e) {
    if (e.code === 'EXDEV') {
      await fs.promises.copyFile(src, dest);
      await fs.promises.unlink(src);
    } else throw e;
  }
}

const VALID_MEDIA = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.heic', '.dng', '.tif', '.tiff',
  '.mp4', '.mov', '.mkv', '.avi', '.3gp', '.mp3', '.opus', '.wav', '.m4a'
]);

export function parseDateFromFilename(fileName) {
  if (!fileName) return null;

  // 1. WhatsApp formats: IMG, VID, DOC, PTV, PTT (e.g. PTV-20250130-WA0071, IMG-20221105-WA0001)
  const waMatch = /(?:IMG|VID|DOC|PTV|PTT)[-_](\d{4})(\d{2})(\d{2})[-_]/i.exec(fileName);
  if (waMatch) {
    const [, y, m, d] = waMatch;
    const year = parseInt(y, 10);
    const month = parseInt(m, 10);
    const day = parseInt(d, 10);
    if (year >= 1990 && year <= 2035 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    }
  }

  // 2. Camera standard: IMG_20250910_132751, VID20260411224312
  const camMatch = /(?:IMG|VID)[-_]?(\d{4})(\d{2})(\d{2})[-_]?(\d{2})(\d{2})(\d{2})/i.exec(fileName);
  if (camMatch) {
    const [, y, m, d, hh, mm, ss] = camMatch;
    const year = parseInt(y, 10);
    const month = parseInt(m, 10);
    const day = parseInt(d, 10);
    if (year >= 1990 && year <= 2035 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month - 1, day, parseInt(hh, 10), parseInt(mm, 10), parseInt(ss, 10)));
    }
  }

  // 3. Screenshots (e.g. Screenshot_2026_03_17_04_59_11, Screenshot_20260317-112030)
  const ssMatch = /Screenshot[-_](\d{4})[-_]?(\d{2})[-_]?(\d{2})/i.exec(fileName);
  if (ssMatch) {
    const [, y, m, d] = ssMatch;
    const year = parseInt(y, 10);
    const month = parseInt(m, 10);
    const day = parseInt(d, 10);
    if (year >= 1990 && year <= 2035 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    }
  }

  // 4. Recordings (e.g. Record_2026-07-31-20-49-40, Screenrecorder-20260411)
  const recMatch = /(?:Record|Screenrecorder)[-_](\d{4})[-_]?(\d{2})[-_]?(\d{2})/i.exec(fileName);
  if (recMatch) {
    const [, y, m, d] = recMatch;
    const year = parseInt(y, 10);
    const month = parseInt(m, 10);
    const day = parseInt(d, 10);
    if (year >= 1990 && year <= 2035 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    }
  }

  // 5. General ISO date embedded in filename: 2022-11-05 or 20221105
  const genMatch = /(?:^|[^0-9])(20\d{2})[-_]?([01]\d)[-_]?([0-3]\d)(?:[^0-9]|$)/.exec(fileName);
  if (genMatch) {
    const [, y, m, d] = genMatch;
    const year = parseInt(y, 10);
    const month = parseInt(m, 10);
    const day = parseInt(d, 10);
    if (year >= 1990 && year <= 2035 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    }
  }

  // 6. Unix Epoch Timestamp (e.g. 1VideoSpeed1775942060034, Screenrecorder-1748347158806)
  const epochMatch = /(?:^|[^0-9])(1[5-8]\d{11})(?:[^0-9]|$)/.exec(fileName);
  if (epochMatch) {
    const epochMs = parseInt(epochMatch[1], 10);
    if (!isNaN(epochMs)) {
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

  // Layer 3: File System birthtime / mtime (earliest valid date)
  try {
    const st = await fs.promises.stat(filePath);
    const hasBirth = st.birthtimeMs > 946684800000 && !isNaN(st.birthtimeMs);
    const earliestTime = (hasBirth && st.birthtimeMs < st.mtimeMs) ? st.birthtimeMs : st.mtimeMs;
    return { date: new Date(earliestTime), source: hasBirth && earliestTime === st.birthtimeMs ? 'creation' : 'mtime' };
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
        if (ent.name.startsWith('.') || ent.name === 'node_modules' || ent.name === '_Duplicates_Quarantine' || ent.name === '.optipixel_quarantine') continue;
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

    // Build event folders map (exclude transit / media dump folders from being treated as destination event folders)
    const eventFolders = subfolders
      .filter((sf) => !/camera|dcim|downloads|download|temp|videos?|whatsapp|movies?|clips?|recordings?|\.optipixel_quarantine|_Duplicates_Quarantine/i.test(path.basename(sf)))
      .map((sf) => ({
        path: sf,
        name: path.basename(sf),
        rel: path.relative(rootPath, sf)
      }));

    const plannedMoves = [];

    // Analyze loose files (depth === 0 or transit folders like 'Camera', 'Videos', 'WhatsApp')
    for (const f of allFiles) {
      const isLoose = f.depth === 0 || /camera|dcim|downloads|download|temp|videos?|whatsapp\s*(video|animated|audio|media)?|movies?|clips?|recordings?/i.test(path.basename(f.dir));
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
        // Strict Existing Folders Rule: Never create arbitrary YYYY/MM year folders!
        // Files that don't match an existing event folder stay safe in place.
        continue;
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
      allMoves: plannedMoves,                    // Full list for execution
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

        await safeMoveFile(m.sourcePath, finalDest);
        executed.push({ source: m.sourcePath, dest: finalDest });
      } catch (err) {
        errors.push({ file: m.sourcePath, error: err.message });
      }
    }

    return { success: true, movedCount: executed.length, errors };
  }
}
