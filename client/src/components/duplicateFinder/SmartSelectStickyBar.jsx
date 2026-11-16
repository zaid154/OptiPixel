import React from 'react';
import { Trash2, Check, RotateCcw, Folder, Undo2 } from 'lucide-react';

export default function SmartSelectStickyBar({
  selectedCount,
  selectedBytes,
  masterFolder,
  lastTransactionId,
  onAutoSelectRule,
  onOpenActionModal,
  onOpenHistoryDrawer,
  onOpenPriorityModal,
  onRollbackConsolidation,
}) {
  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="sticky top-2 z-30 bg-white/95 border border-slate-200/90 rounded-2xl p-3 px-5 shadow-sm backdrop-blur-md flex flex-wrap items-center justify-between gap-4 text-slate-800">
      {/* Metrics Counter & Master Folder Status */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 shadow-2xs">
          <Trash2 className="w-4 h-4" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-800 flex items-center gap-2">
            <span>Marked For Deletion:</span>
            <span className="font-mono text-rose-600 font-bold">{selectedCount} files</span>
            {masterFolder && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-mono font-medium max-w-[180px] truncate">
                <Folder className="w-3 h-3 text-emerald-600" />
                <span>{masterFolder.split(/[\\/]/).pop()}</span>
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Reclaimable Space: <span className="text-emerald-700 font-bold">{formatBytes(selectedBytes)}</span>
          </span>
        </div>
      </div>

      {/* Auto-Select Rules & Priority Controls */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-1 rounded-xl text-xs">
          <button
            onClick={() => onAutoSelectRule('keep_best_quality')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-white text-emerald-800 hover:text-emerald-900 transition font-bold"
            title="Automatically keep highest resolution and clarity copy across all groups"
          >
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            Keep Best
          </button>
          <button
            onClick={() => onAutoSelectRule('keep_oldest')}
            className="px-2 py-1 rounded-lg hover:bg-white text-slate-700 hover:text-slate-900 transition font-medium"
          >
            Oldest
          </button>
          <button
            onClick={() => onAutoSelectRule('deselect_all')}
            className="px-2 py-1 rounded-lg hover:bg-white text-slate-500 hover:text-slate-800 transition"
          >
            Deselect All
          </button>
        </div>

        {/* Master Folder Priority Button */}
        <button
          onClick={onOpenPriorityModal}
          title="Consolidate duplicates into a master target folder"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-emerald-300 text-emerald-800 text-xs font-bold transition shadow-2xs"
        >
          <Folder className="w-3.5 h-3.5 text-emerald-600" />
          <span>Folder Priority</span>
        </button>

        {/* Undo Consolidation Button */}
        {lastTransactionId && (
          <button
            onClick={() => onRollbackConsolidation(lastTransactionId)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold transition shadow-2xs animate-pulse"
            title="Reverse the last consolidation operation"
          >
            <Undo2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Undo Move</span>
          </button>
        )}

        {/* Restore History Drawer Button */}
        <button
          onClick={onOpenHistoryDrawer}
          title="Restore past deletions"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition shadow-2xs"
        >
          <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
          <span>History</span>
        </button>

        {/* Primary Clean Action Button */}
        <button
          onClick={onOpenActionModal}
          disabled={selectedCount === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition shadow-md"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete ({formatBytes(selectedBytes)})</span>
        </button>
      </div>
    </div>
  );
}
