import React from 'react';
import { X, History, Trash2, Download, Eye, Image as ImageIcon, Film, Clock } from 'lucide-react';

export default function HistoryDrawer({
  isOpen,
  onClose,
  historyItems,
  onRestoreItem,
  onDeleteItem,
  onClearAll
}) {
  if (!isOpen) return null;

  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes)) return '0 B';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const handleDownload = (item) => {
    if (!item.compressedBlob) return;
    const ext = item.format ? item.format.toLowerCase().replace('jpeg', 'jpg') : 'webp';
    const filename = `${item.name.replace(/\.[^/.]+$/, '')}_optimized.${ext}`;
    const url = URL.createObjectURL(item.compressedBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose}></div>

      {/* Slide-out Panel */}
      <div className="relative w-full max-w-md bg-[#0D131F] border-l border-white/10 h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Persistent Session History</h3>
              <p className="text-[11px] text-slate-400">
                {historyItems.length} item{historyItems.length !== 1 ? 's' : ''} saved locally in IndexedDB
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {historyItems.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-[11px] text-rose-400 hover:text-rose-300 px-2 py-1 rounded hover:bg-rose-500/10 transition"
              >
                Clear All
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {historyItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Clock className="w-10 h-10 mb-3 opacity-30 text-slate-400" />
              <p className="text-sm font-semibold text-slate-300">No History Saved Yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Your compressed images and videos are automatically saved here so they are never lost when you refresh or leave.
              </p>
            </div>
          ) : (
            historyItems.map((item) => (
              <div
                key={item.id}
                className="bg-[#111827] border border-white/[0.08] hover:border-white/20 rounded-xl p-3.5 flex flex-col gap-3 transition group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 border border-white/[0.06] flex items-center justify-center shrink-0">
                      {item.type === 'video' ? (
                        <Film className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-white truncate" title={item.name}>
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span className="uppercase font-mono font-bold text-slate-300">
                          {item.format}
                        </span>
                        <span>•</span>
                        <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    -{item.percentageSaved}%
                  </span>
                </div>

                {/* Size stats */}
                <div className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-slate-950/60 border border-white/[0.04]">
                  <span className="text-[11px] text-slate-400">
                    {formatBytes(item.originalSize)}
                  </span>
                  <span className="text-slate-400">➔</span>
                  <span className="text-[11px] font-bold text-emerald-300">
                    {formatBytes(item.compressedSize)}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1 border-t border-white/[0.04]">
                  <button
                    onClick={() => {
                      onRestoreItem(item);
                      onClose();
                    }}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Restore in Slider
                  </button>

                  {item.compressedBlob && (
                    <button
                      onClick={() => handleDownload(item)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
