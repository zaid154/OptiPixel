import React from 'react';
import { RefreshCw, Pause, Play, XCircle, Zap, Cpu, AlertTriangle } from 'lucide-react';

export default function Step3LiveProgress({
  batchProgress,
  videoMode,
  onPause,
  onResume,
  onCancel
}) {
  const isRunning = batchProgress.status === 'running';
  const isPaused = batchProgress.status === 'paused';
  const stats = batchProgress.stats || {};
  const bytesSaved = stats.bytesSaved || 0;
  const originalBytes = stats.originalBytesProcessed || 0;
  const savedMB = stats.savedMB ?? Math.round(bytesSaved / (1024 * 1024));
  const savedGB = stats.savedGB ?? parseFloat((bytesSaved / (1024 * 1024 * 1024)).toFixed(2));
  const savedPercent = stats.savedPercent ?? (originalBytes > 0 ? Math.round((bytesSaved / originalBytes) * 100) : 0);

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-6 shadow-xs">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
              {isRunning && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              {isPaused && <Pause className="w-3.5 h-3.5 text-amber-600" />}
              <span className="uppercase tracking-wider">
                {isRunning ? 'Optimizing Media Files' : 'Optimization Paused'}
              </span>
            </div>
            <div className="text-sm font-mono text-slate-800 font-semibold truncate max-w-xl">
              {stats.currentFile || 'Processing files...'}
            </div>
            {stats.currentType === 'video' && isRunning && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                <span>Intel Iris Xe QSV VeryFast Engine Active</span>
              </div>
            )}
            {stats.currentType === 'image' && isRunning && (
              <div className="flex items-center gap-1.5 text-xs text-blue-700 font-medium">
                <Cpu className="w-3.5 h-3.5 text-blue-600" />
                <span>Multi-Core Parallel Image Acceleration Active (~80-100/sec)</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isRunning ? (
              <button
                type="button" onClick={onPause}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 hover:border-slate-300 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <Pause className="w-3.5 h-3.5 text-slate-500" /> <span>Pause</span>
              </button>
            ) : (
              <button
                type="button" onClick={onResume}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> <span>Resume</span>
              </button>
            )}
            <button
              type="button" onClick={onCancel}
              className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <XCircle className="w-3.5 h-3.5" /> <span>Stop</span>
            </button>
          </div>
        </div>

        {/* Big Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-3xl font-extrabold font-mono text-slate-900">{stats.percent || 0}%</span>
            <span className="text-xs font-mono text-slate-500">
              <strong className="text-emerald-700">{(stats.processed || 0).toLocaleString()}</strong> / {(stats.totalFiles || 0).toLocaleString()} files
            </span>
          </div>
          <div className="w-full h-3.5 rounded-full bg-slate-100 border border-slate-200 overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, stats.percent || 0))}%` }}
            />
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-semibold uppercase block">Space Saved</span>
            <div className="text-lg font-bold text-emerald-700 font-mono mt-1">
              {savedGB >= 1 ? `${savedGB} GB` : `${savedMB || 0} MB`}
            </div>
            <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">-{savedPercent || 0}% reduced</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-semibold uppercase block">Throughput Speed</span>
            <div className="text-lg font-bold text-slate-800 font-mono mt-1">{stats.currentSpeed || 'Calculating...'}</div>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">Hardware Accelerated</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-semibold uppercase block">Time Remaining (ETA)</span>
            <div className="text-lg font-bold text-amber-700 font-mono mt-1">{stats.remainingFormatted || '--:--'}</div>
            <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">Elapsed: {stats.elapsedFormatted || '0s'}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-semibold uppercase block">Media Breakdown</span>
            <div className="text-xs text-slate-700 font-mono mt-1.5 space-y-0.5">
              <div className="flex justify-between"><span>Photos:</span><span className="text-blue-600 font-bold">{stats.imagesDone || 0}</span></div>
              <div className="flex justify-between"><span>Videos:</span><span className="text-amber-600 font-bold">{stats.videosDone || 0}</span></div>
            </div>
          </div>
        </div>

        {batchProgress.failedFiles?.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{batchProgress.failedFiles.length} file(s) encountered issues and were auto-skipped.</span>
            </div>
            <span className="text-[11px] font-semibold underline">Retry available at end</span>
          </div>
        )}
      </div>
    </div>
  );
}
