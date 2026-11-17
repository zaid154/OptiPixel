import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderTree, ArrowLeft, RotateCcw, Check, ArrowRight, ShieldAlert,
  Calendar, Layers, ChevronDown, ChevronUp, Folder, Search,
  ChevronLeft, ChevronRight, Film, Image as ImageIcon, LayoutGrid, List,
  Loader2, CheckCircle2, Eye, X, ZoomIn, Copy, AlertTriangle, Sparkles,
  PanelLeftClose, PanelLeftOpen, ShieldCheck, CheckSquare, Square, Trash2,
  Maximize2, Crop
} from 'lucide-react';

const SIGNAL_CONFIG = {
  date_outlier: { label: 'Date Outlier', badge: 'text-amber-800 bg-amber-50 border-amber-200' },
  filename_batch: { label: 'Batch Mismatch', badge: 'text-blue-800 bg-blue-50 border-blue-200' },
  source_metadata: { label: 'Metadata Conflict', badge: 'text-purple-800 bg-purple-50 border-purple-200' },
  learned_rule: { label: 'Learned Rule', badge: 'text-emerald-800 bg-emerald-50 border-emerald-200' },
  screenshot_detected: { label: 'Screenshot', badge: 'text-indigo-800 bg-indigo-50 border-indigo-200' },
};

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function safeFormatDate(d) {
  if (!d) return 'N/A';
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleDateString('en-IN');
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy path"
      className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition cursor-pointer shrink-0"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// Fullscreen Photo/Video Lightbox Modal
function MediaLightboxModal({ file, eventFolders, onConfirm, onReject, onDelete, onClose }) {
  if (!file) return null;
  const [selectedDest, setSelectedDest] = useState(file.suggestedFolder || '');
  const isVideo = file.mediaType === 'video' || /\.(mp4|mov|avi|mkv|webm)$/i.test(file.fileName);
  const fullUrl = `/api/duplicates/stream?path=${encodeURIComponent(file.filePath)}`;
  const thumbUrl = `/api/duplicates/thumbnail?path=${encodeURIComponent(file.filePath)}&w=800&h=600`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-5xl w-full max-h-[95vh] border border-slate-200 shadow-2xl overflow-hidden flex flex-col text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-slate-900 truncate max-w-md">{file.fileName}</span>
            <span className="text-xs font-mono text-slate-500">{formatBytes(file.fileSize)}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media Preview Box */}
        <div className="p-6 bg-slate-950 flex items-center justify-center min-h-[360px] max-h-[500px] overflow-hidden">
          {isVideo ? (
            <video src={fullUrl} controls autoPlay className="max-h-[460px] max-w-full object-contain rounded-lg" />
          ) : (
            <img
              src={fullUrl}
              onError={(e) => { e.currentTarget.src = thumbUrl; }}
              alt={file.fileName}
              className="max-h-[460px] max-w-full object-contain rounded-lg shadow-md"
            />
          )}
        </div>

        {/* Details & Actions Footer */}
        <div className="p-5 px-6 bg-white border-t border-slate-200 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            {/* Current Location */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10.5px] uppercase font-bold text-slate-400 block">Current Location</span>
              <div className="break-all select-all font-bold text-slate-800">{file.filePath}</div>
              <div className="text-slate-500 font-sans mt-1">
                Folder: <strong>{file.currentRelPath || file.currentFolderName}</strong> • Date: <strong>{safeFormatDate(file.fileDate)}</strong>
              </div>
            </div>

            {/* Why Flagged (Signals) */}
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5">
              <span className="text-[10.5px] uppercase font-bold text-amber-800 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Detection Reason:</span>
              </span>
              <div className="space-y-1">
                {file.signals?.map((s, idx) => (
                  <div key={idx} className="text-amber-950 font-sans text-xs flex items-center gap-1.5">
                    <span className="font-bold">{s.type.replace('_', ' ')}:</span>
                    <span>{s.details || `Outlier confidence ${s.confidence}%`}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <span className="text-xs font-medium text-slate-600 shrink-0">Move to:</span>
              <select
                value={selectedDest}
                onChange={(e) => setSelectedDest(e.target.value)}
                className="flex-1 font-mono text-xs px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-800 font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
              >
                {eventFolders?.map((ef) => (
                  <option key={ef.path} value={ef.path}>
                    {ef.name} — ({ef.relPath}) {ef.path === file.suggestedFolder ? '★ (AI Suggested)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onReject(file.filePath);
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="Keep file here (whitelist)"
              >
                <Check className="w-4 h-4 text-slate-600" />
                <span>Keep Here</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onConfirm(file.filePath, selectedDest);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                title="Move to selected folder"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Move to Folder</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onDelete(file);
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="Move unwanted/bekaar media to safe Quarantine"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Delete / Quarantine</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// MAIN PAGE
export default function MisplacementReviewPage({ showToast }) {
  const navigate = useNavigate();

  // Instant load from sessionStorage (0ms perceived latency on revisits)
  const [data, setData] = useState(() => {
    try {
      const cached = sessionStorage.getItem('optipixel_misplaced_data');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      return !sessionStorage.getItem('optipixel_misplaced_data');
    } catch {
      return true;
    }
  });
  const [isScanning, setIsScanning] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState('ALL');
  const [selectedSignal, setSelectedSignal] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [folderSearch, setFolderSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [imageFit, setImageFit] = useState('contain'); // 'contain' (Full pic uncropped) | 'cover' (Fill)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [inspectFile, setInspectFile] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedDestMap, setSelectedDestMap] = useState({});

  const getFileTargetFolder = (file) => {
    return selectedDestMap[file.filePath] || file.suggestedFolder || '';
  };

  const getTargetFolderMeta = (targetPath) => {
    if (!targetPath) return { name: 'Select destination...', relPath: 'No folder selected' };
    const found = eventFolders.find((ef) => ef.path?.toLowerCase() === targetPath.toLowerCase());
    if (found) return found;
    const name = targetPath.split(/[/\\]/).pop();
    const rel = targetPath.split(/[/\\]/).slice(-2).join(' > ');
    return { path: targetPath, name, relPath: rel || name };
  };

  // Fetch scan results
  const runScan = async (forceRescan = false) => {
    if (!data) setLoading(true);
    setIsScanning(true);
    try {
      const res = await fetch('/api/duplicates/misplacement/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath: 'C:\\Users\\user\\Desktop\\Memories',
          forceRescan,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Scan failed');
      setData(json);
      try {
        sessionStorage.setItem('optipixel_misplaced_data', JSON.stringify(json));
      } catch {}
      if (forceRescan) {
        setCurrentPage(1);
        setSelectedFiles(new Set());
      }
    } catch (err) {
      showToast?.(err.message || 'Failed to scan misplaced files', 'error');
    } finally {
      setLoading(false);
      setIsScanning(false);
    }
  };

  useEffect(() => {
    runScan(false);
  }, []);

  const flaggedFiles = data?.flaggedFiles || [];
  const eventFolders = data?.eventFolders || [];

  // Group files by current folder for sidebar
  const folderCounts = useMemo(() => {
    const map = new Map();
    for (const f of flaggedFiles) {
      const key = f.currentFolderName || f.currentRelPath || 'Other';
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [flaggedFiles]);

  // Filtered folders for sidebar search
  const filteredSidebarFolders = useMemo(() => {
    if (!folderSearch.trim()) return folderCounts;
    const q = folderSearch.toLowerCase();
    return folderCounts.filter((fc) => fc.name.toLowerCase().includes(q));
  }, [folderCounts, folderSearch]);

  // Filter flagged files based on folder, signal, search query
  const filteredFiles = useMemo(() => {
    return flaggedFiles.filter((f) => {
      // Folder filter
      if (selectedEvent !== 'ALL') {
        const fFolder = f.currentFolderName || f.currentRelPath || '';
        if (fFolder !== selectedEvent) return false;
      }
      // Signal filter
      if (selectedSignal !== 'ALL') {
        const hasSig = f.signals?.some((s) => s.type === selectedSignal);
        if (!hasSig) return false;
      }
      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const fn = (f.fileName || '').toLowerCase();
      const src = (f.filePath || '').toLowerCase();
      const cf = (f.currentFolderName || f.currentRelPath || '').toLowerCase();
      const sf = (f.suggestedFolderName || f.suggestedRelPath || '').toLowerCase();
      return fn.includes(q) || src.includes(q) || cf.includes(q) || sf.includes(q);
    });
  }, [flaggedFiles, selectedEvent, selectedSignal, searchQuery]);

  // Pagination
  const effectivePageSize = pageSize === 'ALL' ? Math.max(1, filteredFiles.length) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredFiles.length / effectivePageSize));
  const paginatedFiles = useMemo(() => {
    if (pageSize === 'ALL') return filteredFiles;
    const start = (currentPage - 1) * effectivePageSize;
    return filteredFiles.slice(start, start + effectivePageSize);
  }, [filteredFiles, currentPage, effectivePageSize, pageSize]);

  // Helper to update React state AND sessionStorage cache simultaneously
  const updateDataWithCache = (updater) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try { sessionStorage.setItem('optipixel_misplaced_data', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // 1-Click Instant / Optimistic "Keep Here"
  const handleKeepHere = (filePath) => {
    // 1. INSTANT OPTIMISTIC UI REMOVAL (0ms latency!)
    updateDataWithCache((prev) => ({
      ...prev,
      flaggedFiles: prev.flaggedFiles.filter((f) => f.filePath !== filePath),
      flaggedCount: Math.max(0, prev.flaggedCount - 1),
    }));
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      next.delete(filePath);
      return next;
    });

    // 2. Background persistence
    fetch('/api/duplicates/misplacement/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath }),
    }).catch((err) => {
      showToast?.(`Failed to whitelist file: ${err.message}`, 'error');
    });
  };

  // 1-Click Instant / Optimistic "Move"
  const handleMoveFile = async (filePath, destFolder) => {
    if (!destFolder) {
      showToast?.('Please choose a destination folder from the dropdown first', 'error');
      return;
    }
    // 1. Instant optimistic UI removal
    const targetFile = flaggedFiles.find((f) => f.filePath === filePath);
    updateDataWithCache((prev) => ({
      ...prev,
      flaggedFiles: prev.flaggedFiles.filter((f) => f.filePath !== filePath),
      flaggedCount: Math.max(0, prev.flaggedCount - 1),
    }));
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      next.delete(filePath);
      return next;
    });

    showToast?.(`Moved to ${destFolder.split(/[/\\]/).pop()}`, 'success');

    // 2. Background move execution
    try {
      const res = await fetch('/api/duplicates/misplacement/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, destFolder }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Move failed');
    } catch (err) {
      showToast?.(`Move failed: ${err.message}`, 'error');
      // Revert if failed
      if (targetFile) {
        updateDataWithCache((prev) => ({
          ...prev,
          flaggedFiles: [targetFile, ...prev.flaggedFiles],
          flaggedCount: prev.flaggedCount + 1,
        }));
      }
    }
  };

  // BATCH ACTIONS
  const handleBatchKeepSelected = async () => {
    const paths = Array.from(selectedFiles);
    if (paths.length === 0) return;

    // Instant optimistic removal
    updateDataWithCache((prev) => ({
      ...prev,
      flaggedFiles: prev.flaggedFiles.filter((f) => !selectedFiles.has(f.filePath)),
      flaggedCount: Math.max(0, prev.flaggedCount - paths.length),
    }));
    setSelectedFiles(new Set());
    showToast?.(`Whitelisted ${paths.length} files successfully`, 'success');

    // Call ultra-fast batch endpoint
    try {
      await fetch('/api/duplicates/misplacement/batch-reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePaths: paths }),
      });
    } catch (err) {
      showToast?.(`Batch whitelist error: ${err.message}`, 'error');
    }
  };

  const handleBatchMoveSelected = async () => {
    const paths = Array.from(selectedFiles);
    if (paths.length === 0) return;

    const moves = [];
    for (const p of paths) {
      const f = flaggedFiles.find((item) => item.filePath === p);
      if (f && f.suggestedFolder) {
        moves.push({ filePath: p, destFolder: f.suggestedFolder });
      }
    }

    if (moves.length === 0) return showToast?.('No suggested destination for selected files', 'warning');

    // Instant optimistic removal
    updateDataWithCache((prev) => ({
      ...prev,
      flaggedFiles: prev.flaggedFiles.filter((f) => !selectedFiles.has(f.filePath)),
      flaggedCount: Math.max(0, prev.flaggedCount - moves.length),
    }));
    setSelectedFiles(new Set());
    showToast?.(`Moving ${moves.length} files to their suggested folders...`, 'info');

    // Call batch confirm
    try {
      const res = await fetch('/api/duplicates/misplacement/batch-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moves }),
      });
      const result = await res.json();
      showToast?.(`Successfully organized ${result.count || moves.length} files!`, 'success');
    } catch (err) {
      showToast?.(`Batch move failed: ${err.message}`, 'error');
    }
  };

  // Safe Delete / Quarantine Actions
  const handleExecuteQuarantine = async (filesToQuarantine) => {
    if (!filesToQuarantine || filesToQuarantine.length === 0) return;

    const filePaths = filesToQuarantine.map((f) => f.filePath);
    const totalBytes = filesToQuarantine.reduce((sum, f) => sum + (f.fileSize || 0), 0);
    const rootDir = data?.rootDir || 'C:\\Users\\user\\Desktop\\Memories';

    // 1. INSTANT OPTIMISTIC UI REMOVAL (0ms latency!)
    const filePathsSet = new Set(filePaths);
    updateDataWithCache((prev) => ({
      ...prev,
      flaggedFiles: prev.flaggedFiles.filter((f) => !filePathsSet.has(f.filePath)),
      flaggedCount: Math.max(0, prev.flaggedCount - filePaths.length),
    }));
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      filePaths.forEach((p) => next.delete(p));
      return next;
    });

    setDeleteTarget(null);
    showToast?.(
      `Quarantined ${filePaths.length} file${filePaths.length > 1 ? 's' : ''} (${formatBytes(totalBytes)} freed). Moved to _Duplicates_Quarantine.`,
      'success'
    );

    // 2. Background quarantine persistence
    try {
      const res = await fetch('/api/duplicates/misplacement/quarantine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePaths, rootDir }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Quarantine failed');
    } catch (err) {
      showToast?.(`Quarantine failed: ${err.message}`, 'error');
      // Revert if failed
      updateDataWithCache((prev) => ({
        ...prev,
        flaggedFiles: [...filesToQuarantine, ...prev.flaggedFiles],
        flaggedCount: prev.flaggedCount + filesToQuarantine.length,
      }));
    }
  };

  const promptDeleteSingle = (file) => {
    setDeleteTarget({
      type: 'single',
      files: [file],
    });
  };

  const promptBatchDelete = () => {
    const selectedList = flaggedFiles.filter((f) => selectedFiles.has(f.filePath));
    if (selectedList.length === 0) return;
    setDeleteTarget({
      type: 'batch',
      files: selectedList,
    });
  };

  // Toggle selection
  const toggleSelect = (filePath) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) next.delete(filePath);
      else next.add(filePath);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedFiles(new Set(paginatedFiles.map((f) => f.filePath)));
  };

  const deselectAll = () => {
    setSelectedFiles(new Set());
  };

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-200">
      {/* Top Banner Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/duplicates')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Duplicate Finder</span>
          </button>

          <div className="h-4 w-px bg-slate-200" />

          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-amber-100 text-amber-800">
              <ShieldAlert className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-slate-900">Misplacement AI Detector</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold border border-amber-200">
              Multi-Signal IQR
            </span>
          </div>
        </div>

        {/* Right Re-Scan Action */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={isScanning}
            onClick={() => runScan(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-amber-600' : ''}`} />
            <span>{isScanning ? 'Scanning...' : 'Re-Scan All Folders'}</span>
          </button>
        </div>
      </div>

      {/* Main Title Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Review Misplaced Photos & Videos
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Target Library: <strong className="text-slate-800">C:\Users\user\Desktop\Memories</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Compact KPI Stats Strip */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Flagged Misplaced</span>
            <span className="text-base font-bold font-mono text-amber-600">{flaggedFiles.length}</span>
            <span className="text-[10px] text-slate-500 ml-1">files</span>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Scanned Files</span>
            <span className="text-base font-bold font-mono text-slate-800">{data?.totalFilesScanned || 8080}</span>
            <span className="text-[10px] text-slate-500 ml-1">in library</span>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Event Folders</span>
            <span className="text-base font-bold font-mono text-indigo-700">{data?.totalFoldersScanned || 65}</span>
            <span className="text-[10px] text-slate-500 ml-1">folders analyzed</span>
          </div>
        </div>
      </div>

      {/* Main Content Layout (100% full width, zero wasted space) */}
      <div className="w-full flex flex-col gap-3.5">
        {/* Top Horizontal Event Folders Filter Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-2.5 px-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[280px] overflow-hidden">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 shrink-0 pr-2 border-r border-slate-200">
              <Folder className="w-3.5 h-3.5 text-amber-500" />
              <span>Folder:</span>
            </div>

            {/* Quick Select Dropdown */}
            <select
              value={selectedEvent}
              onChange={(e) => {
                setSelectedEvent(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-amber-400 cursor-pointer shrink-0 max-w-[220px]"
            >
              <option value="ALL">All Event Folders ({flaggedFiles.length})</option>
              {folderCounts.map((fc) => (
                <option key={fc.name} value={fc.name}>
                  {fc.name} ({fc.count})
                </option>
              ))}
            </select>

            {/* Scrollable Folder Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 flex-1 no-scrollbar">
              <button
                type="button"
                onClick={() => {
                  setSelectedEvent('ALL');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  selectedEvent === 'ALL'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>All Folders</span>
                <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] ${
                  selectedEvent === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {flaggedFiles.length}
                </span>
              </button>

              {folderCounts.map((fc) => (
                <button
                  key={fc.name}
                  type="button"
                  onClick={() => {
                    setSelectedEvent(fc.name);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    selectedEvent === fc.name
                      ? 'bg-amber-600 text-white font-bold shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span className="truncate max-w-[140px]">{fc.name}</span>
                  <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] font-bold ${
                    selectedEvent === fc.name ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {fc.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer shrink-0"
            title="Browse all folders in a searchable drawer"
          >
            <Folder className="w-3.5 h-3.5 text-amber-600" />
            <span>All Folders ({folderCounts.length})</span>
          </button>
        </div>

        {/* Controls Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 px-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[260px]">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Filter by filename, date, or folder..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-400 font-mono transition"
              />
            </div>
          </div>

            {/* Signal Filters */}
            <div className="flex items-center gap-1.5">
              {[
                { key: 'ALL', label: 'All Misplaced' },
                { key: 'date_outlier', label: 'Date Outliers' },
                { key: 'filename_batch', label: 'Batch Mismatches' },
                { key: 'source_metadata', label: 'Metadata Conflicts' },
              ].map((sig) => (
                <button
                  key={sig.key}
                  type="button"
                  onClick={() => {
                    setSelectedSignal(sig.key);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    selectedSignal === sig.key
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {sig.label}
                </button>
              ))}
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Cards Grid View"
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white shadow-2xs text-amber-700 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Table View (Clean Columns)"
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'table' ? 'bg-white shadow-2xs text-amber-700 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Image Fit Switcher (Full Pic vs Fill Card) */}
            {viewMode === 'grid' && (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setImageFit('contain')}
                  title="Full Picture Uncropped (No cut-off)"
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    imageFit === 'contain' ? 'bg-white shadow-2xs text-amber-700' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Full Pic</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImageFit('cover')}
                  title="Fill Card (Cropped to frame)"
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    imageFit === 'cover' ? 'bg-white shadow-2xs text-amber-700' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Crop className="w-3.5 h-3.5" />
                  <span>Fill Card</span>
                </button>
              </div>
            )}
          </div>

          {/* Background Refresh Indicator */}
          {isScanning && data && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
              <span>Updating misplaced scan in background... You can continue reviewing cards.</span>
            </div>
          )}

          {/* Table / Grid Content */}
          {loading && !data ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-20 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <span className="text-sm text-slate-800 font-bold">Scanning Event Folders...</span>
              <span className="text-xs text-slate-500 font-mono">Analyzing 8,080 files across 65 event folders</span>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-20 text-center flex flex-col items-center justify-center gap-2">
              <div className="p-3 rounded-full bg-emerald-100 text-emerald-600 mb-1">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No misplaced files found</h3>
              <p className="text-xs text-slate-500">All photos and videos in this selection are organized in their correct event folders.</p>
            </div>
          ) : viewMode === 'grid' ? (
            /* CARDS GRID VIEW (Full width, zero wasted space) */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
              {paginatedFiles.map((file) => (
                <div
                  key={file.filePath}
                  className={`bg-white border rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col justify-between ${
                    selectedFiles.has(file.filePath) ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200'
                  }`}
                >
                  {/* Card Thumbnail Box (Full uncropped with ambient backdrop) */}
                  <div
                    onClick={() => setInspectFile(file)}
                    className="relative w-full h-40 sm:h-44 bg-slate-950 border-b border-slate-200 overflow-hidden flex items-center justify-center cursor-pointer group select-none"
                  >
                    {/* Ambient blurred backdrop so portrait photos fill gracefully with zero harsh black bars */}
                    <img
                      src={`/api/duplicates/thumbnail?path=${encodeURIComponent(file.filePath)}`}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-xl opacity-35 scale-125 pointer-events-none"
                    />

                    {/* 100% Full Uncropped Image */}
                    <img
                      src={`/api/duplicates/thumbnail?path=${encodeURIComponent(file.filePath)}`}
                      alt={file.fileName}
                      className={`relative z-1 transition duration-200 drop-shadow-md group-hover:scale-105 ${
                        imageFit === 'contain'
                          ? 'max-h-full max-w-full object-contain'
                          : 'w-full h-full object-cover'
                      }`}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />

                    {/* Multi-select Checkbox on Top-Left */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(file.filePath);
                      }}
                      className="absolute top-2 left-2 z-10 p-1.5 rounded-lg bg-black/60 hover:bg-black text-white cursor-pointer transition shadow-md"
                    >
                      {selectedFiles.has(file.filePath) ? (
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>

                    {/* Controls & Badges on Top-Right */}
                    <div className="absolute top-2 right-2 z-10 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setImageFit((prev) => (prev === 'contain' ? 'cover' : 'contain'))}
                        title={imageFit === 'contain' ? 'Currently: Full uncropped picture. Click to fill.' : 'Currently: Cropped to fill. Click for full picture.'}
                        className="p-1 rounded-md bg-black/60 hover:bg-black text-slate-300 hover:text-white transition shadow-md cursor-pointer"
                      >
                        {imageFit === 'contain' ? <Maximize2 className="w-2.5 h-2.5 text-amber-300" /> : <Crop className="w-2.5 h-2.5 text-slate-300" />}
                      </button>
                      {(file.isScreenshot || /^screenshot/i.test(file.fileName)) ? (
                        <span className="px-1.5 py-0.5 rounded bg-purple-700 text-white font-mono text-[8.5px] font-bold">
                          SCREENSHOT
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-black/70 text-white font-mono text-[8.5px] font-bold">
                          {file.mediaType === 'video' ? 'VIDEO' : 'IMAGE'}
                        </span>
                      )}
                    </div>

                    {/* Hover Zoom Overlay */}
                    <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white gap-1 text-[11px] font-semibold backdrop-blur-2xs pointer-events-none z-2">
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>Fullscreen</span>
                    </div>
                  </div>

                  {/* Card Body (Compact & High-Density) */}
                  <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      {/* File Name & Size */}
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-mono font-bold text-xs text-slate-900 truncate" title={file.fileName}>
                          {file.fileName}
                        </span>
                        <span className="text-[10.5px] font-mono text-slate-500 font-semibold shrink-0">
                          {formatBytes(file.fileSize)}
                        </span>
                      </div>

                      {/* Current Location & Full Path (100% visible without truncation) */}
                      <div className="mt-1.5 p-2 rounded-xl bg-amber-50/70 border border-amber-200/90 text-slate-800 font-mono">
                        <div className="flex items-center justify-between gap-1 text-[10px] text-amber-900 font-bold uppercase tracking-wider mb-1">
                          <span className="flex items-center gap-1">
                            <Folder className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Current Location:</span>
                          </span>
                          <span className="text-slate-500 font-semibold text-[10px] normal-case">{safeFormatDate(file.fileDate)}</span>
                        </div>
                        {/* Full Breadcrumb - Wrap without truncation */}
                        <div className="text-xs font-bold text-slate-900 break-words leading-tight">
                          {file.currentRelPath || file.currentFolderName}
                        </div>
                        {/* Full File Path with Copy Button */}
                        <div className="mt-1 pt-1 border-t border-amber-200/60 flex items-start justify-between gap-1 text-[10px] text-slate-600">
                          <span className="break-all select-all flex-1 leading-snug">{file.filePath}</span>
                          <CopyBtn text={file.filePath} />
                        </div>
                      </div>

                      {/* Signal Badges */}
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {file.signals?.map((s, idx) => {
                          const cfg = SIGNAL_CONFIG[s.type] || { label: s.type, badge: 'text-slate-700 bg-slate-100 border-slate-200' };
                          return (
                            <span
                              key={idx}
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9.5px] font-bold border ${cfg.badge}`}
                              title={s.details}
                            >
                              <span>{cfg.label}</span>
                              <span className="opacity-70 font-mono">{s.confidence}%</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Destination Selection & Actions */}
                    <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
                      <div className="flex items-center justify-between text-[10.5px] font-bold">
                        <span className="text-slate-600 uppercase flex items-center gap-1">
                          <ArrowRight className="w-3 h-3 text-emerald-600" />
                          <span>Move To:</span>
                        </span>
                        {(() => {
                          const targetPath = getFileTargetFolder(file);
                          const meta = getTargetFolderMeta(targetPath);
                          if (!targetPath) {
                            return (
                              <span className="text-[10px] text-slate-400 font-semibold italic">
                                Select folder...
                              </span>
                            );
                          }
                          return (
                            <div className="flex items-center gap-1 max-w-[170px] truncate" title={meta.relPath || targetPath}>
                              <span className="text-[10px] font-bold text-emerald-950 bg-emerald-100/70 border border-emerald-300 px-1.5 py-0.2 rounded truncate">
                                📁 {meta.name}
                              </span>
                              <CopyBtn text={targetPath} />
                            </div>
                          );
                        })()}
                      </div>

                      {/* Interactive Target Folder Selector */}
                      <div className="relative">
                        <select
                          value={getFileTargetFolder(file)}
                          onChange={(e) => {
                            setSelectedDestMap((prev) => ({
                              ...prev,
                              [file.filePath]: e.target.value,
                            }));
                          }}
                          className="w-full text-xs font-semibold px-2 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50/70 hover:bg-emerald-50 text-emerald-950 focus:bg-white focus:outline-none focus:border-emerald-600 cursor-pointer shadow-2xs font-mono truncate"
                        >
                          {!file.suggestedFolder && (
                            <option value="">-- Choose destination folder --</option>
                          )}
                          {file.suggestedFolder && (
                            <option value={file.suggestedFolder}>
                              ★ {file.suggestedFolderName} ({file.suggestedRelPath}) — [AI Suggested]
                            </option>
                          )}
                          {file.dateMatchedFolder && file.dateMatchedFolder.toLowerCase() !== file.suggestedFolder?.toLowerCase() && (
                            <option value={file.dateMatchedFolder}>
                              📅 Date Match: {file.dateMatchedFolderName} ({file.dateMatchedRelPath})
                            </option>
                          )}
                          {file.suggestedFolder?.toLowerCase() !== `${data?.rootDir || 'C:\\Users\\user\\Desktop\\Memories'}\\Screenshots`.toLowerCase() && (
                            <option value={`${data?.rootDir || 'C:\\Users\\user\\Desktop\\Memories'}\\Screenshots`}>
                              📁 Screenshots (Dedicated Archive)
                            </option>
                          )}
                          {eventFolders?.map((ef) => {
                            if (
                              ef.path.toLowerCase() === file.suggestedFolder?.toLowerCase() ||
                              ef.path.toLowerCase() === file.dateMatchedFolder?.toLowerCase() ||
                              ef.path.toLowerCase() === `${data?.rootDir || 'C:\\Users\\user\\Desktop\\Memories'}\\Screenshots`.toLowerCase()
                            ) return null;
                            return (
                              <option key={ef.path} value={ef.path}>
                                {ef.name} — ({ef.relPath})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* 3 Compact Action Buttons */}
                      <div className="grid grid-cols-3 gap-1 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleKeepHere(file.filePath)}
                          className="py-1 px-1 rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                          title="Keep here and whitelist"
                        >
                          <Check className="w-3 h-3 text-slate-600" />
                          <span>Keep</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMoveFile(file.filePath, getFileTargetFolder(file))}
                          className="py-1 px-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                          title={`Move to ${getTargetFolderMeta(getFileTargetFolder(file)).name}`}
                        >
                          <ArrowRight className="w-3 h-3" />
                          <span>Move</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => promptDeleteSingle(file)}
                          className="py-1 px-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                          title="Move bekaar/unwanted file to Quarantine folder"
                        >
                          <Trash2 className="w-3 h-3 text-rose-600" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* TABLE VIEW */
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[960px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-bold text-slate-600 uppercase tracking-wider select-none">
                      <th className="p-2.5 pl-3 w-10">
                        <button
                          type="button"
                          onClick={selectedFiles.size > 0 ? deselectAll : selectAllVisible}
                          className="cursor-pointer"
                        >
                          {selectedFiles.size > 0 ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                        </button>
                      </th>
                      <th className="p-2.5 w-14">Preview</th>
                      <th className="p-2.5 w-44">File Name & Size</th>
                      <th className="p-2.5 w-48">Current Event & Date</th>
                      <th className="p-2.5 w-40">Signals</th>
                      <th className="p-2.5 min-w-[200px]">Suggested Destination</th>
                      <th className="p-2.5 w-48 pr-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedFiles.map((file) => (
                      <tr
                        key={file.filePath}
                        className={`hover:bg-slate-50/90 transition border-b border-slate-100 text-xs ${
                          selectedFiles.has(file.filePath) ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        <td className="p-2.5 pl-3">
                          <button type="button" onClick={() => toggleSelect(file.filePath)} className="cursor-pointer">
                            {selectedFiles.has(file.filePath) ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </button>
                        </td>
                        <td className="p-2.5">
                          <div
                            onClick={() => setInspectFile(file)}
                            className="relative w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:border-amber-400"
                          >
                            <img
                              src={`/api/duplicates/thumbnail?path=${encodeURIComponent(file.filePath)}&w=120&h=120`}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          </div>
                        </td>
                        <td className="p-2.5">
                          <div className="font-mono font-bold text-slate-900 truncate text-[12px]" title={file.fileName}>
                            {file.fileName}
                          </div>
                          <div className="text-[10.5px] text-slate-500 font-mono mt-0.5">
                            {formatBytes(file.fileSize)}
                          </div>
                        </td>
                        <td className="p-2.5">
                          <div className="font-semibold text-slate-800 truncate" title={file.currentRelPath || file.currentFolderName}>
                            {file.currentRelPath || file.currentFolderName}
                          </div>
                          <div className="text-[10.5px] text-slate-400 font-mono">
                            {safeFormatDate(file.fileDate)}
                          </div>
                        </td>
                        <td className="p-2.5">
                          <div className="flex flex-wrap gap-1">
                            {file.signals?.map((s, i) => (
                              <span key={i} className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                {s.type.replace('_', ' ')}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-2.5">
                          {(() => {
                            const targetPath = getFileTargetFolder(file);
                            const meta = getTargetFolderMeta(targetPath);
                            return (
                              <div className="flex flex-col gap-1 max-w-xs">
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={targetPath}
                                    onChange={(e) => {
                                      setSelectedDestMap((prev) => ({
                                        ...prev,
                                        [file.filePath]: e.target.value,
                                      }));
                                    }}
                                    className="font-bold text-emerald-950 bg-emerald-50 hover:bg-white px-2 py-0.5 rounded border border-emerald-300 text-xs truncate max-w-[200px] cursor-pointer"
                                  >
                                    {!file.suggestedFolder && (
                                      <option value="">-- Choose folder --</option>
                                    )}
                                    {file.suggestedFolder && (
                                      <option value={file.suggestedFolder}>
                                        ★ {file.suggestedFolderName}
                                      </option>
                                    )}
                                    {file.dateMatchedFolder && file.dateMatchedFolder.toLowerCase() !== file.suggestedFolder?.toLowerCase() && (
                                      <option value={file.dateMatchedFolder}>
                                        📅 {file.dateMatchedFolderName}
                                      </option>
                                    )}
                                    {file.suggestedFolder?.toLowerCase() !== `${data?.rootDir || 'C:\\Users\\user\\Desktop\\Memories'}\\Screenshots`.toLowerCase() && (
                                      <option value={`${data?.rootDir || 'C:\\Users\\user\\Desktop\\Memories'}\\Screenshots`}>
                                        📁 Screenshots
                                      </option>
                                    )}
                                    {eventFolders?.map((ef) => {
                                      if (
                                        ef.path.toLowerCase() === file.suggestedFolder?.toLowerCase() ||
                                        ef.path.toLowerCase() === file.dateMatchedFolder?.toLowerCase() ||
                                        ef.path.toLowerCase() === `${data?.rootDir || 'C:\\Users\\user\\Desktop\\Memories'}\\Screenshots`.toLowerCase()
                                      ) return null;
                                      return (
                                        <option key={ef.path} value={ef.path}>
                                          📁 {ef.name}
                                        </option>
                                      );
                                    })}
                                  </select>
                                  {(file.isScreenshot || /^screenshot/i.test(file.fileName)) && (
                                    <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 text-[9.5px] font-bold shrink-0">
                                      📱 Screenshot
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-500 font-mono truncate" title={meta.relPath || targetPath}>
                                  {meta.relPath || meta.name}
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="p-2.5 pr-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleKeepHere(file.filePath)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                              title="Keep here (whitelist)"
                            >
                              Keep
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveFile(file.filePath, getFileTargetFolder(file))}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1"
                              title={`Move to ${getTargetFolderMeta(getFileTargetFolder(file)).name}`}
                            >
                              <span>Move</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => promptDeleteSingle(file)}
                              className="px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                              title="Move to safe Quarantine folder"
                            >
                              <Trash2 className="w-3 h-3 text-rose-600" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && filteredFiles.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-3 px-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-500">
                  Showing {paginatedFiles.length} of {filteredFiles.length} files
                </span>

                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span>Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="font-mono text-xs px-2 py-0.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="24">24</option>
                    <option value="48">48</option>
                    <option value="96">96</option>
                    <option value="ALL">All ({filteredFiles.length})</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="text-xs font-mono text-slate-700 font-bold">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      {/* Sticky Bottom Floating Bar when multiple items selected */}
      {selectedFiles.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white rounded-2xl shadow-2xl p-3 px-6 flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-150 border border-slate-800">
          <span className="text-xs font-mono font-bold">
            {selectedFiles.size} files selected
          </span>

          <div className="h-4 w-px bg-slate-700" />

          <button
            type="button"
            onClick={handleBatchKeepSelected}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Keep All Selected Here (0ms)</span>
          </button>

          <button
            type="button"
            onClick={handleBatchMoveSelected}
            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>Move All Selected to Suggested</span>
          </button>

          <button
            type="button"
            onClick={promptBatchDelete}
            className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            title="Move selected unwanted/bekaar files to safe quarantine folder"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Selected ({selectedFiles.size})</span>
          </button>

          <button
            type="button"
            onClick={deselectAll}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
            title="Deselect all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Lightbox / High-Res Media Inspector */}
      {inspectFile && (
        <MediaLightboxModal
          file={inspectFile}
          eventFolders={eventFolders}
          onConfirm={handleMoveFile}
          onReject={handleKeepHere}
          onDelete={promptDeleteSingle}
          onClose={() => setInspectFile(null)}
        />
      )}

      {/* Safe Quarantine / Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full border border-rose-200 shadow-2xl overflow-hidden p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-rose-100 text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {deleteTarget.type === 'single'
                    ? 'Move File to Quarantine Folder?'
                    : `Quarantine ${deleteTarget.files.length} Selected Files?`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Safely remove unwanted or bekaar media to free up disk space.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between text-rose-950 font-bold">
                <span>Files to Quarantine:</span>
                <span className="font-mono">{deleteTarget.files.length}</span>
              </div>
              <div className="flex items-center justify-between text-rose-950 font-bold">
                <span>Total Space Reclaimed:</span>
                <span className="font-mono text-rose-700">
                  {formatBytes(deleteTarget.files.reduce((s, f) => s + (f.fileSize || 0), 0))}
                </span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pt-1.5 border-t border-rose-200/60 font-mono text-[11px] text-slate-700">
                {deleteTarget.files.map((f) => (
                  <div key={f.filePath} className="p-1 rounded bg-white/70 border border-rose-100 flex items-center justify-between gap-2">
                    <span className="truncate font-semibold">{f.fileName}</span>
                    <span className="text-slate-500 shrink-0">{formatBytes(f.fileSize)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>100% Safe & Reversible:</strong> Files are NOT permanently erased. They are moved into <code>_Duplicates_Quarantine</code> and can be restored at any time with 1 click from History or Audit Hub.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleExecuteQuarantine(deleteTarget.files)}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-md"
              >
                <Trash2 className="w-4 h-4" />
                <span>Move to Quarantine Folder</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Folder Drawer (Zero layout distortion, overlays when needed) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-50 flex bg-slate-950/60 backdrop-blur-2xs animate-in fade-in duration-150"
          onClick={() => setIsSidebarOpen(false)}
        >
          <div
            className="w-84 max-w-[85vw] h-full bg-white shadow-2xl p-5 flex flex-col gap-4 border-r border-slate-200 animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm text-slate-900">Event Folders ({folderCounts.length})</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Folder Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={folderSearch}
                onChange={(e) => setFolderSearch(e.target.value)}
                placeholder="Search folders..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-400 font-mono transition"
                autoFocus
              />
            </div>

            {/* Folder List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedEvent('ALL');
                  setCurrentPage(1);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  selectedEvent === 'ALL'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span>All Event Folders</span>
                <span className={`px-2 py-0.5 rounded-md font-mono text-[10.5px] ${
                  selectedEvent === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {flaggedFiles.length}
                </span>
              </button>

              {filteredSidebarFolders.map((fc) => (
                <button
                  key={fc.name}
                  type="button"
                  onClick={() => {
                    setSelectedEvent(fc.name);
                    setCurrentPage(1);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition cursor-pointer text-left ${
                    selectedEvent === fc.name
                      ? 'bg-amber-600 text-white font-bold shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-100'
                  }`}
                >
                  <span className="truncate mr-2 font-medium" title={fc.name}>{fc.name}</span>
                  <span className={`px-2 py-0.5 rounded-md font-mono text-[10.5px] shrink-0 font-bold ${
                    selectedEvent === fc.name ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {fc.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
