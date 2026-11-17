import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { extractMediaDate, parseDateFromFilename } from './libraryOrganizerService.js';
import { MisplacementRule, normalizePath } from '../../models/MisplacementRule.js';
import FileCache from '../../models/FileCache.js';
import ScanResultCache from '../../models/ScanResultCache.js';

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
    const timer = setTimeout(() => { try { proc.kill(); } catch {} resolve(null); }, 2500);
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

function matchFolder(currentFolder, ruleFolder) {
  const normCurrent = normalizePath(currentFolder);
  const normRule = normalizePath(ruleFolder);
  if (normCurrent === normRule) return true;
  if (normCurrent.endsWith('/' + normRule) || normRule.endsWith('/' + normCurrent)) return true;

  const baseCurrent = normCurrent.split('/').pop();
  const baseRule = normRule.split('/').pop();
  if (baseCurrent && baseCurrent === baseRule) {
    const ruleParts = normRule.split('/');
    const currentParts = normCurrent.split('/');
    if (ruleParts.length >= 2 && currentParts.length >= 2) {
      const parentRule = ruleParts[ruleParts.length - 2];
      const parentCurrent = currentParts[currentParts.length - 2];
      const isGeneric = ['memories', 'desktop', 'user', 'users'].includes(parentRule);
      if (!isGeneric && parentRule !== parentCurrent) {
        return false;
      }
    }
    return true;
  }
  return false;
}

export class MisplacementDetectorService {

  /**
   * Walk rootPath and collect files grouped by event folder.
   * Returns Map<folderPath, FileInfo[]>
   */
  static async _collectEventFolders(rootPath) {
    const normRoot = path.resolve(rootPath);
    const rawFiles = [];

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
          
          const relToRoot = path.relative(normRoot, dir);
          if (!relToRoot) continue; // Skip root-level loose files
          
          // Find the top-level event folder for grouping
          const topFolder = relToRoot.split(path.sep)[0];
          if (!isEventFolder(topFolder)) continue;

          rawFiles.push({ full, name: ent.name, ext, dir, relToRoot });
        }
      }
    }

    await walk(normRoot);

    // High-performance parallel chunk extraction (9x faster than sequential)
    const CHUNK_SIZE = 50;
    const folderMap = new Map();

    for (let i = 0; i < rawFiles.length; i += CHUNK_SIZE) {
      const chunk = rawFiles.slice(i, i + CHUNK_SIZE);
      const results = await Promise.all(
        chunk.map(async (item) => {
          let stat;
          try { stat = await fs.promises.stat(item.full); } catch { return null; }
          const { date, source } = await extractMediaDate(item.full);
          return {
            filePath: item.full,
            fileName: item.name,
            date,
            dateSource: source,
            size: stat.size,
            mediaType: getMediaType(item.ext),
            folderPath: item.dir,
            folderName: path.basename(item.dir),
            relPath: item.relToRoot.replace(/[/\\]/g, ' > '),
          };
        })
      );

      for (const res of results) {
        if (!res) continue;
        if (!folderMap.has(res.folderPath)) folderMap.set(res.folderPath, []);
        folderMap.get(res.folderPath).push(res);
      }
    }

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
      const relHierarchy = files[0]?.relPath || folderName;

      allFolderWindows.set(folderPath, {
        name: folderName,
        relPath: relHierarchy,
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
            flags.set(f.filePath, { ...f, signals: [], suggestedFolder: null, suggestedFolderName: null, suggestedRelPath: null });
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
    const batches = new Map();

    for (const [folderPath, files] of folderMap) {
      for (const f of files) {
        let batchKey = extractBatchKey(f.fileName);
        if (!batchKey) continue;

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
      // Strict threshold: Must be > 55% and at least 3 files to avoid 50/50 ties
      if (majorityPct <= 55 || maxCount < 3) continue;

      // Flag minority files
      for (const e of entries) {
        if (e.folderPath === majorityFolder) continue;
        const f = e.file;
        const minorityCount = folderCounts.get(e.folderPath);
        
        if (!flags.has(f.filePath)) {
          flags.set(f.filePath, { ...f, signals: [], suggestedFolder: null, suggestedFolderName: null, suggestedRelPath: null });
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
          flagData.suggestedRelPath = f.relPath;
        }
      }
    }
  }

  /**
   * Signal 4: Source Metadata (video creation_time cross-check)
   * Run in chunks of 5 parallel probes to avoid scan freeze.
   */
  static async _enrichWithSourceMetadata(flags) {
    const videoFlags = [...flags.values()].filter((f) => f.mediaType === 'video' && f.signals.length > 0);
    if (videoFlags.length === 0) return;

    const CHUNK_SIZE = 5;
    for (let i = 0; i < videoFlags.length; i += CHUNK_SIZE) {
      const chunk = videoFlags.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (f) => {
          try {
            const creationTime = await getVideoCreationTime(f.filePath);
            if (!creationTime) return;

            const fileDateTs = f.date.getTime();
            const creationTs = creationTime.getTime();
            const diff = Math.abs(fileDateTs - creationTs);

            if (diff > 24 * 60 * 60 * 1000) {
              const flagData = flags.get(f.filePath);
              if (flagData) {
                flagData.signals.push({
                  type: 'source_metadata',
                  confidence: 60,
                  details: `Video metadata date ${formatDate(creationTime)} differs from file date ${formatDate(f.date)}`,
                });
              }
            }
          } catch {}
        })
      );
    }
  }

  /**
   * Signal 5: Apply learned rules from past user corrections.
   * Whitelist Fix: If sourceFolder === correctFolder, this is a KEEP rule.
   * Delete from flags so it is NEVER flagged again!
   */
  static async _applyLearnedRules(folderMap, flags) {
    let rules;
    try { rules = await MisplacementRule.find().lean(); }
    catch { return; }
    if (!rules || rules.length === 0) return;

    for (const [folderPath, files] of folderMap) {
      const normFolder = normalizePath(folderPath);
      for (const f of files) {
        for (const rule of rules) {
          const rType = rule.ruleType || 'exact';
          let matched = false;
          if (rType === 'exact' && f.fileName.toLowerCase() === (rule.filePattern || '').toLowerCase()) {
            matched = true;
          } else if (rType === 'pattern') {
            try {
              const re = new RegExp(rule.filePattern, 'i');
              if (re.test(f.fileName)) matched = true;
            } catch {}
          }

          if (!matched) continue;

          const normRuleSource = normalizePath(rule.sourceFolder);
          const normRuleCorrect = normalizePath(rule.correctFolder);

          if (matchFolder(folderPath, rule.sourceFolder)) {
            // Check if this is a WHITELIST / "Keep Here" rule
            if (normRuleSource === normRuleCorrect) {
              // User explicitly said: KEEP THIS FILE IN THIS FOLDER!
              flags.delete(f.filePath);
              break;
            } else {
              // This is a "Move to Correct Folder" rule
              if (!flags.has(f.filePath)) {
                flags.set(f.filePath, { ...f, signals: [], suggestedFolder: null, suggestedFolderName: null, suggestedRelPath: null });
              }
              const flagData = flags.get(f.filePath);
              if (!flagData.signals.some((s) => s.type === 'learned_rule')) {
                flagData.signals.push({
                  type: 'learned_rule',
                  confidence: rule.confidence || 95,
                  details: `Learned rule: "${rule.filePattern}" should be in ${path.basename(rule.correctFolder)}`,
                });
              }

              // Resolve target folder in active folderMap (drive-portable)
              let targetFolder = rule.correctFolder;
              let targetRelPath = path.basename(rule.correctFolder);
              for (const [fp, folderFiles] of folderMap) {
                if (matchFolder(fp, rule.correctFolder)) {
                  targetFolder = fp;
                  targetRelPath = folderFiles[0]?.relPath || path.basename(fp);
                  break;
                }
              }

              flagData.suggestedFolder = targetFolder;
              flagData.suggestedFolderName = path.basename(targetFolder);
              flagData.suggestedRelPath = targetRelPath;
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
          const midpoint = (start + end) / 2;
          const dist = Math.abs(fileTs - midpoint);
          if (dist < bestOverlap) {
            bestOverlap = dist;
            bestMatch = { path: folderPath, name: win.name, relPath: win.relPath };
          }
        }
      }

      if (bestMatch) {
        flagData.suggestedFolder = bestMatch.path;
        flagData.suggestedFolderName = bestMatch.name;
        flagData.suggestedRelPath = bestMatch.relPath || bestMatch.name;
      }
    }
  }

  /**
   * Main scan entry point.
   */
  static async scan(rootPath, onProgress) {
    if (!rootPath || !fs.existsSync(rootPath)) throw new Error('Valid rootPath required');

    const normRoot = path.resolve(rootPath);
    if (onProgress) onProgress({ stage: 'collecting', pct: 0 });

    // Step 1: Collect all event folder files
    const folderMap = await this._collectEventFolders(normRoot);
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

    // Step 4: Run Signal 5 — Learned Rules & Whitelist
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
        currentRelPath: f.relPath || f.folderName,
        fileDate: f.date,
        fileSize: f.size,
        mediaType: f.mediaType,
        signals: f.signals,
        suggestedFolder: f.suggestedFolder,
        suggestedFolderName: f.suggestedFolderName,
        suggestedRelPath: f.suggestedRelPath || f.suggestedFolderName,
        overallConfidence: Math.max(...f.signals.map((s) => s.confidence), 0),
      }))
      .sort((a, b) => b.overallConfidence - a.overallConfidence);

    // Collect all event folders with clear hierarchical paths
    const eventFolders = [...folderMap.entries()].map(([fp, files]) => {
      const rel = path.relative(normRoot, fp).replace(/[/\\]/g, ' > ');
      return {
        path: fp,
        name: path.basename(fp),
        relPath: rel || path.basename(fp),
        fileCount: files.length,
      };
    }).sort((a, b) => a.relPath.localeCompare(b.relPath));

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
   * Confirm a move: physically move the file + update MongoDB FileCache + store learned rule.
   */
  static async confirmMove(filePath, destFolder, storeRule = true) {
    if (!fs.existsSync(filePath)) throw new Error('Source file not found');
    if (!fs.existsSync(destFolder)) throw new Error('Destination folder not found');

    const fileName = path.basename(filePath);
    const destPath = path.join(destFolder, fileName);

    // Self-move / Case-insensitive overwrite safety check
    const srcNorm = path.resolve(filePath).toLowerCase();
    const destNorm = path.resolve(destPath).toLowerCase();
    if (srcNorm === destNorm) {
      return { success: true, source: filePath, dest: destPath, message: 'File is already in target location' };
    }

    // Handle naming conflict
    let finalDest = destPath;
    if (fs.existsSync(finalDest)) {
      const ext = path.extname(fileName);
      const base = path.basename(fileName, ext);
      finalDest = path.join(destFolder, `${base}_${Date.now()}${ext}`);
    }

    // Move file physically
    try {
      await fs.promises.rename(filePath, finalDest);
    } catch (e) {
      if (e.code === 'EXDEV') {
        await fs.promises.copyFile(filePath, finalDest);
        await fs.promises.unlink(filePath);
      } else throw e;
    }

    // Synchronize MongoDB FileCache and ScanResultCache
    try {
      const resolvedSrc = path.resolve(filePath);
      const slashSrc = resolvedSrc.replace(/\\/g, '/');
      await FileCache.updateOne(
        { $or: [{ filePath: filePath }, { filePath: resolvedSrc }, { filePath: slashSrc }] },
        { $set: { filePath: finalDest, folderPath: destFolder, mtimeMs: Date.now() } }
      ).catch(() => {});

      await ScanResultCache.updateMany(
        { 'groups.files.filePath': { $in: [filePath, resolvedSrc, slashSrc] } },
        { $set: { 'groups.$[].files.$[file].filePath': finalDest } },
        { arrayFilters: [{ 'file.filePath': { $in: [filePath, resolvedSrc, slashSrc] } }] }
      ).catch(() => {});
    } catch (cacheErr) {}

    // Store learned rule
    if (storeRule) {
      try {
        await MisplacementRule.findOneAndUpdate(
          { filePattern: fileName, sourceFolder: normalizePath(path.dirname(filePath)) },
          {
            filePattern: fileName,
            ruleType: 'exact',
            sourceFolder: normalizePath(path.dirname(filePath)),
            correctFolder: normalizePath(destFolder),
            confidence: 100,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch {}
    }

    return { success: true, source: filePath, dest: finalDest };
  }

  /**
   * Reject: mark file as correctly placed (save a "keep" rule so it's whitelisted).
   */
  static async rejectFlag(filePath) {
    const fileName = path.basename(filePath);
    const folderPath = normalizePath(path.dirname(filePath));

    try {
      await MisplacementRule.findOneAndUpdate(
        { filePattern: fileName, sourceFolder: folderPath },
        {
          filePattern: fileName,
          ruleType: 'exact',
          sourceFolder: folderPath,
          correctFolder: folderPath, // Same folder = WHITELIST KEEP RULE
          confidence: 100,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch {}

    return { success: true, filePath, action: 'kept' };
  }
}
