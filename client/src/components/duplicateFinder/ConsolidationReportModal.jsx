import React, { useState, useMemo } from 'react';
import {
  X, CheckCircle2, Trash2, ArrowUpRight, FolderPlus,
  Search, ChevronLeft, ChevronRight, RotateCcw,
  HardDrive, FileText, ArrowRight, ShieldCheck, Folder, Film, Image as ImageIcon
} from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

const ACTION_CONFIG = {
  DELETE: {
    label: 'Quarantined',
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: Trash2,
  },
  MOVE_UPGRADE: {
    label: 'Upgraded & Moved',
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: ArrowUpRight,
  },
  RESCUE_MOVE: {
    label: 'Rescued to Event',
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: FolderPlus,
  },
};

export default function ConsolidationReportModal({
  isOpen,
  onClose,
  report,
  onRollback,
  isRollingBack = false,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  const operations = report?.operations || [];
  const summary = report?.summary || {};
  const transactionId = report?.transactionId || '';
  const isRolledBack = report?.status === 'rolled_back';

  // Filter & Search operations
  const filteredOps = useMemo(() => {
    return operations.filter((op) => {
      // Action filter
      if (activeFilter !== 'ALL' && op.action !== activeFilter) return false;

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const src = (op.sourcePath || '').toLowerCase();
      const dest = (op.targetPath || op.quarantinePath || '').toLowerCase();
      return src.includes(q) || dest.includes(q);
    });
  }, [operations, activeFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredOps.length / ITEMS_PER_PAGE));
  const paginatedOps = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOps.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOps, currentPage]);

  if (!isOpen || !report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-800">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Consolidation Audit Report</h3>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 font-semibold">
                  {transactionId}
                </span>
                {isRolledBack && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                    Rolled Back
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Master Library: {report.masterFolder || 'All Discovered Events'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Stats Row */}
        <div className="grid grid-cols-4 gap-3 p-4 border-b border-slate-100 bg-white shrink-0">
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
            <span className="text-[10.5px] font-semibold text-emerald-800 block">Originals Kept</span>
            <span className="text-lg font-bold font-mono text-emerald-900">{summary.keptCount || 0}</span>
            <span className="text-[9.5px] text-emerald-700 block mt-0.5">Preserved in events</span>
          </div>

          <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/80">
            <span className="text-[10.5px] font-semibold text-rose-800 block">Quarantined Copies</span>
            <span className="text-lg font-bold font-mono text-rose-900">{summary.deletedCount || operations.length}</span>
            <span className="text-[9.5px] text-rose-700 block mt-0.5">Freed: {formatBytes(summary.freedBytes)}</span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80">
            <span className="text-[10.5px] font-semibold text-amber-800 block">Upgraded & Moved</span>
            <span className="text-lg font-bold font-mono text-amber-900">{summary.upgradedCount || 0}</span>
            <span className="text-[9.5px] text-amber-700 block mt-0.5">Better copies routed</span>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/80">
            <span className="text-[10.5px] font-semibold text-indigo-800 block">Rescued Missing</span>
            <span className="text-lg font-bold font-mono text-indigo-900">{summary.rescuedCount || 0}</span>
            <span className="text-[9.5px] text-indigo-700 block mt-0.5">Saved to event folders</span>
          </div>
        </div>

        {/* Controls Bar: Search & Action Filters */}
        <div className="p-3 px-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          {/* Action Filter Chips */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setActiveFilter('ALL'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeFilter === 'ALL'
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Operations ({operations.length})
            </button>
            <button
              onClick={() => { setActiveFilter('DELETE'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeFilter === 'DELETE'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-rose-700 hover:bg-rose-50'
              }`}
            >
              Quarantined ({operations.filter((o) => o.action === 'DELETE').length})
            </button>
            {operations.some((o) => o.action === 'MOVE_UPGRADE') && (
              <button
                onClick={() => { setActiveFilter('MOVE_UPGRADE'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeFilter === 'MOVE_UPGRADE'
                    ? 'bg-amber-700 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-amber-700 hover:bg-amber-50'
                }`}
              >
                Upgraded ({operations.filter((o) => o.action === 'MOVE_UPGRADE').length})
              </button>
            )}
            {operations.some((o) => o.action === 'RESCUE_MOVE') && (
              <button
                onClick={() => { setActiveFilter('RESCUE_MOVE'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeFilter === 'RESCUE_MOVE'
                    ? 'bg-indigo-700 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-indigo-700 hover:bg-indigo-50'
                }`}
              >
                Rescued ({operations.filter((o) => o.action === 'RESCUE_MOVE').length})
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search file or folder..."
              className="pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-400 w-56 font-mono"
            />
          </div>
        </div>

        {/* File-by-File Breakdown List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/30">
          {filteredOps.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              No file operations match your search filter.
            </div>
          ) : (
            paginatedOps.map((op, idx) => {
              const cfg = ACTION_CONFIG[op.action] || ACTION_CONFIG.DELETE;
              const ActionIcon = cfg.icon;
              const fileName = (op.sourcePath || '').split(/[/\\]/).pop();
              const isVideo = /\.(mp4|mov|avi|mkv|webm)$/i.test(fileName);
              const destPath = op.targetPath || op.quarantinePath || 'Quarantine Storage';

              return (
                <div
                  key={`${op.sourcePath}-${idx}`}
                  className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs hover:border-slate-300 transition space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 truncate">
                      <div className="p-1.5 rounded-lg bg-slate-100 text-slate-500 shrink-0">
                        {isVideo ? <Film className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                      </div>
                      <span className="font-mono font-bold text-slate-900 truncate" title={fileName}>
                        {fileName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10.5px] font-bold uppercase ${cfg.bg}`}>
                        <ActionIcon className="w-3 h-3" />
                        <span>{cfg.label}</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 font-semibold">
                        {formatBytes(op.originalSize)}
                      </span>
                    </div>
                  </div>

                  {/* Path routing: Source -> Destination */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 font-mono text-[10.5px] border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-slate-600 truncate bg-slate-50 p-1.5 rounded-lg border border-slate-150">
                      <span className="text-slate-400 font-bold shrink-0">FROM:</span>
                      <span className="truncate text-slate-700" title={op.sourcePath}>{op.sourcePath}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600 truncate bg-slate-50 p-1.5 rounded-lg border border-slate-150">
                      <span className="text-slate-400 font-bold shrink-0">TO:</span>
                      <span className="truncate text-slate-700" title={destPath}>{destPath}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Pagination & Action Buttons */}
        <div className="p-3 px-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          {/* Pagination Controls */}
          {totalPages > 1 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono text-slate-600 font-semibold">
                Page {currentPage} of {totalPages} ({filteredOps.length} items)
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
          ) : (
            <span className="text-[11px] font-mono text-slate-500">
              Showing {filteredOps.length} file operations
            </span>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!isRolledBack && onRollback && (
              <button
                type="button"
                disabled={isRollingBack}
                onClick={() => onRollback(transactionId)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isRollingBack ? 'Restoring Files...' : 'Undo Consolidation'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
