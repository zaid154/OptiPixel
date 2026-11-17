import React, { useState } from 'react';
import { CheckCircle2, Layers, HardDrive, Sparkles, Folder, Clock, ShieldCheck, X, Check, ArrowDownCircle } from 'lucide-react';

export default function ScanSummaryCard({
  groups = [],
  rootPath = '',
  telemetry = null,
  selectedCount = 0,
  selectedBytes = 0,
  onAutoSelectKeepBest,
  onDismiss
}) {
  const [justApplied, setJustApplied] = useState(false);

  if (!groups || groups.length === 0) return null;

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const totalCopies = groups.reduce((acc, g) => acc + (g.files?.length || 0), 0);
  const totalWasted = groups.reduce((acc, g) => acc + (g.wastedBytes || 0), 0);

  const exactCount = groups.filter((g) => g.matchType === 'exact_sha256').length;
  const pixelCount = groups.filter((g) => g.matchType === 'raw_pixel').length;
  const visualCount = groups.filter((g) => g.matchType !== 'exact_sha256' && g.matchType !== 'raw_pixel').length;

  const elapsed = telemetry?.elapsedSeconds
    ? `${Math.floor(telemetry.elapsedSeconds / 60)}m ${telemetry.elapsedSeconds % 60}s`
    : null;

  const isApplied = selectedCount > 0;

  const handleApplyClick = () => {
    setJustApplied(true);
    setTimeout(() => setJustApplied(false), 2200);
    onAutoSelectKeepBest?.();
  };

  return (
    <div className="bg-gradient-to-r from-emerald-50/80 via-white to-teal-50/60 border border-emerald-200/90 rounded-2xl p-4 shadow-xs space-y-3 text-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-emerald-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-2xs">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-900">Scan Complete & Verified</span>
              {elapsed && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-100 text-emerald-800">
                  <Clock className="w-2.5 h-2.5 inline mr-1" />
                  {elapsed}
                </span>
              )}
            </div>
            {rootPath && (
              <span className="text-[11px] text-slate-500 font-mono truncate max-w-md flex items-center gap-1" title={rootPath}>
                <Folder className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{rootPath}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onAutoSelectKeepBest && (
            <button
              type="button"
              onClick={handleApplyClick}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                justApplied
                  ? 'bg-emerald-700 text-white ring-2 ring-emerald-400 scale-102'
                  : isApplied
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
              title={isApplied ? `${selectedCount} duplicates already selected. Click to re-apply rule.` : 'Automatically select redundant duplicate copies to delete while keeping the best originals safe.'}
            >
              {justApplied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white animate-bounce" />
                  <span>Applied! ({selectedCount} Selected)</span>
                </>
              ) : isApplied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Smart Keep Best Active ({selectedCount} marked)</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  <span>Apply Smart Keep Best</span>
                </>
              )}
            </button>
          )}

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              title="Dismiss summary banner"
              aria-label="Dismiss summary"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-slate-500 block text-[9.5px] uppercase font-semibold">Duplicate Groups</span>
          <span className="text-slate-900 font-bold text-sm">{groups.length}</span>
          <span className="text-[10px] text-slate-500 block">({totalCopies} files)</span>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-slate-500 block text-[9.5px] uppercase font-semibold">Reclaimable Space</span>
          <span className="text-emerald-700 font-bold text-sm">{formatBytes(totalWasted)}</span>
          <span className="text-[10px] text-slate-500 block">potential savings</span>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-slate-500 block text-[9.5px] uppercase font-semibold">Exact Identicals</span>
          <span className="text-slate-900 font-bold text-sm">{exactCount}</span>
          <span className="text-[10px] text-slate-500 block">100% SHA-256 match</span>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-slate-500 block text-[9.5px] uppercase font-semibold">Pixel & Visual</span>
          <span className="text-slate-900 font-bold text-sm">{pixelCount + visualCount}</span>
          <span className="text-[10px] text-slate-500 block">perceptual matches</span>
        </div>
      </div>

      {/* Help Banner if files are marked */}
      {isApplied && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-xs">
          <div className="flex items-center gap-2 text-emerald-900 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>
              <strong>{selectedCount} duplicate files ({formatBytes(selectedBytes)})</strong> are marked for deletion. Best originals are kept safe.
            </span>
          </div>
          <span className="text-[11px] text-emerald-800 font-semibold font-mono">
            Scroll down to review cards or click "Delete ({formatBytes(selectedBytes)})"
          </span>
        </div>
      )}
    </div>
  );
}
