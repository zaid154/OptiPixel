import React, { useState, useMemo } from 'react';
import {
  HardDrive, RotateCcw, CheckCircle, ChevronDown, ChevronUp,
  Search, Film, Image as ImageIcon, Trash2, ArrowUpRight, FolderPlus
} from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

const ACTION_CONFIG = {
  DELETE: { label: 'Quarantined', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  MOVE_UPGRADE: { label: 'Upgraded & Moved', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  RESCUE_MOVE: { label: 'Rescued to Event', bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
};

export default function ConsolidationHistoryCard({ item, onRollback, isRollingBack, onOpenAuditHub }) {
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const operations = item.operations || [];
  const summary = item.summary || {};
  const isRolledBack = item.status === 'rolled_back';

  const filteredOps = useMemo(() => {
    if (!searchQuery.trim()) return operations;
    const q = searchQuery.toLowerCase();
    return operations.filter((op) => {
      const src = (op.sourcePath || '').toLowerCase();
      const dest = (op.targetPath || op.quarantinePath || '').toLowerCase();
      return src.includes(q) || dest.includes(q);
    });
  }, [operations, searchQuery]);

  return (
    <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-2xl p-4 space-y-3 shadow-md text-xs font-mono">
      {/* Header */}
      <div className="flex items-start justify-between pb-2 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-100">Consolidation Session</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border uppercase font-semibold ${
                  isRolledBack
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}
              >
                {isRolledBack ? 'Rolled Back' : 'Completed'}
              </span>
            </div>
            <span className="text-[10px] text-zinc-500">
              {item.transactionId} • {new Date(item.createdAt).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* Target Directory */}
      <div className="text-[10.5px] text-zinc-400 bg-zinc-900/60 px-2.5 py-1.5 rounded-lg border border-zinc-800/60 truncate">
        <span className="text-zinc-500 uppercase mr-1">Library:</span>
        <span className="text-zinc-200" title={item.masterFolder}>{item.masterFolder}</span>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-3 gap-2 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/60 text-[11px]">
        <div>
          <span className="text-zinc-500 block text-[9px] uppercase">Kept Originals</span>
          <span className="text-emerald-400 font-bold">{summary.keptCount || 0} files</span>
        </div>
        <div>
          <span className="text-zinc-500 block text-[9px] uppercase">Quarantined</span>
          <span className="text-rose-400 font-bold">{summary.deletedCount || operations.length} files</span>
        </div>
        <div className="text-right">
          <span className="text-zinc-500 block text-[9px] uppercase">Space Freed</span>
          <span className="text-emerald-400 font-bold">{formatBytes(summary.freedBytes)}</span>
        </div>
      </div>

      {/* Dedicated Audit Hub Button */}
      {onOpenAuditHub && (
        <button
          type="button"
          onClick={() => onOpenAuditHub(item.transactionId)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[11px] transition cursor-pointer shadow-xs"
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Open Dedicated Audit Hub (with Pictures)</span>
        </button>
      )}

      {/* Accordion Toggle */}
      <div className="pt-1 flex items-center justify-between border-t border-zinc-800/60">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[11px] font-semibold text-zinc-300 hover:text-emerald-400 transition cursor-pointer"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{expanded ? 'Hide File Breakdown' : `View File Breakdown (${operations.length} files)`}</span>
        </button>

        {!isRolledBack ? (
          <button
            type="button"
            disabled={isRollingBack}
            onClick={() => onRollback(item.transactionId)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-[11px] transition cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{isRollingBack ? 'Restoring...' : 'Rollback'}</span>
          </button>
        ) : (
          <div className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Fully Restored</span>
          </div>
        )}
      </div>

      {/* Expanded File List */}
      {expanded && (
        <div className="pt-2 border-t border-zinc-800/60 space-y-2 animate-in fade-in duration-150">
          {/* Search box inside card */}
          <div className="relative">
            <Search className="w-3 h-3 text-zinc-500 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search file name or folder..."
              className="w-full pl-7 pr-2.5 py-1 text-[10.5px] rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {filteredOps.length === 0 ? (
              <div className="text-center py-4 text-[10.5px] text-zinc-500">No matching files found.</div>
            ) : (
              filteredOps.map((op, idx) => {
                const fileName = (op.sourcePath || '').split(/[/\\]/).pop();
                const isVideo = /\.(mp4|mov|avi|mkv|webm)$/i.test(fileName);
                const cfg = ACTION_CONFIG[op.action] || ACTION_CONFIG.DELETE;
                const dest = op.targetPath || op.quarantinePath || 'Quarantine';

                return (
                  <div key={idx} className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-2 space-y-1 text-[10.5px]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        {isVideo ? <Film className="w-3 h-3 text-zinc-400 shrink-0" /> : <ImageIcon className="w-3 h-3 text-zinc-400 shrink-0" />}
                        <span className="text-zinc-100 font-bold truncate" title={fileName}>
                          {fileName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${cfg.bg}`}>
                          {cfg.label}
                        </span>
                        <span className="text-zinc-400 text-[10px]">{formatBytes(op.originalSize)}</span>
                      </div>
                    </div>

                    <div className="text-[9.5px] text-zinc-400 space-y-0.5 bg-black/40 p-1.5 rounded border border-zinc-800/80">
                      <div className="truncate"><strong className="text-zinc-500">FROM:</strong> {op.sourcePath}</div>
                      <div className="truncate"><strong className="text-zinc-500">TO:</strong> {dest}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
