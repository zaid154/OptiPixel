import React from 'react';
import { Trash2, Check, Folder, Undo2 } from 'lucide-react';

export default function SmartSelectStickyBar({
  selectedCount = 0,
  selectedBytes = 0,
  masterFolder,
  lastTransactionId,
  onAutoSelectRule,
  onOpenActionModal,
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
      {/* 1. Left: Selection Metrics */}
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl border shadow-2xs ${
          selectedCount > 0 ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
        }`}>
          <Trash2 className="w-4 h-4" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-800 flex items-center gap-2">
            <span>Marked For Deletion:</span>
            <span className={`font-mono font-bold ${selectedCount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
              {selectedCount} files
            </span>
            {masterFolder && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-mono font-medium max-w-[180px] truncate" title={`Organized target: ${masterFolder}`}>
                <Folder className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="truncate">{masterFolder.split(/[\\/]/).pop()}</span>
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {selectedCount > 0 ? (
              <>Space to free: <span className="text-emerald-700 font-bold">{formatBytes(selectedBytes)}</span> (Best originals kept safe)</>
            ) : (
              'All files currently safe. Click "Keep Best" to auto-select redundant copies.'
            )}
          </span>
        </div>
      </div>

      {/* 2. Center: Quick Selection Rules */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-1 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => onAutoSelectRule('keep_best_quality')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold transition shadow-xs cursor-pointer hover:bg-emerald-700"
            title="Automatically keep highest resolution and clarity copy across all groups"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Keep Best</span>
          </button>
          <button
            type="button"
            onClick={() => onAutoSelectRule('keep_oldest')}
            className="px-2.5 py-1.5 rounded-lg hover:bg-white text-slate-700 hover:text-slate-900 transition font-medium cursor-pointer"
            title="Keep oldest original files and mark newer copies for removal"
          >
            Oldest
          </button>
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={() => onAutoSelectRule('deselect_all')}
              className="px-2.5 py-1.5 rounded-lg hover:bg-white text-slate-500 hover:text-slate-800 transition cursor-pointer"
              title="Uncheck all files"
            >
              Deselect All
            </button>
          )}
        </div>

        {/* Undo Consolidation Button (Only when available) */}
        {lastTransactionId && onRollbackConsolidation && (
          <button
            type="button"
            onClick={() => onRollbackConsolidation(lastTransactionId)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold transition shadow-2xs animate-pulse cursor-pointer"
            title="Reverse the last consolidation operation"
          >
            <Undo2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Undo Move</span>
          </button>
        )}

        {/* Optional: Consolidate to Event Folders */}
        {onOpenPriorityModal && (
          <button
            type="button"
            onClick={onOpenPriorityModal}
            title="Upgrade best quality photos into your event folders and remove bad duplicates"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition shadow-2xs cursor-pointer"
          >
            <Folder className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Move to Events</span>
          </button>
        )}

        {/* 3. Right: Primary Action Button (Clean, Bold, Unmistakable) */}
        <button
          type="button"
          onClick={onOpenActionModal}
          disabled={selectedCount === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition shadow-md cursor-pointer ml-1"
          title={selectedCount === 0 ? 'No files selected to delete' : `Click to safely delete or quarantine ${selectedCount} files`}
        >
          <Trash2 className="w-4 h-4" />
          <span>{selectedCount > 0 ? `Delete (${formatBytes(selectedBytes)})` : 'Select Files to Delete'}</span>
        </button>
      </div>
    </div>
  );
}
