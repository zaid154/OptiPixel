import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Loader2, AlertTriangle, ArrowRight, Check, ShieldAlert,
  Calendar, Layers, ChevronDown, ChevronUp, Folder, Search,
  ChevronLeft, ChevronRight, Film, Image as ImageIcon
} from 'lucide-react';

const SIGNAL_LABELS = {
  date_outlier: { label: 'Date Outlier', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  filename_batch: { label: 'Batch Mismatch', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  source_metadata: { label: 'Metadata Conflict', color: 'text-purple-700 bg-purple-50 border-purple-200' },
  learned_rule: { label: 'Learned Rule', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
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

function FlaggedFileCard({ file, eventFolders, onConfirm, onReject, isProcessing }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedDest, setSelectedDest] = useState(file.suggestedFolder || '');
  const [thumbError, setThumbError] = useState(false);

  // Sync destination state when file prop changes (Bug 10 fix)
  useEffect(() => {
    setSelectedDest(file.suggestedFolder || '');
    setThumbError(false);
  }, [file.filePath, file.suggestedFolder]);

  const thumbUrl = `/api/duplicates/thumbnail?path=${encodeURIComponent(file.filePath)}&w=160&h=120`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden hover:border-amber-300 transition">
      <div className="flex items-start gap-3 p-3">
        {/* Thumbnail Preview (Video & Image Supported with Error Fallback - Bug 9 fix) */}
        <div className="shrink-0 w-[120px] h-[90px] rounded-lg overflow-hidden bg-slate-100 border border-slate-200 relative">
          {!thumbError ? (
            <img
              src={thumbUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setThumbError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1">
              {file.mediaType === 'video' ? <Film className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
              <span className="text-[9px] font-mono font-bold uppercase">{file.mediaType}</span>
            </div>
          )}
          {file.mediaType === 'video' && !thumbError && (
            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-mono font-bold">
              VIDEO
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-800 truncate block" title={file.fileName}>
              {file.fileName}
            </span>
            <span className="text-[10px] font-mono text-slate-500 shrink-0">{formatBytes(file.fileSize)}</span>
          </div>

          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
            <Folder className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate max-w-[200px]" title={file.currentFolder}>
              {file.currentRelPath || file.currentFolderName}
            </span>
            <span className="text-slate-300">|</span>
            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{safeFormatDate(file.fileDate)}</span>
          </div>

          {/* Signal Chips */}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {file.signals.map((s, i) => {
              const cfg = SIGNAL_LABELS[s.type] || { label: s.type, color: 'text-slate-600 bg-slate-50 border-slate-200' };
              return (
                <span key={i} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold ${cfg.color}`} title={s.details}>
                  <span>{cfg.label}</span>
                  <span className="opacity-60">{s.confidence}%</span>
                </span>
              );
            })}
          </div>

          {/* Expand for details */}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-1 text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-0.5 cursor-pointer"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Hide Details' : 'Show Details'}
          </button>
          {expanded && (
            <div className="mt-1.5 space-y-1 text-[10px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
              {file.signals.map((s, i) => (
                <div key={i} className="flex items-start gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                  <span>{s.details}</span>
                </div>
              ))}
              <div className="text-[9px] text-slate-400 font-mono pt-1 border-t border-slate-200 truncate" title={file.filePath}>
                {file.filePath}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions with Hierarchical Destination Dropdown (Bug 5 fix) */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border-t border-slate-100">
        <select
          value={selectedDest}
          onChange={(e) => setSelectedDest(e.target.value)}
          className="flex-1 text-[11px] px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-mono truncate"
        >
          <option value="">Select destination...</option>
          {eventFolders
            .filter((ef) => ef.path !== file.currentFolder)
            .map((ef) => (
              <option key={ef.path} value={ef.path}>
                {ef.relPath || ef.name} {ef.path === file.suggestedFolder ? '(Suggested)' : ''}
              </option>
            ))}
        </select>

        <button
          type="button"
          disabled={!selectedDest || isProcessing}
          onClick={() => onConfirm(file.filePath, selectedDest)}
          className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1 shadow-xs"
        >
          <ArrowRight className="w-3.5 h-3.5" /> Move
        </button>

        <button
          type="button"
          disabled={isProcessing}
          onClick={() => onReject(file.filePath)}
          className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer flex items-center gap-1"
          title="Mark file as correctly placed here — saves a rule so it is never flagged again"
        >
          <Check className="w-3.5 h-3.5" /> Keep Here
        </button>
      </div>
    </div>
  );
}

export default function MisplacementReviewModal({ isOpen, onClose, rootPath, showToast }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [processing, setProcessing] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;

  useEffect(() => {
    if (isOpen && rootPath) {
      setCurrentPage(1);
      setSearchQuery('');
      runScan();
    }
  }, [isOpen, rootPath]);

  const runScan = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/duplicates/misplacement/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: rootPath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');
      setResult(data);
    } catch (err) {
      showToast?.(`Scan failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (filePath, destFolder) => {
    setProcessing((prev) => new Set(prev).add(filePath));
    try {
      const res = await fetch('/api/duplicates/misplacement/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, destFolder }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Move failed');
      showToast?.(`Moved to ${data.dest.split(/[/\\]/).pop()}`, 'success');
      // Remove from results
      setResult((prev) => ({
        ...prev,
        flaggedFiles: prev.flaggedFiles.filter((f) => f.filePath !== filePath),
        flaggedCount: prev.flaggedCount - 1,
      }));
    } catch (err) {
      showToast?.(`Move failed: ${err.message}`, 'error');
    } finally {
      setProcessing((prev) => { const n = new Set(prev); n.delete(filePath); return n; });
    }
  };

  const handleReject = async (filePath) => {
    setProcessing((prev) => new Set(prev).add(filePath));
    try {
      const res = await fetch('/api/duplicates/misplacement/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath }),
      });
      if (!res.ok) throw new Error('Failed');
      showToast?.('File marked as correctly placed (whitelisted)', 'success');
      // Remove from results
      setResult((prev) => ({
        ...prev,
        flaggedFiles: prev.flaggedFiles.filter((f) => f.filePath !== filePath),
        flaggedCount: prev.flaggedCount - 1,
      }));
    } catch (err) {
      showToast?.(`Error: ${err.message}`, 'error');
    } finally {
      setProcessing((prev) => { const n = new Set(prev); n.delete(filePath); return n; });
    }
  };

  // Filtered files based on search
  const filteredFiles = useMemo(() => {
    if (!result?.flaggedFiles) return [];
    if (!searchQuery.trim()) return result.flaggedFiles;
    const q = searchQuery.toLowerCase();
    return result.flaggedFiles.filter(
      (f) => f.fileName.toLowerCase().includes(q) ||
             f.currentFolderName.toLowerCase().includes(q) ||
             (f.currentRelPath && f.currentRelPath.toLowerCase().includes(q))
    );
  }, [result?.flaggedFiles, searchQuery]);

  // Pagination calculation (Bug 8 fix)
  const totalPages = Math.max(1, Math.ceil(filteredFiles.length / PAGE_SIZE));
  const paginatedFiles = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredFiles.slice(start, start + PAGE_SIZE);
  }, [filteredFiles, currentPage, PAGE_SIZE]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Review Misplaced Files</h2>
              <p className="text-[11px] text-slate-500">Multi-signal detection across all event folders</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Stats & Search Filter Bar */}
        {result && !loading && (
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-slate-500">
                Scanned: <strong className="text-slate-800">{result.totalFilesScanned}</strong> in <strong className="text-slate-800">{result.totalFoldersScanned}</strong> folders
              </span>
              <span className="text-slate-300">|</span>
              <span className={result.flaggedCount > 0 ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                {result.flaggedCount > 0 ? `${result.flaggedCount} flagged` : 'All correct'}
              </span>
            </div>

            {/* Real-time Search Input */}
            {result.flaggedCount > 0 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder="Filter by file or folder..."
                  className="pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-400 w-48 font-mono"
                />
              </div>
            )}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              <span className="text-sm text-slate-700 font-medium">Analyzing files across all event folders...</span>
              <span className="text-[10px] text-slate-400">Running date outlier, batch consistency, and metadata checks</span>
            </div>
          )}

          {!loading && result && result.flaggedCount === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="p-3 rounded-full bg-emerald-100">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <span className="text-sm font-bold text-emerald-800">All Clear</span>
              <span className="text-[11px] text-slate-500">No misplaced files detected across {result.totalFoldersScanned} event folders.</span>
            </div>
          )}

          {!loading && result && filteredFiles.length === 0 && result.flaggedCount > 0 && (
            <div className="py-12 text-center text-xs text-slate-500">
              No files match your search filter "{searchQuery}".
            </div>
          )}

          {!loading && result && paginatedFiles.map((f) => (
            <FlaggedFileCard
              key={f.filePath}
              file={f}
              eventFolders={result.eventFolders}
              onConfirm={handleConfirm}
              onReject={handleReject}
              isProcessing={processing.has(f.filePath)}
            />
          ))}
        </div>

        {/* Footer with Pagination Controls (Bug 8 fix) */}
        {!loading && result && result.flaggedCount > 0 && (
          <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
            <span className="text-[10px] text-slate-500 hidden sm:inline">
              "Keep Here" whitelists the file permanently.
            </span>

            {/* Pagination Buttons */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono text-slate-600 font-semibold">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={runScan}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition cursor-pointer"
            >
              Re-scan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
