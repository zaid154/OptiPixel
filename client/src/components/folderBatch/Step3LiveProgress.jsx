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
  const subfolder = lastSlash >= 0 ? normalized.substring(0, lastSlash) : 'Root Folder';
  const filename = lastSlash >= 0 ? normalized.substring(lastSlash + 1) : normalized || 'Preparing files...';
  const ext = (filename.includes('.') ? filename.split('.').pop() : '').toUpperCase();

  const isVideo = stats.currentType === 'video';
  const isImage = stats.currentType === 'image';

  return (
    <div className="space-y-4">
      {/* Main Container */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-xs">
        
        {/* Top Bar: Status, Source->Dest & Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
              isRunning ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Pause className="w-3.5 h-3.5" />}
              <span className="uppercase tracking-wide">{isRunning ? 'Optimizing Media' : 'Paused'}</span>
            </div>

            {/* Source to Dest Mini Trail */}
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1">
              <Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-700 truncate max-w-[140px] sm:max-w-[200px]" title={sourceDir}>
                {sourceDir ? sourceDir.split(/[/\\]/).pop() || sourceDir : 'Source'}
              </span>
              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
              <FolderArchive className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="font-semibold text-emerald-700 truncate max-w-[140px] sm:max-w-[200px]" title={destDir}>
                {destDir ? destDir.split(/[/\\]/).pop() || destDir : 'Destination'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            {isRunning ? (
              <button
                type="button" onClick={onPause}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 hover:border-slate-300 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <Pause className="w-3.5 h-3.5 text-slate-500" /> <span>Pause</span>
              </button>
            ) : (
              <button
                type="button" onClick={onResume}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> <span>Resume</span>
              </button>
            )}
            <button
              type="button" onClick={onCancel}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <XCircle className="w-3.5 h-3.5" /> <span>Stop</span>
            </button>
          </div>
        </div>

        {/* Active Folder & File Card (What is running right now) */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100/60 rounded-xl p-3 border border-slate-200/90 space-y-2">
          {/* Subfolder Line */}
          <div className="flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <FolderOpen className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-slate-500 font-medium shrink-0">Folder:</span>
              <span className="font-bold text-slate-800 font-mono bg-white border border-slate-200 px-2 py-0.5 rounded truncate max-w-sm" title={subfolder}>
                {subfolder}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-mono text-slate-500">
              <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-bold text-emerald-700">
                {(stats.processed || 0).toLocaleString()}
              </span>
              <span>/</span>
              <span>{(stats.totalFiles || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Current File Line */}
          <div className="flex items-center justify-between gap-2 bg-white rounded-lg px-3 py-2 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              {isVideo ? (
                <Film className="w-4 h-4 text-amber-600 shrink-0" />
              ) : isImage ? (
                <ImageIcon className="w-4 h-4 text-blue-600 shrink-0" />
              ) : (
                <FileText className="w-4 h-4 text-slate-500 shrink-0" />
              )}
              <span className="text-xs font-mono font-bold text-slate-800 truncate" title={filename}>
                {filename}
              </span>
              {ext && (
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                  isVideo ? 'bg-amber-50 text-amber-700 border-amber-200' : isImage ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  {ext}
                </span>
              )}
            </div>

            {/* Acceleration Tag */}
            <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded shrink-0">
              {isVideo ? <Zap className="w-3 h-3 text-emerald-600 animate-pulse" /> : <Cpu className="w-3 h-3 text-blue-600" />}
              <span>{isVideo ? 'QSV Video Fast' : 'Multi-Core Active'}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar & Badges */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-baseline">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-slate-900">{stats.percent || 0}%</span>
              <span className="text-xs font-medium text-slate-400">completed</span>
            </div>
            <div className="flex items-center gap-1 font-mono text-xs">
              <strong className="text-emerald-700 font-bold">{(stats.processed || 0).toLocaleString()}</strong>
              <span className="text-slate-400">/</span>
              <span className="text-slate-600 font-semibold">{(stats.totalFiles || 0).toLocaleString()}</span>
              <span className="text-slate-400 text-[11px]">files</span>
            </div>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-100 border border-slate-200 overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, stats.percent || 0))}%` }}
            />
          </div>
        </div>

        {/* Compact 4-Card Dashboard Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {/* Card 1: Space Saved */}
          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/90 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Space Saved</span>
              <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-base font-extrabold text-emerald-700 font-mono">
              {savedGB >= 1 ? `${savedGB} GB` : `${savedMB || 0} MB`}
            </div>
            <span className="text-[11px] text-slate-500 font-mono block">
              -{savedPercent || 0}% reduced
            </span>
          </div>

          {/* Card 2: Speed */}
          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/90 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Throughput</span>
              <Gauge className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-base font-extrabold text-slate-800 font-mono truncate">
              {stats.currentSpeed || '0.0 items/s'}
            </div>
            <span className="text-[11px] text-slate-500 font-medium block truncate">
              Direct NVMe Engine
            </span>
          </div>

          {/* Card 3: Time Remaining */}
          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/90 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Remaining (ETA)</span>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-base font-extrabold text-amber-700 font-mono truncate">
              {stats.remainingFormatted || '--:--'}
            </div>
            <span className="text-[11px] text-slate-500 font-mono block truncate">
              Elapsed: {stats.elapsedFormatted || '0s'}
            </span>
          </div>

          {/* Card 4: Media Breakdown */}
          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/90 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Breakdown</span>
              <Layers className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="grid grid-cols-2 text-xs font-mono pt-0.5 gap-x-2">
              <div className="flex justify-between">
                <span className="text-slate-400 text-[10px]">Photo:</span>
                <span className="font-bold text-blue-600">{stats.imagesDone || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-[10px]">Video:</span>
                <span className="font-bold text-amber-600">{stats.videosDone || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-[10px]">Saved:</span>
                <span className="font-bold text-emerald-600">{stats.preservedOptimal || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-[10px]">Other:</span>
                <span className="font-bold text-slate-600">{stats.othersDone || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Skipped files note if any */}
        {batchProgress.failedFilesCount > 0 && (
          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200/80 text-xs text-amber-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>{batchProgress.failedFilesCount} file(s) safely bypassed without error.</span>
            </div>
            <span className="text-[11px] font-semibold text-amber-900 underline">Safe fallback active</span>
          </div>
        )}
      </div>
    </div>
  );
}
