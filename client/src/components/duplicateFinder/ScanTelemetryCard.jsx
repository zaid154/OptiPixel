import React from 'react';
import { Activity, Clock, Zap, FolderSearch, Loader2 } from 'lucide-react';

export default function ScanTelemetryCard({ telemetry }) {
  if (!telemetry) return null;

  const {
    processed = 0,
    total = 0,
    currentFile = 'Discovering directory structure...',
    percent = 0,
    itemsPerSec = '0',
    elapsedSeconds = 0,
    stage = 'discovering'
  } = telemetry;

  const remainingFiles = Math.max(0, total - processed);
  const rate = parseFloat(itemsPerSec) || 0;
  const etaSeconds = rate > 0 ? Math.round(remainingFiles / rate) : 0;

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
      {telemetry.activeRootPath && (
        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 pb-2 border-b border-slate-100 truncate">
          <span className="uppercase text-emerald-700 font-bold tracking-wider">Folder:</span>
          <span className="text-slate-800 font-semibold truncate" title={telemetry.activeRootPath}>
            {telemetry.activeRootPath}
          </span>
        </div>
      )}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 max-w-[70%]">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
          </span>
          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
            {stage === 'discovering' && <FolderSearch className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />}
            {stage === 'clustering' && <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />}
            <span>
              {stage === 'discovering'
                ? 'Discovering Media Files...'
                : stage === 'clustering'
                ? 'Clustering & Matching Hashes...'
                : 'Analyzing Media & Hashing...'}
            </span>
          </span>
          <span className="text-slate-500 font-mono text-[11px] truncate" title={currentFile}>
            ({currentFile})
          </span>
        </div>
        <div className="font-mono font-bold text-emerald-700 text-sm">
          {total > 0 ? (
            <>
              {percent}%{' '}
              <span className="text-slate-500 font-normal text-xs">
                ({processed.toLocaleString()} / {total.toLocaleString()})
              </span>
            </>
          ) : (
            <span className="text-emerald-700 text-xs font-semibold animate-pulse">Indexing tree...</span>
          )}
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${
            total === 0
              ? 'w-full bg-emerald-400 animate-pulse'
              : 'bg-emerald-600'
          }`}
          style={total > 0 ? { width: `${percent}%` } : {}}
        />
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-3 gap-2.5 pt-1 text-[11px] font-mono">
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-600" />
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-semibold">Speed</span>
            <span className="text-slate-800 font-bold">{itemsPerSec} items/s</span>
          </div>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-600" />
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-semibold">Elapsed</span>
            <span className="text-slate-800 font-bold">{formatTime(elapsedSeconds)}</span>
          </div>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-600" />
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-semibold">ETA</span>
            <span className="text-slate-800 font-bold">{total > 0 ? formatTime(etaSeconds) : 'Calculating...'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
