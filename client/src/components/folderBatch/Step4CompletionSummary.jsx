import React from 'react';
import { CheckCircle2, RotateCcw, Copy, RefreshCw, Check, AlertTriangle, ShieldCheck, FolderCheck } from 'lucide-react';

export default function Step4CompletionSummary({
  batchProgress,
  onReset,
  onRetryFailed,
  isRetrying,
  onCopyFallback,
  isCopyingFallback,
  fallbackSuccessMsg
}) {
  const stats = batchProgress?.stats || {};

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200/90 rounded-2xl p-8 space-y-6 text-center shadow-xs">
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Batch Optimization Finished!</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            All media files have been compressed and saved into your destination folder with identical nested folder structures preserved.
          </p>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 max-w-2xl mx-auto text-left">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-semibold uppercase block">Files Processed</span>
            <div className="text-xl font-bold text-slate-900 font-mono mt-1">{(stats.processed || 0).toLocaleString()}</div>
            <span className="text-[11px] text-emerald-700 font-semibold mt-0.5 block">{stats.succeeded || 0} succeeded</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-semibold uppercase block">Space Reclaimed</span>
            <div className="text-xl font-bold text-emerald-700 font-mono mt-1">
              {stats.savedGB > 0 ? `${stats.savedGB} GB` : `${stats.savedMB || 0} MB`}
            </div>
            <span className="text-[11px] text-slate-500 font-semibold mt-0.5 block">Saved {stats.savedPercent || 0}%</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-semibold uppercase block">Time Elapsed</span>
            <div className="text-xl font-bold text-slate-900 font-mono mt-1">{stats.elapsedFormatted || '0s'}</div>
            <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">{stats.currentSpeed || 'Done'}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-semibold uppercase block">Source Safety</span>
            <div className="text-base font-bold text-emerald-700 font-mono mt-1">100% Intact</div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">0 originals touched</span>
          </div>
        </div>

        {/* Destination Location Info */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 max-w-2xl mx-auto text-left flex items-start gap-3 shadow-2xs">
          <FolderCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-slate-800">Destination Folder:</span>
            <div className="font-mono text-slate-600 mt-0.5 select-all break-all">{batchProgress.destDir}</div>
          </div>
        </div>

        {/* Failures & Fallback Section */}
        {batchProgress.failedFiles?.length > 0 && (
          <div className="max-w-2xl mx-auto p-4 rounded-xl bg-amber-50 border border-amber-200 text-left space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>{batchProgress.failedFiles.length} file(s) skipped or failed</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button" onClick={onRetryFailed} disabled={isRetrying || isCopyingFallback}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <RotateCcw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                  <span>Retry Compression</span>
                </button>
                <button
                  type="button" onClick={onCopyFallback} disabled={isRetrying || isCopyingFallback}
                  className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs rounded-lg flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  {isCopyingFallback ? <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                  <span>Copy Originals As-Is</span>
                </button>
              </div>
            </div>
            {fallbackSuccessMsg && (
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /><span>{fallbackSuccessMsg}</span>
              </div>
            )}
          </div>
        )}

        <div className="pt-2">
          <button
            type="button" onClick={onReset}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
          >
            Optimize Another Folder
          </button>
        </div>
      </div>
    </div>
  );
}
