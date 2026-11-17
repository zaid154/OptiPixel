import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { extractMediaDate, parseDateFromFilename } from './libraryOrganizerService.js';
import { MisplacementRule } from '../../models/MisplacementRule.js';

const VALID_MEDIA = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.heic', '.dng', '.tif', '.tiff',
  '.mp4', '.mov', '.mkv', '.avi', '.3gp'
]);

const TRANSIT_RE = /^(camera|dcim|downloads?|temp|videos?|whatsapp|movies?|clips?|recordings?|screenshots?|chats?|google\s*drive|old\s*pics|send|\.optipixel_quarantine|_Duplicates_Quarantine)$/i;

const BROAD_CATEGORY_RE = /^(school|college|office|tuition|work|standard|chats|old\s*pics)$/i;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MIN_EVENT_BUFFER_MS = 7 * ONE_DAY_MS; // 7 days grace period for WhatsApp forwards

// ─── Helpers ───────────────────────────────────────────────

function isEventFolder(folderName) {
  return !TRANSIT_RE.test(folderName);
}

function getMediaType(ext) {
  if (['.mp4', '.mov', '.mkv', '.avi', '.3gp'].includes(ext)) return 'video';
  return 'image';
}

function percentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0;
  const idx = Math.floor(sortedArr.length * p);
  return sortedArr[Math.min(idx, sortedArr.length - 1)];
}

function extractBatchKey(fileName) {
  // WhatsApp: DOC-20260424-WA0011.mp4 → "WA-20260424"
  const waMatch = /(?:IMG|VID|DOC)[-_](\d{8})[-_]WA/i.exec(fileName);
  if (waMatch) return `WA-${waMatch[1]}`;

  // Camera: IMG20260729105152.jpg → "CAM-20260729"
  const camMatch = /(?:IMG|VID)[-_]?(\d{8})/i.exec(fileName);
  if (camMatch) return `CAM-${camMatch[1]}`;

  // Snapchat: Snapchat-1251885872.mp4 → "SNAP"
  if (/^Snapchat[-_]/i.test(fileName)) return 'SNAP';

  return null;
}

function formatDate(d) {
  if (!d || isNaN(d.getTime())) return 'unknown';
  return d.toISOString().split('T')[0];
}

function getVideoCreationTime(filePath) {
  return new Promise((resolve) => {
    const args = ['-v', 'quiet', '-print_format', 'json', '-show_format', filePath];
    const proc = spawn('ffprobe', args);
    let out = '';
    const timer = setTimeout(() => { try { proc.kill(); } catch {} resolve(null); }, 5000);
    proc.stdout.on('data', (d) => (out += d.toString()));
    proc.on('close', () => {
      clearTimeout(timer);
      try {
        const json = JSON.parse(out);
        const ct = json?.format?.tags?.creation_time;
        if (ct) return resolve(new Date(ct));
      } catch {}
      resolve(null);
    });
    proc.on('error', () => { clearTimeout(timer); resolve(null); });
  });
}

// ─── Core Service ──────────────────────────────────────────

export class MisplacementDetectorService {

  /**
   * Walk rootPath and collect files grouped by event folder.
   * Returns Map<folderPath, FileInfo[]>
   */
  static async _collectEventFolders(rootPath) {
    const folderMap = new Map(); // folderPath → fileInfo[]

    async function walk(dir) {
      let entries;
      try { entries = await fs.promises.readdir(dir, { withFileTypes: true }); }
      catch { return; }
      for (const ent of entries) {
        if (ent.name.startsWith('.') || ent.name === 'node_modules') continue;
        if (TRANSIT_RE.test(ent.name)) continue;
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          await walk(full);
        } else if (ent.isFile()) {
          const ext = path.extname(ent.name).toLowerCase();
          if (!VALID_MEDIA.has(ext)) continue;
          // This file is inside an event folder (not root)
          const relToRoot = path.relative(rootPath, dir);
          if (!relToRoot) continue; // Skip root-level loose files
          // Find the top-level event folder for grouping
          const topFolder = relToRoot.split(path.sep)[0];
          if (!isEventFolder(topFolder)) continue;

          const folderPath = dir;
          if (!folderMap.has(folderPath)) folderMap.set(folderPath, []);
          
          let stat;
          try { stat = await fs.promises.stat(full); } catch { continue; }

          const { date, source } = await extractMediaDate(full);
          folderMap.get(folderPath).push({
            filePath: full,
            fileName: ent.name,
            date,
            dateSource: source,
            size: stat.size,
            mediaType: getMediaType(ext),
            folderPath,
            folderName: path.basename(folderPath),
          });
        }
      }
    }

    await walk(rootPath);
    return folderMap;
  }

  /**
   * Signal 1: Date Outlier Detection
   * For each event folder, calculate the core date window and flag outliers.
   */
  static _detectDateOutliers(folderMap, flags, allFolderWindows) {
    for (const [folderPath, files] of folderMap) {
      if (files.length < 4) continue; // Too few files to detect outliers

      const folderName = path.basename(folderPath);
      // Skip broad ongoing albums (like "School", "College") from strict date outlier checks
      if (BROAD_CATEGORY_RE.test(folderName)) continue;

      const timestamps = files.map((f) => f.date.getTime()).filter((t) => t > 0).sort((a, b) => a - b);
      if (timestamps.length < 4) continue;

      const q1 = percentile(timestamps, 0.25);
      const q3 = percentile(timestamps, 0.75);
      const iqr = q3 - q1;
      // Standard Tukey's IQR outlier threshold with minimum 7 days grace for WhatsApp delayed shares
      const buffer = Math.max(MIN_EVENT_BUFFER_MS, 1.5 * iqr);
      const windowStart = q1 - buffer;
      const windowEnd = q3 + buffer;

      allFolderWindows.set(folderPath, {
        name: path.basename(folderPath),
        q1: new Date(q1),
        q3: new Date(q3),
        windowStart: new Date(windowStart),
        windowEnd: new Date(windowEnd),
        fileCount: files.length,
      });

      for (const f of files) {
        const ts = f.date.getTime();
        if (ts < windowStart || ts > windowEnd) {
          if (!flags.has(f.filePath)) {
            flags.set(f.filePath, { ...f, signals: [], suggestedFolder: null, suggestedFolderName: null });
          }
          const daysDiff = ts < windowStart
            ? Math.round((windowStart - ts) / (24 * 60 * 60 * 1000))
            : Math.round((ts - windowEnd) / (24 * 60 * 60 * 1000));
          const coreDateRange = `${formatDate(new Date(q1))} to ${formatDate(new Date(q3))}`;
          flags.get(f.filePath).signals.push({
            type: 'date_outlier',
            confidence: Math.min(95, 50 + daysDiff * 5),
            details: `File date ${formatDate(f.date)} is ${daysDiff} day(s) outside folder's core range (${coreDateRange})`,
          });
        }
      }
    }
  }

  /**
   * Signal 2: Filename Batch Consistency
   * Files sharing a batch key (e.g., WA-20260424) should mostly be in the same folder.
   */
  static _detectFilenameBatchOutliers(folderMap, flags) {
    // Build batch → [{file, folderPath}]
    const batches = new Map();

    for (const [folderPath, files] of folderMap) {
      for (const f of files) {
        let batchKey = extractBatchKey(f.fileName);
        if (!batchKey) continue;

        // For SNAP files, group by date since filenames are random
        if (batchKey === 'SNAP') {
          batchKey = `SNAP-${formatDate(f.date)}`;
        }

        if (!batches.has(batchKey)) batches.set(batchKey, []);
        batches.get(batchKey).push({ file: f, folderPath });
      }
    }

    for (const [batchKey, entries] of batches) {
      if (entries.length < 3) continue; // Need minimum batch size

      // Count files per folder
      const folderCounts = new Map();
      for (const e of entries) {
        folderCounts.set(e.folderPath, (folderCounts.get(e.folderPath) || 0) + 1);
      }

      if (folderCounts.size < 2) continue; // All in one folder, no inconsistency

      // Find majority folder
      let maxCount = 0, majorityFolder = '';
      for (const [fp, count] of folderCounts) {
        if (count > maxCount) { maxCount = count; majorityFolder = fp; }
      }

      const totalInBatch = entries.length;
      const majorityPct = (maxCount / totalInBatch) * 100;
      if (majorityPct < 50) continue; // No clear majority

      // Flag minority files
      for (const e of entries) {
        if (e.folderPath === majorityFolder) continue;
        const f = e.file;
        const minorityCount = folderCounts.get(e.folderPath);
        
        if (!flags.has(f.filePath)) {
          flags.set(f.filePath, { ...f, signals: [], suggestedFolder: null, suggestedFolderName: null });
        }

        const flagData = flags.get(f.filePath);
        flagData.signals.push({
          type: 'filename_batch',
          confidence: Math.min(90, Math.round(majorityPct)),
          details: `Batch "${batchKey}": ${maxCount}/${totalInBatch} files are in ${path.basename(majorityFolder)}, but this file is in ${f.folderName} (${minorityCount} files)`,
        });

        // Set suggestion to majority folder
        if (!flagData.suggestedFolder) {
          flagData.suggestedFolder = majorityFolder;
          flagData.suggestedFolderName = path.basename(majorityFolder);
        }
      }
    }
  }

  /**
   * Signal 4: Source Metadata (video creation_time cross-check)
   * Only run on flagged video files to find better suggestions.
   */
  static async _enrichWithSourceMetadata(flags) {
    const videoFlags = [...flags.values()].filter((f) => f.mediaType === 'video' && f.signals.length > 0);

    for (const f of videoFlags) {
      const creationTime = await getVideoCreationTime(f.filePath);
      if (!creationTime) continue;

      const fileDateTs = f.date.getTime();
      const creationTs = creationTime.getTime();
      const diff = Math.abs(fileDateTs - creationTs);

      // If creation_time differs significantly from file date, note it
      if (diff > 24 * 60 * 60 * 1000) {
        const flagData = flags.get(f.filePath);
        flagData.signals.push({
          type: 'source_metadata',
          confidence: 60,
          details: `Video creation metadata date ${formatDate(creationTime)} differs from file date ${formatDate(f.date)}`,
        });
      }
    }
  }

  /**
   * Signal 5: Apply learned rules from past user corrections.
   */
  static async _applyLearnedRules(folderMap, flags) {
    let rules;
    try { rules = await MisplacementRule.find().lean(); }
    catch { return; }
    if (!rules || rules.length === 0) return;

    for (const [folderPath, files] of folderMap) {
      for (const f of files) {
        for (const rule of rules) {
          let matched = false;

          if (rule.ruleType === 'exact' && f.fileName === rule.filePattern) {
            matched = true;
          } else if (rule.ruleType === 'pattern') {
            try {
              const re = new RegExp(rule.filePattern, 'i');
              if (re.test(f.fileName)) matched = true;
            } catch {}
          }

          if (matched && folderPath.toLowerCase().includes(rule.sourceFolder.toLowerCase())) {
            if (!flags.has(f.filePath)) {
              flags.set(f.filePath, { ...f, signals: [], suggestedFolder: null, suggestedFolderName: null });
            }
            const flagData = flags.get(f.filePath);
            flagData.signals.push({
              type: 'learned_rule',
              confidence: rule.confidence || 95,
              details: `Learned rule: files matching "${rule.filePattern}" in ${path.basename(rule.sourceFolder)} should be in ${path.basename(rule.correctFolder)}`,
            });
            if (!flagData.suggestedFolder) {
              flagData.suggestedFolder = rule.correctFolder;
              flagData.suggestedFolderName = path.basename(rule.correctFolder);
            }
          }
        }
      }
    }
  }

  /**
   * Try to suggest a destination folder for flagged files using date window matching.
   */
  static _suggestDestinations(flags, allFolderWindows) {
    for (const [filePath, flagData] of flags) {
      if (flagData.suggestedFolder) continue; // Already has a suggestion

      const fileTs = flagData.date.getTime();
      let bestMatch = null;
      let bestOverlap = Infinity;

      for (const [folderPath, win] of allFolderWindows) {
        if (folderPath === flagData.folderPath) continue; // Skip current folder
        const start = win.windowStart.getTime();
        const end = win.windowEnd.getTime();

        if (fileTs >= start && fileTs <= end) {
          // File fits within this folder's window
          const midpoint = (start + end) / 2;
          const dist = Math.abs(fileTs - midpoint);
          if (dist < bestOverlap) {
            bestOverlap = dist;
            bestMatch = { path: folderPath, name: win.name };
          }
        }
      }

      if (bestMatch) {
        flagData.suggestedFolder = bestMatch.path;
        flagData.suggestedFolderName = bestMatch.name;
      }
    }
  }

  /**
   * Main scan entry point.
   */
  static async scan(rootPath, onProgress) {
    if (!rootPath || !fs.existsSync(rootPath)) throw new Error('Valid rootPath required');

    if (onProgress) onProgress({ stage: 'collecting', pct: 0 });

    // Step 1: Collect all event folder files
    const folderMap = await this._collectEventFolders(rootPath);
    const totalFiles = [...folderMap.values()].reduce((sum, arr) => sum + arr.length, 0);
    const totalFolders = folderMap.size;

    if (onProgress) onProgress({ stage: 'analyzing', pct: 20, totalFiles, totalFolders });

    // Step 2: Run Signal 1 — Date Outliers
    const flags = new Map();
    const allFolderWindows = new Map();
    this._detectDateOutliers(folderMap, flags, allFolderWindows);

    if (onProgress) onProgress({ stage: 'analyzing', pct: 40, signal: 'date_outlier', flagged: flags.size });

    // Step 3: Run Signal 2 — Filename Batch
    this._detectFilenameBatchOutliers(folderMap, flags);

    if (onProgress) onProgress({ stage: 'analyzing', pct: 55, signal: 'filename_batch', flagged: flags.size });

    // Step 4: Run Signal 5 — Learned Rules
    await this._applyLearnedRules(folderMap, flags);

    if (onProgress) onProgress({ stage: 'analyzing', pct: 65, signal: 'learned_rules', flagged: flags.size });

    // Step 5: Suggest destinations for flagged files
    this._suggestDestinations(flags, allFolderWindows);

    if (onProgress) onProgress({ stage: 'enriching', pct: 75 });

    // Step 6: Enrich video metadata (Signal 4) for flagged files only
    await this._enrichWithSourceMetadata(flags);

    if (onProgress) onProgress({ stage: 'complete', pct: 100, flagged: flags.size });

    // Build sorted result
    const flaggedFiles = [...flags.values()]
      .map((f) => ({
        filePath: f.filePath,
        fileName: f.fileName,
        currentFolder: f.folderPath,
        currentFolderName: f.folderName,
        fileDate: f.date,
        fileSize: f.size,
        mediaType: f.mediaType,
        signals: f.signals,
        suggestedFolder: f.suggestedFolder,
        suggestedFolderName: f.suggestedFolderName,
        overallConfidence: Math.max(...f.signals.map((s) => s.confidence), 0),
      }))
      .sort((a, b) => b.overallConfidence - a.overallConfidence);

    // Collect all event folder names for the UI dropdown
    const eventFolders = [...folderMap.keys()].map((fp) => ({
      path: fp,
      name: path.basename(fp),
    }));

    return {
      totalFilesScanned: totalFiles,
      totalFoldersScanned: totalFolders,
      flaggedCount: flaggedFiles.length,
      flaggedFiles,
      eventFolders,
      folderWindows: Object.fromEntries(
        [...allFolderWindows].map(([k, v]) => [path.basename(k), {
          range: `${formatDate(v.q1)} to ${formatDate(v.q3)}`,
          fileCount: v.fileCount,
        }])
      ),
    };
  }

  /**
   * Confirm a move: physically move the file + store a learned rule.
   */
  static async confirmMove(filePath, destFolder, storeRule = true) {
    if (!fs.existsSync(filePath)) throw new Error('Source file not found');
    if (!fs.existsSync(destFolder)) throw new Error('Destination folder not found');

    const fileName = path.basename(filePath);
    const destPath = path.join(destFolder, fileName);

    // Handle naming conflict
    let finalDest = destPath;
    if (fs.existsSync(finalDest)) {
      const ext = path.extname(fileName);
      const base = path.basename(fileName, ext);
      finalDest = path.join(destFolder, `${base}_${Date.now()}${ext}`);
    }

    // Move file
    try {
      await fs.promises.rename(filePath, finalDest);
    } catch (e) {
      if (e.code === 'EXDEV') {
        await fs.promises.copyFile(filePath, finalDest);
        await fs.promises.unlink(filePath);
      } else throw e;
    }

    // Store learned rule
    if (storeRule) {
      try {
        await MisplacementRule.findOneAndUpdate(
          { filePattern: fileName, sourceFolder: path.dirname(filePath) },
          {
            filePattern: fileName,
            ruleType: 'exact',
            sourceFolder: path.dirname(filePath),
            correctFolder: destFolder,
            confidence: 100,
          },
          { upsert: true, new: true }
        );
      } catch {}
    }

    return { success: true, source: filePath, dest: finalDest };
  }

  /**
   * Reject: mark file as correctly placed (save a "keep" rule so it's not flagged again).
   */
  static async rejectFlag(filePath) {
    const fileName = path.basename(filePath);
    const folderPath = path.dirname(filePath);

    try {
      await MisplacementRule.findOneAndUpdate(
        { filePattern: fileName, sourceFolder: folderPath },
        {
          filePattern: fileName,
          ruleType: 'exact',
          sourceFolder: folderPath,
          correctFolder: folderPath, // Same folder = "this IS correct"
          confidence: 100,
        },
        { upsert: true, new: true }
      );
    } catch {}

    return { success: true, filePath, action: 'kept' };
  }
}
