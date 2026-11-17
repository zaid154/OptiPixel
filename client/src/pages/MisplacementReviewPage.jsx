import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderTree, ArrowLeft, RotateCcw, Check, ArrowRight, ShieldAlert,
  Calendar, Layers, ChevronDown, ChevronUp, Folder, Search,
  ChevronLeft, ChevronRight, Film, Image as ImageIcon, LayoutGrid, List,
  Loader2, CheckCircle2, Eye, X, ZoomIn, Copy, AlertTriangle, Sparkles,
  PanelLeftClose, PanelLeftOpen, ShieldCheck, CheckSquare, Square
} from 'lucide-react';

const SIGNAL_CONFIG = {
  date_outlier: { label: 'Date Outlier', badge: 'text-amber-800 bg-amber-50 border-amber-200' },
  filename_batch: { label: 'Batch Mismatch', badge: 'text-blue-800 bg-blue-50 border-blue-200' },
  source_metadata: { label: 'Metadata Conflict', badge: 'text-purple-800 bg-purple-50 border-purple-200' },
  learned_rule: { label: 'Learned Rule', badge: 'text-emerald-800 bg-emerald-50 border-emerald-200' },
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
function MediaLightboxModal({ file, eventFolders, onConfirm, onReject, onClose }) {
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
                  <option key={ef.folderPath} value={ef.folderPath}>
                    {ef.relPath} {ef.folderPath === file.suggestedFolder ? '★ (Suggested)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onReject(file.filePath);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Check className="w-4 h-4 text-slate-600" />
                <span>Keep Here (Whitelist)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onConfirm(file.filePath, selectedDest);
                  onClose();
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Move to Selected Folder</span>
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

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState('ALL');
  const [selectedSignal, setSelectedSignal] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [folderSearch, setFolderSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [inspectFile, setInspectFile] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Fetch scan results
  const runScan = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/duplicates/misplacement/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: 'C:\\Users\\user\\Desktop\\Memories' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Scan failed');
      setData(json);
      setCurrentPage(1);
      setSelectedFiles(new Set());
    } catch (err) {
      showToast?.(err.message || 'Failed to scan misplaced files', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runScan();
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

  // 1-Click Instant / Optimistic "Keep Here"
  const handleKeepHere = (filePath) => {
    // 1. INSTANT OPTIMISTIC UI REMOVAL (0ms latency!)
    setData((prev) => ({
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
    // 1. Instant optimistic UI removal
    const targetFile = flaggedFiles.find((f) => f.filePath === filePath);
    setData((prev) => ({
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
        setData((prev) => ({
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
    setData((prev) => ({
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
    setData((prev) => ({
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
            disabled={loading}
            onClick={runScan}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-600' : ''}`} />
            <span>{loading ? 'Scanning (7s)...' : 'Re-Scan All Folders'}</span>
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

      {/* Main Content Layout */}
      <div className="flex items-start gap-5">
        {/* Collapsible Left Event Folders Sidebar */}
        {isSidebarOpen && (
          <div className="w-72 shrink-0 bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-col gap-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-amber-600" />
                <span>Folders with Flagged</span>
              </span>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                title="Collapse sidebar to expand view"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {/* Folder Search */}
            <div className="relative">
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={folderSearch}
                onChange={(e) => setFolderSearch(e.target.value)}
                placeholder="Search folders..."
                className="w-full pl-7 pr-2.5 py-1 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-400 font-mono transition"
              />
            </div>

            {/* Folder List */}
            <div className="max-h-[580px] overflow-y-auto space-y-1 custom-scrollbar pr-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedEvent('ALL');
                  setCurrentPage(1);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                  selectedEvent === 'ALL'
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
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
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium transition cursor-pointer text-left ${
                    selectedEvent === fc.name
                      ? 'bg-amber-600 text-white font-bold shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-100'
                  }`}
                >
                  <span className="truncate mr-2 font-medium" title={fc.name}>
                    {fc.name}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] shrink-0 font-bold ${
                    selectedEvent === fc.name ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {fc.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Right Main Table/Grid Panel */}
        <div className="flex-1 min-w-0 flex flex-col gap-3.5">
          {/* Controls Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 px-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[260px]">
              {!isSidebarOpen && (
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer shadow-2xs"
                >
                  <PanelLeftOpen className="w-3.5 h-3.5 text-amber-600" />
                  <span>Folders</span>
                </button>
              )}

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
          </div>

          {/* Table / Grid Content */}
          {loading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-20 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <span className="text-sm text-slate-800 font-bold">Scanning Event Folders (7s)...</span>
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
            /* CARDS GRID VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {paginatedFiles.map((file) => (
                <div
                  key={file.filePath}
                  className={`bg-white border rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col justify-between ${
                    selectedFiles.has(file.filePath) ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200'
                  }`}
                >
                  {/* Card Thumbnail Box */}
                  <div
                    onClick={() => setInspectFile(file)}
                    className="relative w-full h-52 bg-slate-900 border-b border-slate-200 overflow-hidden flex items-center justify-center cursor-pointer group"
                  >
                    <img
                      src={`/api/duplicates/thumbnail?path=${encodeURIComponent(file.filePath)}&w=360&h=240`}
                      alt={file.fileName}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />

                    {/* Multi-select Checkbox on Top-Left */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(file.filePath);
                      }}
                      className="absolute top-2.5 left-2.5 z-10 p-1.5 rounded-lg bg-black/60 hover:bg-black text-white cursor-pointer transition shadow-md"
                    >
                      {selectedFiles.has(file.filePath) ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300" />
                      )}
                    </div>

                    {/* Media Type Badge on Top-Right */}
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-black/70 text-white font-mono text-[9px] font-bold">
                      {file.mediaType === 'video' ? 'VIDEO' : 'IMAGE'}
                    </span>

                    {/* Hover Zoom Overlay */}
                    <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white gap-1.5 text-xs font-semibold backdrop-blur-2xs">
                      <ZoomIn className="w-4 h-4" />
                      <span>Inspect High-Res & Signals</span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      {/* File Name & Size */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900 truncate" title={file.fileName}>
                          {file.fileName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 font-semibold shrink-0">
                          {formatBytes(file.fileSize)}
                        </span>
                      </div>

                      {/* Current Location & Date */}
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-600 font-mono">
                        <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate font-semibold text-slate-800" title={file.currentRelPath || file.currentFolderName}>
                          {file.currentRelPath || file.currentFolderName}
                        </span>
                        <span className="text-slate-300">•</span>
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{safeFormatDate(file.fileDate)}</span>
                      </div>

                      {/* Signal Badges */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {file.signals?.map((s, idx) => {
                          const cfg = SIGNAL_CONFIG[s.type] || { label: s.type, badge: 'text-slate-700 bg-slate-100 border-slate-200' };
                          return (
                            <span
                              key={idx}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${cfg.badge}`}
                              title={s.details}
                            >
                              <span>{cfg.label}</span>
                              <span className="opacity-70 font-mono">{s.confidence}%</span>
                            </span>
                          );
                        })}
                      </div>

                      {/* Uncut Path with Copy */}
                      <div className="mt-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between gap-1 text-[10.5px] font-mono text-slate-700">
                        <span className="break-all select-all flex-1 leading-tight">{file.filePath}</span>
                        <CopyBtn text={file.filePath} />
                      </div>
                    </div>

                    {/* Destination Selection & Actions */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-500 uppercase shrink-0">Suggest:</span>
                        <span className="font-mono text-xs text-emerald-800 font-bold truncate bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {file.suggestedRelPath || file.suggestedFolderName || 'Select folder...'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleKeepHere(file.filePath)}
                          className="w-full py-1.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <Check className="w-3.5 h-3.5 text-slate-600" />
                          <span>Keep Here</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMoveFile(file.filePath, file.suggestedFolder)}
                          className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          <span>Move</span>
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
                          <span className="font-mono text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 truncate block max-w-xs" title={file.suggestedRelPath || file.suggestedFolderName}>
                            {file.suggestedRelPath || file.suggestedFolderName}
                          </span>
                        </td>
                        <td className="p-2.5 pr-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleKeepHere(file.filePath)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                            >
                              Keep
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveFile(file.filePath, file.suggestedFolder)}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1"
                            >
                              <span>Move</span>
                              <ArrowRight className="w-3 h-3" />
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
          onClose={() => setInspectFile(null)}
        />
      )}
    </div>
  );
}
