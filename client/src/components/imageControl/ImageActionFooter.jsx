import React from 'react';
import { FileDown, RefreshCw } from 'lucide-react';

export default function ImageActionFooter({
  isProcessing,
  compressedSize,
  percentageSaved,
  onDownload,
  onReset
}) {
  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes)) return '0 B';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-100">
      {percentageSaved > 0 && (
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-slate-500">Output Size:</span>
          <span className="font-mono font-bold text-slate-800">
            {formatBytes(compressedSize)} <span className="text-emerald-700">(-{percentageSaved}%)</span>
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={onDownload}
        disabled={isProcessing}
        className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
      >
        {isProcessing ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <FileDown className="w-4 h-4" />
            <span>Download Optimized Image</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={onReset}
        disabled={isProcessing}
        className="w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Choose Different Image</span>
      </button>
    </div>
  );
}
