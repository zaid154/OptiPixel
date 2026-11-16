import React, { useState } from 'react';
import {
  CheckCircle2, RotateCcw, Copy, RefreshCw, Check, AlertTriangle,
  FolderCheck, HardDrive, Clock, Layers, ArrowRight, Folder, FolderArchive, Sparkles, FileSearch
} from 'lucide-react';
import BatchFileDrilldownModal from '../history/BatchFileDrilldownModal';

export default function Step4CompletionSummary({
  batchProgress,
  onReset,
  onRetryFailed,
  isRetrying,
  onCopyFallback,
  isCopyingFallback,
  fallbackSuccessMsg
}) {
  const [copied, setCopied] = useState(false);
  const [showDrilldown, setShowDrilldown] = useState(false);
  const stats = batchProgress?.stats || {};
  const origBytes = stats.originalBytesProcessed || 0;
  const compBytes = stats.compressedBytesProcessed || 0;
  const actualBytesSaved = (stats.bytesSaved && stats.bytesSaved > 0)
    ? stats.bytesSaved
    : Math.max(0, origBytes - compBytes);

  const savedMB = stats.savedMB ?? Math.round(actualBytesSaved / (1024 * 1024));
  const savedGB = stats.savedGB ?? parseFloat((actualBytesSaved / (1024 * 1024 * 1024)).toFixed(2));
  const savedPercent = stats.savedPercent ?? (origBytes > 0 ? Math.round((actualBytesSaved / origBytes) * 100) : 0);
  const origGB = parseFloat((origBytes / (1024 * 1024 * 1024)).toFixed(2));
  const compGB = parseFloat((compBytes / (1024 * 1024 * 1024)).toFixed(2));

  const sourceDir = batchProgress.sourceDir || '';
  const destDir = batchProgress.destDir || '';

  const handleCopyDest = () => {
    if (!destDir) return;
    navigator.clipboard.writeText(destDir);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full space-y-5 text-slate-800">
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-6 shadow-xs">
        
        {/* Full-Width Path Trail Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="uppercase tracking-wide">Optimization Complete</span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 min-w-0 shadow-2xs">
              <Folder className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-slate-400 font-sans font-medium text-[11px] shrink-0">Source:</span>
              <span className="font-semibold text-slate-800 truncate max-w-xs sm:max-w-md" title={sourceDir}>
                {sourceDir || 'Source Directory'}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mx-0.5" />
              <FolderArchive className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-slate-400 font-sans font-medium text-[11px] shrink-0">Destination:</span>
              <span className="font-semibold text-emerald-700 truncate max-w-xs sm:max-w-md" title={destDir}>
                {destDir || 'Optimized Output'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowDrilldown(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <FileSearch className="w-3.5 h-3.5 text-emerald-400" />
              <span>Audit & File History</span>
            </button>
            <button
              type="button" onClick={onReset}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              <span>Optimize Another Folder</span>
            </button>
          </div>
        </div>

        {/* Hero Celebration Banner */}
        <div className="py-2 text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100/70 border border-emerald-300 text-emerald-600 shadow-xs mb-1">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Batch Optimization Finished!</h2>
          <p className="text-xs text-slate-500 max-w-xl mx-auto">
            All media files have been compressed and saved into your destination folder with identical nested folder structures preserved.
          </p>
        </div>

        {/* 4 Responsive Results Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Card 1: Space Reclaimed */}
          <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200/80 shadow-2xs space-y-1.5 text-left">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-[11px] font-bold uppercase tracking-wider">Space Reclaimed</span>
              <HardDrive className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 font-mono">
              {savedGB >= 1 ? `${savedGB} GB` : `${savedMB || 0} MB`}
            </div>
            <span className="text-xs text-emerald-800/80 font-mono block">
              -{savedPercent}% reduced ({origGB}GB → {compGB}GB)
            </span>
          </div>

          {/* Card 2: Files Processed */}
          <div className="p-4 rounded-xl bg-blue-50/30 border border-blue-200/80 shadow-2xs space-y-1.5 text-left">
            <div className="flex items-center justify-between text-blue-800">
              <span className="text-[11px] font-bold uppercase tracking-wider">Files Processed</span>
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {(stats.processed || 0).toLocaleString()}
            </div>
            <span className="text-xs text-blue-700/80 font-medium block">
              {(stats.succeeded || 0).toLocaleString()} succeeded • 100% Intact
            </span>
          </div>

          {/* Card 3: Time Elapsed */}
          <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200/80 shadow-2xs space-y-1.5 text-left">
            <div className="flex items-center justify-between text-amber-800">
              <span className="text-[11px] font-bold uppercase tracking-wider">Time Elapsed</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-800 font-mono">
              {stats.elapsedFormatted || '0s'}
            </div>
            <span className="text-xs text-amber-700/80 font-mono block">
              Direct NVMe/SSD Hardware Engine
            </span>
          </div>

          {/* Card 4: Media Breakdown */}
          <div className="p-4 rounded-xl bg-indigo-50/30 border border-indigo-200/80 shadow-2xs space-y-1.5 text-left flex flex-col justify-between">
            <div className="flex items-center justify-between text-indigo-900">
              <span className="text-[11px] font-bold uppercase tracking-wider">Media Summary</span>
              <Layers className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="grid grid-cols-3 gap-1 text-center font-mono">
              <div className="bg-white/95 p-1 rounded-lg border border-slate-200/80">
                <span className="text-[9px] text-slate-500 font-sans block">Photos</span>
                <strong className="text-xs text-blue-700">{(stats.imagesDone || 0).toLocaleString()}</strong>
              </div>
              <div className="bg-white/95 p-1 rounded-lg border border-slate-200/80">
                <span className="text-[9px] text-slate-500 font-sans block">Videos</span>
                <strong className="text-xs text-amber-700">{(stats.videosDone || 0).toLocaleString()}</strong>
              </div>
              <div className="bg-white/95 p-1 rounded-lg border border-slate-200/80">
                <span className="text-[9px] text-slate-500 font-sans block">Docs</span>
                <strong className="text-xs text-slate-700">{(stats.othersDone || 0).toLocaleString()}</strong>
              </div>
            </div>
            <span className="text-[10px] text-emerald-700 font-semibold block pt-0.5">
              🛡️ {(stats.preservedOptimal || 0).toLocaleString()} files kept pristine
            </span>
          </div>
        </div>

        {/* Destination Location Info Strip */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <FolderCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-xs min-w-0">
              <span className="font-bold text-slate-800">Destination Folder:</span>
              <div className="font-mono text-slate-600 mt-0.5 truncate select-all" title={destDir}>
                {destDir}
              </div>
            </div>
          </div>
          <button
            type="button" onClick={handleCopyDest}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 flex items-center gap-1.5 transition cursor-pointer shadow-2xs shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copied ? 'Path Copied!' : 'Copy Path'}</span>
          </button>
        </div>

        {/* Failures & Fallback Section */}
        {batchProgress.failedFilesCount > 0 && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-left space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>{batchProgress.failedFilesCount} file(s) safely bypassed without error.</span>
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
      </div>

      {showDrilldown && (
        <BatchFileDrilldownModal
          batch={{
            id: batchProgress.batchId || batchProgress.id,
            sourceDir,
            destDir,
            stats,
            files: batchProgress.files || []
          }}
          onClose={() => setShowDrilldown(false)}
        />
      )}
    </div>
  );
}
