import React from 'react';
import {
  RefreshCw, Pause, Play, XCircle, Folder, FolderOpen, FolderArchive, ArrowRight,
  HardDrive, Gauge, Clock, Layers, Image as ImageIcon, Film, FileText, Zap, Cpu, AlertTriangle, ShieldCheck
} from 'lucide-react';
import BatchSettingsStrip from './BatchSettingsStrip';

export default function Step3LiveProgress({
  batchProgress,
  sourcePath,
  destPath,
  videoMode,
  settings,
  onPause,
  onResume,
  onCancel
}) {
  const isRunning = batchProgress.status === 'running';
  const isPaused = batchProgress.status === 'paused';
  const stats = batchProgress.stats || {};
  const activeSettings = settings || batchProgress.settings || {};
  const bytesSaved = stats.bytesSaved || 0;
  const originalBytes = stats.originalBytesProcessed || 0;
  const savedMB = stats.savedMB ?? Math.round(bytesSaved / (1024 * 1024));
  const savedGB = stats.savedGB ?? parseFloat((bytesSaved / (1024 * 1024 * 1024)).toFixed(2));
  const savedPercent = stats.savedPercent ?? (originalBytes > 0 ? Math.round((bytesSaved / originalBytes) * 100) : 0);

  const sourceDir = batchProgress.sourceDir || sourcePath || '';
  const destDir = batchProgress.destDir || destPath || '';

  const rawPath = stats.currentFile || '';
  const normalized = rawPath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  const subfolder = lastSlash >= 0 ? normalized.substring(0, lastSlash) : 'Root Directory';
  const filename = lastSlash >= 0 ? normalized.substring(lastSlash + 1) : normalized || 'Preparing files...';
  const ext = (filename.includes('.') ? filename.split('.').pop() : '').toUpperCase();

  const isVideo = stats.currentType === 'video';
  const isImage = stats.currentType === 'image';

  const isCompleted = batchProgress.status === 'completed';
  const isFinalizingLastVideos = !isCompleted && ((stats.processed || 0) >= (stats.totalFiles || 0) || (stats.percent || 0) >= 99);
  const displayPercent = isCompleted ? 100 : Math.min(99, Math.max(0, stats.percent || 0));
  const displayProcessed = isCompleted
    ? stats.totalFiles || 0
    : Math.min(Math.max(0, (stats.totalFiles || 1) - 1), stats.processed || 0);
  const displayETA = isCompleted
    ? 'Completed'
    : isFinalizingLastVideos || stats.remainingFormatted === '0s'
    ? 'Finalizing in GPU...'
    : stats.remainingFormatted || '--:--';

  const totalPhotos = stats.totalImages || (batchProgress.files ? batchProgress.files.filter((f) => f.type === 'image').length : 0);
  const totalVideos = stats.totalVideos || (batchProgress.files ? batchProgress.files.filter((f) => f.type === 'video').length : 0);
  const totalDocs = stats.totalOthers || (batchProgress.files ? batchProgress.files.filter((f) => f.type !== 'image' && f.type !== 'video').length : 0);

  return (
    <div className="w-full space-y-3 text-slate-800">
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
        
        {/* Full-Width Header Bar: Status + Paths + Action Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${
              isRunning ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs' : 'bg-amber-50 text-amber-800 border-amber-200 shadow-2xs'
            }`}>
              {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" /> : <Pause className="w-3.5 h-3.5 text-amber-600" />}
              <span className="uppercase tracking-wide">{isRunning ? 'Optimizing Media Files' : 'Optimization Paused'}</span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 min-w-0 shadow-2xs">
              <Folder className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-slate-400 font-sans font-medium text-[11px] shrink-0">Source:</span>
              <span className="font-semibold text-slate-800 truncate max-w-xs sm:max-w-md" title={sourceDir}>{sourceDir || 'Source Directory'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mx-0.5" />
              <FolderArchive className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-slate-400 font-sans font-medium text-[11px] shrink-0">Destination:</span>
              <span className="font-semibold text-emerald-700 truncate max-w-xs sm:max-w-md" title={destDir}>{destDir || 'Optimized Output'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
            {isRunning ? (
              <button type="button" onClick={onPause} className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 hover:border-slate-300 flex items-center gap-1.5 transition cursor-pointer shadow-2xs">
                <Pause className="w-3.5 h-3.5 text-slate-500" /> <span>Pause</span>
              </button>
            ) : (
              <button type="button" onClick={onResume} className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs">
                <Play className="w-3.5 h-3.5 fill-current" /> <span>Resume</span>
              </button>
            )}
            <button type="button" onClick={onCancel} className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 flex items-center gap-1.5 transition cursor-pointer shadow-2xs">
              <XCircle className="w-3.5 h-3.5 text-rose-600" /> <span>Stop</span>
            </button>
          </div>
        </div>

        {/* Selected Settings Summary Strip */}
        <BatchSettingsStrip settings={activeSettings} />

        {/* Active Folder & File Workstream (Warm & Tech Card) */}
        <div className="bg-gradient-to-r from-amber-50/40 via-slate-50 to-blue-50/30 rounded-xl p-3 border border-slate-200/90 space-y-2">
          {/* Top Line: Active Subfolder & Counter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-slate-500 font-semibold uppercase text-[11px] tracking-wide shrink-0">Active Subfolder:</span>
              <span className="font-bold text-amber-900 font-mono bg-white border border-amber-200/80 px-2 py-0.5 rounded-md truncate max-w-xl shadow-2xs" title={subfolder}>
                {subfolder}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 font-mono text-xs text-slate-600">
              <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-bold text-emerald-700 shadow-2xs">
                {displayProcessed.toLocaleString()}
              </span>
              <span className="text-slate-400">of</span>
              <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-semibold text-slate-700 shadow-2xs">
                {(stats.totalFiles || 0).toLocaleString()}
              </span>
              <span className="font-sans text-[11px] text-slate-500">files</span>
            </div>
          </div>

          {/* Current File Line */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white rounded-lg px-3 py-2 border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              {isVideo ? (
                <Film className="w-4 h-4 text-amber-500 shrink-0" />
              ) : isImage ? (
                <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />
              ) : (
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
              )}
              <span className="text-xs font-mono font-bold text-slate-900 truncate max-w-2xl" title={filename}>
                {filename}
              </span>
              {ext && (
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                  isVideo ? 'bg-amber-50 text-amber-800 border-amber-200' : isImage ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  {ext}
                </span>
              )}
            </div>

            {/* Acceleration Tag */}
            <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-md shrink-0 border ${
              isPaused
                ? 'bg-slate-100 text-slate-700 border-slate-200'
                : isVideo
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              {isPaused ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-600" />
                  <span>Engine Paused / In Standby</span>
                </>
              ) : isVideo ? (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  <span>Intel QSV Video Fast Engine Active</span>
                </>
              ) : (
                <>
                  <Cpu className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Multi-Core NVMe Image Acceleration Active</span>
                </>
              )}
            </div>
          </div>

          {/* Compact User-Friendly Pause Bar */}
          {isPaused && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-xs">
              <div className="flex items-center gap-2 text-amber-900">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="font-bold">Paused</span>
                <span className="text-amber-700/80 text-[11px]">• System in idle standby</span>
              </div>
              <button
                type="button"
                onClick={onResume}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-md text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Resume Now</span>
              </button>
            </div>
          )}
        </div>

        {/* Full-Width Progress Bar */}
        <div className="space-y-1.5 pt-0.5">
          <div className="flex justify-between items-baseline">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-slate-900">{displayPercent}%</span>
              <span className="text-xs font-medium text-slate-500">
                {isCompleted ? 'completed' : isFinalizingLastVideos ? 'Finalizing in GPU...' : 'completed'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <strong className="text-emerald-700 font-bold">{displayProcessed.toLocaleString()}</strong>
              <span className="text-slate-400">/</span>
              <span className="text-slate-700 font-semibold">{(stats.totalFiles || 0).toLocaleString()}</span>
              <span className="text-slate-500 font-sans text-xs">
                {isFinalizingLastVideos ? 'files (finalizing last video)' : 'files processed'}
              </span>
            </div>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-100 border border-slate-200 overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 rounded-full transition-all duration-300 shadow-xs"
              style={{ width: `${displayPercent}%` }}
            />
          </div>
        </div>

        {/* Harmonious 4-Card Dashboard Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-0.5">
          {/* Card 1: Space Saved */}
          <div className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-200/80 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-[10px] font-bold uppercase tracking-wider">Space Saved</span>
              <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-extrabold text-emerald-700 font-mono">{savedGB >= 1 ? `${savedGB} GB` : `${savedMB || 0} MB`}</div>
            <span className="text-[11px] text-emerald-800/80 font-mono block">-{savedPercent || 0}% disk space reduced</span>
          </div>

          {/* Card 2: Throughput Speed */}
          <div className="p-3 rounded-xl bg-blue-50/30 border border-blue-200/80 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-blue-800">
              <span className="text-[10px] font-bold uppercase tracking-wider">Throughput Speed</span>
              <Gauge className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 font-mono truncate">{stats.currentSpeed || '0.0 items/s'}</div>
            <span className="text-[11px] text-blue-700/80 font-medium block truncate">Direct NVMe / SSD Engine</span>
          </div>

          {/* Card 3: Time Remaining */}
          <div className="p-3 rounded-xl bg-amber-50/40 border border-amber-200/80 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-amber-800">
              <span className="text-[10px] font-bold uppercase tracking-wider">Time Remaining (ETA)</span>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-xl font-extrabold text-amber-800 font-mono truncate">{displayETA}</div>
            <div className="flex items-center justify-between text-[11px] text-amber-800/80 font-mono pt-0.5">
              <span>Elapsed: {stats.elapsedFormatted || '0s'}</span>
              {(isVideo || isFinalizingLastVideos) && <span className="text-[9px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-sans font-semibold">Heavy Video Queue</span>}
            </div>
          </div>

          {/* Card 4: Media Breakdown */}
          <div className="p-3 rounded-xl bg-indigo-50/30 border border-indigo-200/80 shadow-2xs space-y-1.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-indigo-900">
              <span className="text-[10px] font-bold uppercase tracking-wider">Processed Files</span>
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="grid grid-cols-3 gap-1 text-center font-mono">
              {[
                { label: 'Photos', done: stats.imagesDone, total: totalPhotos, color: 'text-blue-700' },
                { label: 'Videos', done: stats.videosDone, total: totalVideos, color: 'text-amber-700' },
                { label: 'Docs', done: stats.othersDone, total: totalDocs, color: 'text-slate-700' }
              ].map((m) => (
                <div key={m.label} className="bg-white/95 p-1 rounded border border-slate-200/90 shadow-2xs">
                  <span className="text-[9px] text-slate-500 font-sans block">{m.label}</span>
                  <div className={`text-xs font-bold ${m.color} flex items-center justify-center gap-0.5`}>
                    <span>{(m.done || 0).toLocaleString()}</span>
                    {m.total > 0 && <span className="text-slate-400 font-normal text-[10px]">/{m.total.toLocaleString()}</span>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-sans pt-0.5 border-t border-indigo-100/90">
              <span className="flex items-center gap-1 text-emerald-800 font-semibold" title="Quality Guard: Files already small/compressed kept in original quality">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Quality Kept:
              </span>
              <span className="font-mono font-bold text-emerald-700">
                {(stats.preservedOptimal || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Subdued Safe Bypass Note */}
        {batchProgress.failedFilesCount > 0 && (
          <div className="py-2 px-3 rounded-lg bg-amber-50/60 border border-amber-200/80 text-xs text-amber-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>{batchProgress.failedFilesCount} file(s) safely bypassed without error.</span>
            </div>
            <span className="text-[11px] font-semibold text-amber-950 underline">Safe fallback active</span>
          </div>
        )}
      </div>
    </div>
  );
}
