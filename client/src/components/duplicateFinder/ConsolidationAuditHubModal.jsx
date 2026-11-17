import React, { useState, useEffect, useMemo } from 'react';
import {
  X, CheckCircle2, Trash2, ArrowUpRight, FolderPlus,
  Search, ChevronLeft, ChevronRight, RotateCcw,
  HardDrive, Folder, Film, Image as ImageIcon,
  LayoutGrid, List, Layers, ShieldCheck, ArrowRight, Loader2,
  Copy, Check, ExternalLink
} from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

const ACTION_CONFIG = {
  DELETE: {
    label: 'Quarantined',
    bg: 'bg-rose-500/10 text-rose-700 border-rose-200',
    darkBg: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: Trash2,
  },
  KEEP: {
    label: 'Kept in Event',
    bg: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
    darkBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
  MOVE_UPGRADE: {
    label: 'Upgraded & Moved',
    bg: 'bg-amber-500/10 text-amber-700 border-amber-200',
    darkBg: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: ArrowUpRight,
  },
  RESCUE_MOVE: {
    label: 'Rescued to Event',
    bg: 'bg-indigo-500/10 text-indigo-700 border-indigo-200',
    darkBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: FolderPlus,
  },
};

function CopyPathBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy path"
      className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition shrink-0 cursor-pointer"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function AuditFileCard({ op }) {
  const [loaded, setLoaded] = useState(false);
  const [thumbError, setThumbError] = useState(false);
  const fileName = op.fileName || (op.sourcePath || '').split(/[/\\]/).pop();
  const isVideo = op.mediaType === 'video' || /\.(mp4|mov|avi|mkv|webm)$/i.test(fileName);
  const cfg = ACTION_CONFIG[op.action] || ACTION_CONFIG.DELETE;
  const ActionIcon = cfg.icon;
  const destPath = op.targetPath || op.quarantinePath || 'Quarantine Storage';
  const previewPath = op.previewPath || op.quarantinePath || op.sourcePath;
  const thumbUrl = `/api/duplicates/thumbnail?path=${encodeURIComponent(previewPath)}&w=280&h=200`;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col">
      {/* Thumbnail with Picture */}
      <div className="relative w-full h-36 bg-slate-100 border-b border-slate-200 overflow-hidden flex items-center justify-center">
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
          <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
            {isVideo ? <Film className="w-8 h-8" /> : <ImageIcon className="w-8 h-8" />}
            <span className="text-[10px] font-mono font-bold uppercase">{isVideo ? 'Video' : 'Image'}</span>
          </div>
        )}

        {/* Video badge */}
        {isVideo && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/75 text-white text-[9px] font-mono font-bold">
            VIDEO
          </span>
        )}

        {/* Action badge */}
        <span className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase shadow-2xs ${cfg.darkBg}`}>
          <ActionIcon className="w-3 h-3" />
          <span>{cfg.label}</span>
        </span>
      </div>

      {/* Info Section */}
      <div className="p-3 flex-1 flex flex-col justify-between space-y-2 text-xs">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono font-bold text-slate-900 truncate" title={fileName}>
              {fileName}
            </span>
            <span className="font-mono text-[11px] text-slate-500 font-semibold shrink-0">
              {formatBytes(op.originalSize)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 mt-1 font-mono">
            <Folder className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate font-semibold text-slate-700">{op.eventFolder || 'General'}</span>
          </div>
        </div>

        {/* FROM -> TO Route (Full Uncut Paths) */}
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1 text-[10px] font-mono">
          <div className="flex items-start gap-1">
            <strong className="text-slate-400 shrink-0 uppercase text-[9px]">FROM:</strong>
            <span className="text-slate-700 break-all select-all flex-1">{op.sourcePath}</span>
            <CopyPathBtn text={op.sourcePath} />
          </div>
          <div className="border-t border-slate-200/60 pt-1 flex items-start gap-1">
            <strong className="text-slate-400 shrink-0 uppercase text-[9px]">TO:</strong>
            <span className="text-slate-700 break-all select-all flex-1">{destPath}</span>
            <CopyPathBtn text={destPath} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConsolidationAuditHubModal({
  isOpen,
  onClose,
  initialTransactionId = null,
  onRollback,
  showToast,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTxnId, setSelectedTxnId] = useState(initialTransactionId);
  const [selectedEvent, setSelectedEvent] = useState('ALL');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const ITEMS_PER_PAGE = 24;

  const loadAuditData = async (txnId) => {
    setLoading(true);
    try {
      const url = txnId ? `/api/duplicates/history/audit/${txnId}` : '/api/duplicates/history/audit';
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setData(json);
        if (!selectedTxnId) setSelectedTxnId(json.transactionId);
      }
    } catch (e) {
      showToast?.('Failed to load audit data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAuditData(initialTransactionId || selectedTxnId);
      setSelectedEvent('ALL');
      setSelectedAction('ALL');
      setSearchQuery('');
      setCurrentPage(1);
    }
  }, [isOpen, initialTransactionId]);

  const handleSwitchTransaction = (txnId) => {
    setSelectedTxnId(txnId);
    setSelectedEvent('ALL');
    setSelectedAction('ALL');
    setCurrentPage(1);
    loadAuditData(txnId);
  };

  const handleRollback = async () => {
    if (!data?.transactionId) return;
    setIsRollingBack(true);
    try {
      const res = await fetch('/api/duplicates/consolidate/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: data.transactionId }),
      });
      const resJson = await res.json();
      if (resJson.error) throw new Error(resJson.error);

      showToast?.(`Rollback successful! Restored ${resJson.restoredCount} files.`, 'success');
      loadAuditData(data.transactionId);
      onRollback?.(data.transactionId);
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setIsRollingBack(false);
    }
  };

  const operations = data?.operations || [];
  const events = data?.events || [];
  const summary = data?.summary || {};
  const isRolledBack = data?.status === 'rolled_back';

  // Filter operations
  const filteredOperations = useMemo(() => {
    return operations.filter((op) => {
      // Event filter
      if (selectedEvent !== 'ALL' && op.eventFolder !== selectedEvent) return false;

      // Action filter
      if (selectedAction !== 'ALL' && op.action !== selectedAction) return false;

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const fn = (op.fileName || '').toLowerCase();
      const src = (op.sourcePath || '').toLowerCase();
      const ev = (op.eventFolder || '').toLowerCase();
      return fn.includes(q) || src.includes(q) || ev.includes(q);
    });
  }, [operations, selectedEvent, selectedAction, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredOperations.length / ITEMS_PER_PAGE));
  const paginatedOperations = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOperations.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOperations, currentPage]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-6xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] text-slate-800">
        
        {/* Top Header */}
        <div className="p-4 px-6 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Consolidation & Cleanup Audit Hub</h3>
                {data?.allTransactions?.length > 1 ? (
                  <select
                    value={data?.transactionId || ''}
                    onChange={(e) => handleSwitchTransaction(e.target.value)}
                    className="font-mono text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-none focus:border-emerald-400 cursor-pointer"
                  >
                    {data.allTransactions.map((t) => (
                      <option key={t.transactionId} value={t.transactionId}>
                        {t.transactionId} ({new Date(t.createdAt).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 font-semibold">
                    {data?.transactionId}
                  </span>
                )}

                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    isRolledBack ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {isRolledBack ? 'Rolled Back' : 'Completed'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Library: {data?.masterFolder || 'All Discovered Events'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                window.location.href = data?.transactionId ? `/audit/${data.transactionId}` : '/audit';
              }}
              title="Open full dedicated page without popup"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Dedicated Page</span>
            </button>

            {!isRolledBack && (
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

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top KPI Metrics Strip */}
        <div className="grid grid-cols-4 gap-3 p-4 px-6 border-b border-slate-100 bg-white shrink-0">
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
            <span className="text-[10.5px] font-semibold text-emerald-800 block">Originals Preserved</span>
            <span className="text-xl font-bold font-mono text-emerald-900">{summary.keptCount || 0}</span>
            <span className="text-[9.5px] text-emerald-700 block mt-0.5">Kept in respective event folders</span>
          </div>

          <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/80">
            <span className="text-[10.5px] font-semibold text-rose-800 block">Quarantined Copies</span>
            <span className="text-xl font-bold font-mono text-rose-900">{summary.deletedCount || operations.length}</span>
            <span className="text-[9.5px] text-rose-700 block mt-0.5">Freed: {formatBytes(summary.freedBytes)}</span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80">
            <span className="text-[10.5px] font-semibold text-amber-800 block">Upgraded & Moved</span>
            <span className="text-xl font-bold font-mono text-amber-900">{summary.upgradedCount || 0}</span>
            <span className="text-[9.5px] text-amber-700 block mt-0.5">High-res copies routed to events</span>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/80">
            <span className="text-[10.5px] font-semibold text-indigo-800 block">Event Folders Impacted</span>
            <span className="text-xl font-bold font-mono text-indigo-900">{events.length}</span>
            <span className="text-[9.5px] text-indigo-700 block mt-0.5">Organized & deduplicated</span>
          </div>
        </div>

        {/* Controls Bar: Action Filters & Search */}
        <div className="p-3 px-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setSelectedAction('ALL'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                selectedAction === 'ALL'
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Files ({operations.length})
            </button>
            <button
              onClick={() => { setSelectedAction('DELETE'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                selectedAction === 'DELETE'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-rose-700 hover:bg-rose-50'
              }`}
            >
              Quarantined ({operations.filter((o) => o.action === 'DELETE').length})
            </button>
            {operations.some((o) => o.action === 'KEEP') && (
              <button
                onClick={() => { setSelectedAction('KEEP'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedAction === 'KEEP'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                Kept in Events ({operations.filter((o) => o.action === 'KEEP').length})
              </button>
            )}
            {operations.some((o) => o.action === 'MOVE_UPGRADE') && (
              <button
                onClick={() => { setSelectedAction('MOVE_UPGRADE'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedAction === 'MOVE_UPGRADE'
                    ? 'bg-amber-700 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-amber-700 hover:bg-amber-50'
                }`}
              >
                Upgrades ({operations.filter((o) => o.action === 'MOVE_UPGRADE').length})
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search filename or event folder..."
              className="pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-400 w-64 font-mono"
            />
          </div>
        </div>

        {/* Main Body: Left Event Sidebar + Right Visual Card Grid */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Event Folder Filter Sidebar */}
          <div className="w-64 border-r border-slate-200 bg-slate-50/50 flex flex-col shrink-0">
            <div className="p-3 border-b border-slate-200 font-bold text-[11px] text-slate-600 uppercase tracking-wider flex items-center justify-between">
              <span>Event Folders ({events.length})</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              <button
                type="button"
                onClick={() => { setSelectedEvent('ALL'); setCurrentPage(1); }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center justify-between cursor-pointer ${
                  selectedEvent === 'ALL'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-200/60'
                }`}
              >
                <span>All Event Folders</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${selectedEvent === 'ALL' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {operations.length}
                </span>
              </button>

              {events.map((ev) => (
                <button
                  key={ev.eventName}
                  type="button"
                  onClick={() => { setSelectedEvent(ev.eventName); setCurrentPage(1); }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition flex items-center justify-between cursor-pointer ${
                    selectedEvent === ev.eventName
                      ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                      : 'text-slate-700 hover:bg-slate-200/60 font-medium'
                  }`}
                >
                  <span className="truncate pr-2" title={ev.eventName}>{ev.eventName}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 ${
                    selectedEvent === ev.eventName ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {ev.totalFiles}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Visual Card Grid (Pic Preview!) */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-100/40">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 gap-3 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="text-xs font-medium">Loading audit data with pictures...</span>
              </div>
            ) : filteredOperations.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 text-xs">
                No files found for this filter combination.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {paginatedOperations.map((op, idx) => (
                    <AuditFileCard key={`${op.sourcePath}-${idx}`} op={op} />
                  ))}
                </div>
              </div>
            )}

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
              <div className="p-3 px-5 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
                <span className="text-[11px] font-mono text-slate-500">
                  Showing {paginatedOperations.length} of {filteredOperations.length} files
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono text-slate-700 font-bold">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
