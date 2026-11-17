import React, { useState } from 'react';
import { CopyCheck, RotateCcw, CheckCircle, Trash2, ChevronDown, ChevronUp, Film, Image as ImageIcon } from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export default function DuplicateBatchHistoryCard({ batchId, items, onRestore, onDelete }) {
  const [expanded, setExpanded] = useState(false);

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
          <button onClick={() => onDelete(batchId)} className="text-zinc-500 hover:text-rose-400 transition p-1 cursor-pointer">
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

      {/* Accordion Toggle */}
      <div className="pt-1 flex items-center justify-between border-t border-zinc-800/60">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[11px] font-semibold text-zinc-300 hover:text-sky-400 transition cursor-pointer"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{expanded ? 'Hide Files' : `View Files (${items.length})`}</span>
        </button>
      </div>

      {/* Expanded File List */}
      {expanded && (
        <div className="max-h-48 overflow-y-auto space-y-1.5 pt-1 custom-scrollbar">
          {items.map((file, idx) => {
            const fileName = (file.originalPath || '').split(/[/\\]/).pop();
            const isVideo = /\.(mp4|mov|avi|mkv|webm)$/i.test(fileName);
            return (
              <div key={idx} className="bg-zinc-900/90 p-2 rounded-lg border border-zinc-800 space-y-1 text-[10.5px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    {isVideo ? <Film className="w-3 h-3 text-zinc-400 shrink-0" /> : <ImageIcon className="w-3 h-3 text-zinc-400 shrink-0" />}
                    <span className="font-bold text-zinc-100 truncate" title={fileName}>{fileName}</span>
                  </div>
                  <span className="text-zinc-400 text-[10px] font-mono shrink-0">{formatBytes(file.fileSize)}</span>
                </div>
                <div className="text-[9.5px] text-zinc-400 space-y-0.5 bg-black/40 p-1.5 rounded border border-zinc-800/80">
                  <div className="truncate"><strong className="text-zinc-500">FROM:</strong> {file.originalPath}</div>
                  {file.quarantinePath && <div className="truncate"><strong className="text-zinc-500">TO:</strong> {file.quarantinePath}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 font-semibold transition cursor-pointer"
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
