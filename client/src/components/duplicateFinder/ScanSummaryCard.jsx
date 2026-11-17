import React from 'react';
import { CheckCircle2, Layers, HardDrive, Sparkles, Folder, Clock, ShieldCheck, X } from 'lucide-react';

export default function ScanSummaryCard({
  groups = [],
  rootPath = '',
  telemetry = null,
  onAutoSelectKeepBest,
  onDismiss
}) {
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
              <span className="text-[11px] text-slate-500 font-mono truncate max-w-md block" title={rootPath}>
                📁 {rootPath}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onAutoSelectKeepBest && (
            <button
              type="button"
              onClick={onAutoSelectKeepBest}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              title="Automatically keep clean filenames in organized subfolders"
            >
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              <span>Apply Smart Keep Best</span>
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
    </div>
  );
}
