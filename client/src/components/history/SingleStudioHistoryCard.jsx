import React from 'react';
import { Image as ImageIcon, Film, Download, Eye, Trash2 } from 'lucide-react';

export default function SingleStudioHistoryCard({ item, onRestore, onDelete }) {
  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes)) return '0 B';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const handleDownload = () => {
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

  const isVideo = item.type === 'video';

  return (
    <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-3.5 space-y-3 text-xs shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 max-w-[80%]">
          <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300">
            {isVideo ? <Film className="w-3.5 h-3.5 text-sky-400" /> : <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />}
          </div>
          <div className="truncate">
            <span className="font-semibold text-zinc-200 block truncate" title={item.name}>{item.name}</span>
            <span className="text-[10px] text-zinc-500 font-mono">
              {item.format ? item.format.toUpperCase() : 'WEBP'} • {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        <span className="text-emerald-400 font-bold font-mono text-[11px]">
          {item.percentageSaved ? `-${item.percentageSaved}%` : '0%'}
        </span>
      </div>

      <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-[11px] font-mono">
        <span className="text-zinc-400">{formatBytes(item.originalSize)}</span>
        <span className="text-zinc-600">→</span>
        <span className="text-zinc-100 font-bold">{formatBytes(item.compressedSize)}</span>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/60">
        <button
          onClick={() => onRestore(item)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-emerald-400 font-semibold text-[11px] transition border border-zinc-800"
        >
          <Eye className="w-3 h-3" />
          <span>Restore in Slider</span>
        </button>

        {item.compressedBlob && (
          <button onClick={handleDownload} title="Download" className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition border border-zinc-800">
            <Download className="w-3.5 h-3.5" />
          </button>
        )}

        <button onClick={() => onDelete(item.id)} title="Delete" className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 transition border border-zinc-800">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
