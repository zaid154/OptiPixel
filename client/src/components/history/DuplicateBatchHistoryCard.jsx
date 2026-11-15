import React from 'react';
import { CopyCheck, RotateCcw, CheckCircle, Trash2, Archive } from 'lucide-react';

export default function DuplicateBatchHistoryCard({ batchId, items, onRestore, onDelete }) {
  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const sample = items[0] || {};
  const isQuarantine = sample.actionType === 'quarantine';
  const isRestored = items.every((i) => i.restored);
  const totalBytes = items.reduce((sum, i) => sum + (i.fileSize || 0), 0);

  return (
    <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-2xl p-4 space-y-3 shadow-md text-xs font-mono">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <CopyCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-100">Duplicate Cleaner Session</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase font-semibold">
                {sample.actionType}
              </span>
            </div>
            <span className="text-[10px] text-zinc-500">
              Batch: {batchId} • {new Date(sample.deletedAt).toLocaleTimeString()}
            </span>
          </div>
        </div>

        {onDelete && (
          <button onClick={() => onDelete(batchId)} className="text-zinc-500 hover:text-rose-400 transition p-1">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/60 text-[11px]">
        <div>
          <span className="text-zinc-500 block text-[9px] uppercase">Files Cleaned</span>
          <span className="text-zinc-200 font-bold">{items.length} duplicate files</span>
        </div>
        <div className="text-right">
          <span className="text-zinc-500 block text-[9px] uppercase">Reclaimed Space</span>
          <span className="text-emerald-400 font-bold">{formatBytes(totalBytes)}</span>
        </div>
      </div>

      {isQuarantine && (
        <div className="pt-1">
          {isRestored ? (
            <div className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-[11px]">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Fully Restored to Original Locations</span>
            </div>
          ) : (
            <button
              onClick={() => onRestore(batchId)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 font-semibold transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>1-Click Restore All Files in Batch</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
