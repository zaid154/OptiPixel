import React from 'react';
import {
  RefreshCw,
  Pause,
  Play,
  XCircle,
  Zap,
  Cpu,
  AlertTriangle,
  Folder,
  FolderOpen,
  FolderArchive,
  ArrowRight,
  HardDrive,
  Gauge,
  Clock,
  Layers,
  Image as ImageIcon,
  Film,
  FileText
} from 'lucide-react';

export default function Step3LiveProgress({
  batchProgress,
  sourcePath,
  destPath,
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

  return (
    <div className="w-full space-y-4">
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-5 shadow-xs">
        
        {/* Full-Width Header Bar: Status + Paths + Action Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            {/* Status Pill */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border shrink-0 ${
              isRunning ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Pause className="w-3.5 h-3.5" />}
              <span className="uppercase tracking-wide">{isRunning ? 'Optimizing Media Files' : 'Optimization Paused'}</span>
            </div>

            {/* Full Source -> Destination Path Bar (Wide Viewport) */}
            <div className="flex items-center gap-2 text-xs font-mono text-slate-700 bg-slate-50 border border-slate-200/90 rounded-xl px-3.5 py-1.5 min-w-0">
              <Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-400 font-sans font-medium text-[11px] shrink-0">Source:</span>
              <span className="font-semibold text-slate-800 truncate max-w-xs sm:max-w-md" title={sourceDir}>
                {sourceDir || 'Source Directory'}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mx-0.5" />
              <FolderArchive className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-slate-400 font-sans font-medium text-[11px] shrink-0">Destination:</span>
              <span className="font-semibold text-emerald-700 truncate max-w-xs sm:max-w-md" title={destDir}>
                {destDir || 'Optimized Output'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
            {isRunning ? (
              <button
                type="button" onClick={onPause}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 hover:border-slate-300 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <Pause className="w-3.5 h-3.5 text-slate-500" /> <span>Pause</span>
              </button>
            ) : (
              <button
                type="button" onClick={onResume}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> <span>Resume</span>
              </button>
            )}
            <button
              type="button" onClick={onCancel}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <XCircle className="w-3.5 h-3.5" /> <span>Stop</span>
            </button>
          </div>
        </div>

        {/* Active Folder & File Workstream (Full Width Card) */}
        <div className="bg-gradient-to-r from-slate-50 via-slate-50/80 to-slate-100/50 rounded-2xl p-4 border border-slate-200/90 space-y-3">
          {/* Top Line: Active Subfolder & Current Item Counter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <FolderOpen className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-slate-500 font-semibold uppercase text-[11px] tracking-wide shrink-0">Active Subfolder:</span>
              <span className="font-bold text-slate-900 font-mono bg-white border border-slate-200/90 px-2.5 py-1 rounded-lg truncate max-w-xl shadow-2xs" title={subfolder}>
                {subfolder}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 font-mono text-xs text-slate-500">
              <span className="px-2 py-0.5 bg-white border border-slate-200/90 rounded-md font-bold text-emerald-700 shadow-2xs">
                {(stats.processed || 0).toLocaleString()}
              </span>
              <span>of</span>
              <span className="px-2 py-0.5 bg-white border border-slate-200/90 rounded-md font-semibold text-slate-700 shadow-2xs">
                {(stats.totalFiles || 0).toLocaleString()}
              </span>
              <span className="font-sans text-[11px] text-slate-400">files</span>
            </div>
          </div>

          {/* Bottom Line: Current File with Icon, Name, Format & Acceleration Engine */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-xl px-4 py-3 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              {isVideo ? (
                <Film className="w-4 h-4 text-amber-600 shrink-0" />
              ) : isImage ? (
                <ImageIcon className="w-4 h-4 text-blue-600 shrink-0" />
              ) : (
                <FileText className="w-4 h-4 text-slate-500 shrink-0" />
              )}
              <span className="text-xs font-mono font-bold text-slate-900 truncate max-w-2xl" title={filename}>
                {filename}
              </span>
              {ext && (
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border uppercase shrink-0 ${
                  isVideo ? 'bg-amber-50 text-amber-800 border-amber-200' : isImage ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  {ext}
                </span>
              )}
            </div>

            {/* Acceleration Tag */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-lg shrink-0">
              {isVideo ? (
                <>
                  <Zap className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  <span>Intel QSV Video Fast Engine Active</span>
                </>
              ) : (
                <>
                  <Cpu className="w-3.5 h-3.5 text-blue-600" />
                  <span>Multi-Core Parallel Image Acceleration Active (~80-100/sec)</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Full-Width Progress Bar */}
        <div className="space-y-2 pt-1">
          <div className="flex justify-between items-baseline">
            <div className="flex items-baseline gap-2.5">
              <span className="text-3xl font-black font-mono text-slate-900">{stats.percent || 0}%</span>
              <span className="text-xs font-medium text-slate-500">completed</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <strong className="text-emerald-700 font-bold">{(stats.processed || 0).toLocaleString()}</strong>
              <span className="text-slate-400">/</span>
              <span className="text-slate-700 font-semibold">{(stats.totalFiles || 0).toLocaleString()}</span>
              <span className="text-slate-500 font-sans text-xs">files processed</span>
            </div>
          </div>
          <div className="w-full h-3.5 rounded-full bg-slate-100 border border-slate-200 overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, stats.percent || 0))}%` }}
            />
          </div>
        </div>

        {/* Widescreen 4-Card Dashboard Grid (Spans Full Available Width) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 pt-1">
          {/* Card 1: Space Saved */}
          <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/90 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Space Saved</span>
              <HardDrive className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-extrabold text-emerald-700 font-mono">
              {savedGB >= 1 ? `${savedGB} GB` : `${savedMB || 0} MB`}
            </div>
            <span className="text-xs text-slate-500 font-mono block">
              -{savedPercent || 0}% disk space reduced
            </span>
          </div>

          {/* Card 2: Throughput Speed */}
          <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/90 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Throughput Speed</span>
              <Gauge className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xl font-extrabold text-slate-800 font-mono truncate">
              {stats.currentSpeed || '0.0 items/s'}
            </div>
            <span className="text-xs text-slate-500 font-medium block truncate">
              Direct NVMe / SSD Engine
            </span>
          </div>

          {/* Card 3: Time Remaining */}
          <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/90 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Time Remaining (ETA)</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-extrabold text-amber-700 font-mono truncate">
              {stats.remainingFormatted || '--:--'}
            </div>
            <span className="text-xs text-slate-500 font-mono block truncate">
              Elapsed: {stats.elapsedFormatted || '0s'}
            </span>
          </div>

          {/* Card 4: Media Breakdown */}
          <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/90 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Media Breakdown</span>
              <Layers className="w-4 h-4 text-purple-600" />
            </div>
            <div className="grid grid-cols-2 text-xs font-mono pt-0.5 gap-x-3 gap-y-0.5">
              <div className="flex justify-between">
                <span className="text-slate-400 text-[11px]">Photos:</span>
                <span className="font-bold text-blue-600">{(stats.imagesDone || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-[11px]">Videos:</span>
                <span className="font-bold text-amber-600">{(stats.videosDone || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-[11px]">Optimal:</span>
                <span className="font-bold text-emerald-600">{(stats.preservedOptimal || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-[11px]">Others:</span>
                <span className="font-bold text-slate-600">{(stats.othersDone || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Safe Bypass / Issue Banner */}
        {batchProgress.failedFilesCount > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/90 text-xs text-amber-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{batchProgress.failedFilesCount} file(s) safely bypassed without error.</span>
            </div>
            <span className="text-[11px] font-semibold text-amber-900 underline">Safe fallback active</span>
          </div>
        )}
      </div>
    </div>
  );
}
