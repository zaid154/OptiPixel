import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  HardDrive, ArrowLeft, RotateCcw, CheckCircle2, Trash2, ArrowUpRight,
  FolderPlus, Search, ChevronLeft, ChevronRight, LayoutGrid, List,
  Layers, ShieldCheck, ArrowRight, Loader2, Copy, Check, ExternalLink,
  Film, Image as ImageIcon, ZoomIn, X, Folder, SlidersHorizontal,
  ChevronDown, ChevronUp, Eye, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

const ACTION_CONFIG = {
  DELETE: {
    label: 'Quarantined',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: Trash2,
  },
  KEEP: {
    label: 'Kept in Event',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
  MOVE_UPGRADE: {
    label: 'Upgraded & Moved',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: ArrowUpRight,
  },
  RESCUE_MOVE: {
    label: 'Rescued to Event',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: FolderPlus,
  },
};

// 1-Click Copy Button
function CopyBtn({ text, label = '' }) {
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
      title="Copy path to clipboard"
      className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition shrink-0 cursor-pointer inline-flex items-center gap-1 text-[11px]"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
      {copied && <span className="text-[10px] text-emerald-600 font-semibold font-sans">Copied</span>}
      {label && !copied && <span className="text-[10px] text-slate-500 font-sans">{label}</span>}
    </button>
  );
}

// Full Slide-Over Detail Drawer
function FileDetailDrawer({ file, onClose }) {
  if (!file) return null;
  const fileName = file.fileName || (file.sourcePath || '').split(/[/\\]/).pop();
  const isVideo = file.mediaType === 'video' || /\.(mp4|mov|avi|mkv|webm)$/i.test(fileName);
  const cfg = ACTION_CONFIG[file.action] || ACTION_CONFIG.DELETE;
  const ActionIcon = cfg.icon;
  const destPath = file.targetPath || file.quarantinePath || 'Quarantine Storage';
  const previewPath = file.previewPath || file.quarantinePath || file.sourcePath;
  const fullMediaUrl = `/api/duplicates/stream?path=${encodeURIComponent(previewPath)}`;
  const thumbUrl = `/api/duplicates/thumbnail?path=${encodeURIComponent(previewPath)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white border-l border-slate-200 h-full p-6 flex flex-col shadow-2xl text-slate-800 overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2 truncate mr-3">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border text-xs font-bold uppercase ${cfg.badge}`}>
              <ActionIcon className="w-3.5 h-3.5" />
              <span>{cfg.label}</span>
            </span>
            <span className="font-mono text-sm font-bold text-slate-900 truncate" title={fileName}>
              {fileName}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media Preview Box */}
        <div className="my-5 rounded-2xl bg-slate-950 overflow-hidden flex items-center justify-center min-h-[280px] max-h-[380px] border border-slate-800 shadow-inner">
          {isVideo ? (
            <video src={fullMediaUrl} controls autoPlay className="max-h-[360px] max-w-full object-contain" />
          ) : (
            <img
              src={fullMediaUrl}
              onError={(e) => { e.currentTarget.src = thumbUrl; }}
              alt={fileName}
              className="max-h-[360px] max-w-full object-contain"
            />
          )}
        </div>

        {/* File Metadata Strip */}
        <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono mb-5">
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Size</span>
            <span className="font-bold text-slate-900">{formatBytes(file.originalSize)}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Type</span>
            <span className="font-bold text-slate-900 uppercase">{file.mediaType || 'Image'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Event</span>
            <span className="font-bold text-slate-900 truncate block" title={file.eventFolder}>
              {file.eventFolder || 'General'}
            </span>
          </div>
        </div>

        {/* Complete Uncut Paths with Syntax Highlighting */}
        <div className="space-y-4 text-xs font-mono">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <span>Original File Location (FROM)</span>
              </span>
              <CopyBtn text={file.sourcePath} label="Copy Full Path" />
            </div>
            <div className="p-3 rounded-xl bg-slate-900 text-slate-100 break-all select-all font-mono text-[11.5px] leading-relaxed border border-slate-800">
              {file.sourcePath}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <span>Quarantine / Destination Location (TO)</span>
              </span>
              <CopyBtn text={destPath} label="Copy Full Path" />
            </div>
            <div className="p-3 rounded-xl bg-slate-900 text-slate-100 break-all select-all font-mono text-[11.5px] leading-relaxed border border-slate-800">
              {destPath}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Safe Quarantine: 100% Reversible</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}

// Clean Table Row
function TableRowItem({ op, onInspect }) {
  const fileName = op.fileName || (op.sourcePath || '').split(/[/\\]/).pop();
  const isVideo = op.mediaType === 'video' || /\.(mp4|mov|avi|mkv|webm)$/i.test(fileName);
  const cfg = ACTION_CONFIG[op.action] || ACTION_CONFIG.DELETE;
  const ActionIcon = cfg.icon;
  const destPath = op.targetPath || op.quarantinePath || 'Quarantine Storage';
  const previewPath = op.previewPath || op.quarantinePath || op.sourcePath;
  const thumbUrl = `/api/duplicates/thumbnail?path=${encodeURIComponent(previewPath)}&w=140&h=140`;

  return (
    <tr
      onClick={() => onInspect(op)}
      className="hover:bg-slate-50/90 transition border-b border-slate-100 text-xs cursor-pointer group"
    >
      {/* Thumbnail */}
      <td className="p-2.5 pl-4 w-16">
        <div className="relative w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center group-hover:border-emerald-400 transition">
          <img
            src={thumbUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          {isVideo && (
            <div className="absolute bottom-1 right-1 px-1 rounded bg-black/80 text-[8px] text-white font-mono font-bold">
              MP4
            </div>
          )}
          <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
            <Eye className="w-4 h-4" />
          </div>
        </div>
      </td>

      {/* File Name & Size */}
      <td className="p-2.5 max-w-[200px]">
        <div className="font-mono font-bold text-slate-900 truncate text-[12.5px]" title={fileName}>
          {fileName}
        </div>
        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
          {formatBytes(op.originalSize)}
        </div>
      </td>

      {/* Event Folder */}
      <td className="p-2.5 whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-semibold text-xs">
          <Folder className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="truncate max-w-[180px]">{op.eventFolder || 'General'}</span>
        </span>
      </td>

      {/* Action */}
      <td className="p-2.5 whitespace-nowrap">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold uppercase ${cfg.badge}`}>
          <ActionIcon className="w-3.5 h-3.5" />
          <span>{cfg.label}</span>
        </span>
      </td>

      {/* FROM Path (Full Complete Path - No Truncation) */}
      <td className="p-2.5 min-w-[340px]">
        <div className="flex items-start justify-between gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 group-hover:border-slate-300 transition">
          <span className="font-mono text-[11px] text-slate-800 break-all select-all leading-relaxed flex-1">
            {op.sourcePath}
          </span>
          <CopyBtn text={op.sourcePath} />
        </div>
      </td>

      {/* TO Path (Full Complete Path - No Truncation) */}
      <td className="p-2.5 min-w-[340px] pr-4">
        <div className="flex items-start justify-between gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 group-hover:border-slate-300 transition">
          <span className="font-mono text-[11px] text-slate-800 break-all select-all leading-relaxed flex-1">
            {destPath}
          </span>
          <CopyBtn text={destPath} />
        </div>
      </td>
    </tr>
  );
}

// Clean Grid Card
function GridCardItem({ op, onInspect }) {
  const [loaded, setLoaded] = useState(false);
  const [thumbError, setThumbError] = useState(false);

  const fileName = op.fileName || (op.sourcePath || '').split(/[/\\]/).pop();
  const isVideo = op.mediaType === 'video' || /\.(mp4|mov|avi|mkv|webm)$/i.test(fileName);
  const cfg = ACTION_CONFIG[op.action] || ACTION_CONFIG.DELETE;
  const ActionIcon = cfg.icon;
  const destPath = op.targetPath || op.quarantinePath || 'Quarantine Storage';
  const previewPath = op.previewPath || op.quarantinePath || op.sourcePath;
  const thumbUrl = `/api/duplicates/thumbnail?path=${encodeURIComponent(previewPath)}&w=340&h=240`;

  return (
    <div
      onClick={() => onInspect(op)}
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col group cursor-pointer"
    >
      {/* Thumbnail with overlay */}
      <div className="relative w-full h-44 bg-slate-100 border-b border-slate-200 overflow-hidden flex items-center justify-center">
        {!loaded && !thumbError && (
          <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse" />
        )}

        {!thumbError ? (
          <img
            src={thumbUrl}
            alt={fileName}
            className={`w-full h-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setLoaded(true)}
            onError={() => {
              setLoaded(true);
              setThumbError(true);
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 gap-1.5 p-4 text-center">
            {isVideo ? <Film className="w-10 h-10 text-slate-400" /> : <ImageIcon className="w-10 h-10 text-slate-400" />}
            <span className="text-[11px] font-mono font-bold text-slate-500 uppercase">{isVideo ? 'Video' : 'Image'}</span>
          </div>
        )}

        {/* Hover zoom pill */}
        <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-semibold backdrop-blur-2xs">
          <Eye className="w-4 h-4" />
          <span>View Details & Paths</span>
        </div>

        {/* Video badge */}
        {isVideo && (
          <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/80 text-white text-[10px] font-mono font-bold">
            VIDEO
          </span>
        )}

        {/* Action badge */}
        <span className={`absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold uppercase shadow-2xs ${cfg.badge}`}>
          <ActionIcon className="w-3.5 h-3.5" />
          <span>{cfg.label}</span>
        </span>
      </div>

      {/* Card Info */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono font-bold text-xs text-slate-900 truncate" title={fileName}>
              {fileName}
            </span>
            <span className="font-mono text-[11px] text-slate-500 font-semibold shrink-0">
              {formatBytes(op.originalSize)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
            <Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate font-semibold text-slate-800">{op.eventFolder || 'General'}</span>
          </div>
        </div>

        {/* Clean Legible Paths (Full Complete Path - No Truncation) */}
        <div className="space-y-2 text-[11px] font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="flex items-start justify-between gap-2 text-slate-700">
            <div className="break-all select-all flex-1 leading-relaxed">
              <strong className="text-slate-400 uppercase text-[9.5px] mr-1 block">FROM:</strong>
              <span>{op.sourcePath}</span>
            </div>
            <CopyBtn text={op.sourcePath} />
          </div>

          <div className="border-t border-slate-200/80 pt-2 flex items-start justify-between gap-2 text-slate-700">
            <div className="break-all select-all flex-1 leading-relaxed">
              <strong className="text-slate-400 uppercase text-[9.5px] mr-1 block">TO:</strong>
              <span>{destPath}</span>
            </div>
            <CopyBtn text={destPath} />
          </div>
        </div>
      </div>
    </div>
  );
}

// MAIN PAGE
export default function ConsolidationAuditPage({ showToast }) {
  const { transactionId: routeTxnId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState('ALL');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [folderSearch, setFolderSearch] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [inspectFile, setInspectFile] = useState(null);
  const [isRollingBack, setIsRollingBack] = useState(false);

  // Fetch data
  const fetchAudit = async (targetTxnId) => {
    setLoading(true);
    try {
      const url = targetTxnId
        ? `/api/duplicates/history/audit/${targetTxnId}`
        : '/api/duplicates/history/audit';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Transaction log not found');
      const json = await res.json();
      setData(json);
      setCurrentPage(1);
    } catch (err) {
      showToast?.(err.message || 'Failed to load audit report', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit(routeTxnId);
  }, [routeTxnId]);

  // 1-Click Rollback
  const handleRollback = async () => {
    if (!data?.transactionId) return;
    const ok = window.confirm(
      `Rollback Consolidation Session ${data.transactionId}?\n\nAll ${data.operations?.length || 0} quarantined files will be safely moved back to their original locations.`
    );
    if (!ok) return;

    setIsRollingBack(true);
    try {
      const res = await fetch('/api/duplicates/consolidate/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: data.transactionId }),
      });
      const resData = await res.json();
      if (!res.ok || !resData.success) throw new Error(resData.error || 'Rollback failed');
      showToast?.(`Successfully restored all files in session ${data.transactionId}!`, 'success');
      fetchAudit(data.transactionId);
    } catch (err) {
      showToast?.(err.message || 'Failed to rollback consolidation', 'error');
    } finally {
      setIsRollingBack(false);
    }
  };

  const operations = data?.operations || [];
  const events = data?.events || [];
  const summary = data?.summary || {};
  const isRolledBack = data?.status === 'rolled_back';

  // Filter event folders for sidebar search
  const filteredEvents = useMemo(() => {
    if (!folderSearch.trim()) return events;
    const q = folderSearch.toLowerCase();
    return events.filter((ev) => ev.eventName.toLowerCase().includes(q));
  }, [events, folderSearch]);

  // Filter operations based on selected event, action, search query
  const filteredOperations = useMemo(() => {
    return operations.filter((op) => {
      if (selectedEvent !== 'ALL' && op.eventFolder !== selectedEvent) return false;
      if (selectedAction !== 'ALL' && op.action !== selectedAction) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const fn = (op.fileName || '').toLowerCase();
      const src = (op.sourcePath || '').toLowerCase();
      const dest = (op.targetPath || op.quarantinePath || '').toLowerCase();
      const ev = (op.eventFolder || '').toLowerCase();
      return fn.includes(q) || src.includes(q) || dest.includes(q) || ev.includes(q);
    });
  }, [operations, selectedEvent, selectedAction, searchQuery]);

  // Pagination
  const effectivePageSize = pageSize === 'ALL' ? Math.max(1, filteredOperations.length) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredOperations.length / effectivePageSize));
  const paginatedOperations = useMemo(() => {
    if (pageSize === 'ALL') return filteredOperations;
    const start = (currentPage - 1) * effectivePageSize;
    return filteredOperations.slice(start, start + effectivePageSize);
  }, [filteredOperations, currentPage, effectivePageSize, pageSize]);

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
            <span className="text-xs text-slate-500 font-medium">Session:</span>
            {data?.allTransactions?.length > 1 ? (
              <select
                value={data?.transactionId || ''}
                onChange={(e) => navigate(`/audit/${e.target.value}`)}
                className="font-mono text-xs px-2.5 py-1 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
              >
                {data.allTransactions.map((t) => (
                  <option key={t.transactionId} value={t.transactionId}>
                    {t.transactionId} ({new Date(t.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                {data?.transactionId || 'Loading...'}
              </span>
            )}

            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${
                isRolledBack ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {isRolledBack ? 'Rolled Back' : 'Active / Completed'}
            </span>
          </div>
        </div>

        {/* Right Action: Rollback */}
        <div className="flex items-center gap-2.5">
          {!isRolledBack && data?.transactionId && (
            <button
              type="button"
              disabled={isRollingBack}
              onClick={handleRollback}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isRollingBack ? 'Restoring All Files...' : 'Rollback Consolidation'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Title Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Consolidation & Cleanup Audit Hub
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Target Library: <strong className="text-slate-800">{data?.masterFolder || 'All Discovered Events'}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Compact KPI Stats Strip */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Preserved</span>
            <span className="text-base font-bold font-mono text-emerald-700">{summary.keptCount || 0}</span>
            <span className="text-[10px] text-slate-500 ml-1">originals</span>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Quarantined</span>
            <span className="text-base font-bold font-mono text-rose-700">{summary.deletedCount || operations.length}</span>
            <span className="text-[10px] text-slate-500 ml-1">({formatBytes(summary.freedBytes)})</span>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Events</span>
            <span className="text-base font-bold font-mono text-indigo-700">{events.length}</span>
            <span className="text-[10px] text-slate-500 ml-1">folders</span>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex items-start gap-5">
        {/* Collapsible Left Event Folders Sidebar */}
        {isSidebarOpen && (
          <div className="w-64 shrink-0 bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-col gap-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-emerald-600" />
                <span>Event Folders</span>
              </span>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                title="Collapse sidebar to expand table"
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
                className="w-full pl-7 pr-2.5 py-1 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono transition"
              />
            </div>

            {/* Folder List */}
            <div className="max-h-[560px] overflow-y-auto space-y-1 custom-scrollbar pr-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedEvent('ALL');
                  setCurrentPage(1);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                  selectedEvent === 'ALL'
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span>All Event Folders</span>
                <span className={`px-2 py-0.5 rounded-md font-mono text-[10.5px] ${
                  selectedEvent === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {operations.length}
                </span>
              </button>

              {filteredEvents.map((ev) => (
                <button
                  key={ev.eventName}
                  type="button"
                  onClick={() => {
                    setSelectedEvent(ev.eventName);
                    setCurrentPage(1);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium transition cursor-pointer text-left ${
                    selectedEvent === ev.eventName
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-100'
                  }`}
                >
                  <span className="truncate mr-2 font-medium" title={ev.eventName}>
                    {ev.eventName}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] shrink-0 font-bold ${
                    selectedEvent === ev.eventName ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {ev.totalFiles}
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
                  <PanelLeftOpen className="w-3.5 h-3.5 text-emerald-600" />
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
                  placeholder="Search file name, extension, or full path..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono transition"
                />
              </div>
            </div>

            {/* Action Filters */}
            <div className="flex items-center gap-1.5">
              {['ALL', 'DELETE', 'KEEP', 'MOVE_UPGRADE'].map((act) => {
                const count = operations.filter((o) => act === 'ALL' || o.action === act).length;
                if (act !== 'ALL' && count === 0) return null;
                const label = act === 'ALL' ? 'All' : (ACTION_CONFIG[act]?.label || act);

                return (
                  <button
                    key={act}
                    type="button"
                    onClick={() => {
                      setSelectedAction(act);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      selectedAction === act
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {label} ({count})
                  </button>
                );
              })}
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Table View (Clean Columns)"
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'table' ? 'bg-white shadow-2xs text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Grid Cards View"
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white shadow-2xs text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Table / Grid Content */}
          {loading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-20 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <span className="text-xs text-slate-500 font-mono">Loading audit media logs...</span>
            </div>
          ) : filteredOperations.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-20 text-center flex flex-col items-center justify-center gap-2">
              <FolderPlus className="w-8 h-8 text-slate-300" />
              <h3 className="text-sm font-bold text-slate-800">No matching files found</h3>
              <p className="text-xs text-slate-500">Try adjusting your filters or search query.</p>
            </div>
          ) : viewMode === 'table' ? (
            /* TABLE VIEW */
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider select-none">
                      <th className="p-3 pl-4 w-16">Preview</th>
                      <th className="p-3 w-48">File Name & Size</th>
                      <th className="p-3 w-44">Event Folder</th>
                      <th className="p-3 w-36">Action</th>
                      <th className="p-3 min-w-[340px]">Original Path (FROM)</th>
                      <th className="p-3 min-w-[340px] pr-4">Quarantine Location (TO)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOperations.map((op, idx) => (
                      <TableRowItem key={`${op.sourcePath}-${idx}`} op={op} onInspect={setInspectFile} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* GRID VIEW */
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {paginatedOperations.map((op, idx) => (
                <GridCardItem key={`${op.sourcePath}-${idx}`} op={op} onInspect={setInspectFile} />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && filteredOperations.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-3 px-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-500">
                  Showing {paginatedOperations.length} of {filteredOperations.length} files
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
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="ALL">All ({filteredOperations.length})</option>
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

      {/* Detail Inspector Slide-Over Drawer */}
      {inspectFile && (
        <FileDetailDrawer file={inspectFile} onClose={() => setInspectFile(null)} />
      )}
    </div>
  );
}
