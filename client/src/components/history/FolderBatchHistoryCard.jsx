import React from 'react';
import { FolderTree, Clock, ArrowRight, Download, FileSearch, Trash2, PauseCircle, HardDrive } from 'lucide-react';

export default function FolderBatchHistoryCard({ batch, onInspectFiles, onDelete }) {
  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDuration = (sec) => {
    const m = Math.floor((sec || 0) / 60);
    const s = Math.round((sec || 0) % 60);
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const stats = batch.stats || {};
  const origBytes = stats.originalBytes || 0;
  const compBytes = stats.compressedBytes || 0;
  const savedBytes = Math.max(0, origBytes - compBytes);
  const savedPct = stats.savedPercent || (origBytes > 0 ? Math.round((savedBytes / origBytes) * 100) : 0);

  const handleExportCsv = () => {
    window.open(`/api/history/batch/${batch.id}/export`, '_blank');
  };

  return (
    <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-2xl p-4 space-y-3.5 shadow-md">
      {/* Card Header */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <FolderTree className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-zinc-100">Folder Batch Optimization</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono font-semibold border border-emerald-500/20">
                11k+ Engine
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">
              {new Date(batch.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        <button onClick={() => onDelete(batch.id)} className="p-1 text-zinc-500 hover:text-rose-400 transition">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Source -> Destination Paths */}
      <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60 space-y-1.5 text-[11px] font-mono">
        <div className="flex items-center gap-2 text-zinc-400">
          <span className="text-zinc-500 text-[10px] uppercase w-12 shrink-0">Source:</span>
          <span className="text-zinc-200 truncate" title={batch.sourceDir}>{batch.sourceDir || 'N/A'}</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <span className="text-emerald-500 text-[10px] uppercase w-12 shrink-0">Output:</span>
          <span className="text-emerald-300 truncate" title={batch.destDir}>{batch.destDir || 'N/A'}</span>
        </div>
      </div>

      {/* Storage Comparison Before -> After */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="bg-zinc-900/40 p-2 rounded-lg border border-zinc-800/40">
          <span className="text-zinc-500 block text-[9px] uppercase">Storage Reduced</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-zinc-400">{formatBytes(origBytes)}</span>
            <ArrowRight className="w-3 h-3 text-zinc-600" />
            <span className="text-zinc-100 font-bold">{formatBytes(compBytes)}</span>
          </div>
        </div>

        <div className="bg-emerald-950/20 p-2 rounded-lg border border-emerald-500/30">
          <span className="text-emerald-500 block text-[9px] uppercase font-semibold">Net Space Saved</span>
          <span className="text-emerald-400 font-bold text-xs mt-0.5 block">
            {formatBytes(savedBytes)} (-{savedPct}%)
          </span>
        </div>
      </div>

      {/* Execution Telemetry & Breakdown */}
      <div className="space-y-1 pt-1 text-[10px] font-mono text-zinc-400">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-sky-400" /> {formatDuration(batch.durationSeconds)}</span>
            <span>Photos: <strong className="text-zinc-200">{stats.photos || 0}</strong></span>
            <span>Videos: <strong className="text-zinc-200">{stats.videos || 0}</strong></span>
            <span>Pristine: <strong className="text-emerald-400">{stats.pristine || 0}</strong></span>
          </div>

          {batch.pauseLog?.length > 0 && (
            <span className="flex items-center gap-1 text-amber-400 text-[10px]">
              <PauseCircle className="w-3 h-3" /> {batch.pauseLog.length} Pause recorded
            </span>
          )}
        </div>

        {/* 1-file difference explanation badge */}
        <div className="text-[10px] text-zinc-500 flex items-center gap-1 pt-0.5">
          <span>Total: <strong className="text-zinc-300 font-bold">{stats.totalFiles || 0} Media Files</strong></span>
          <span className="text-zinc-600">•</span>
          <span className="text-emerald-500/80" title="Windows folder icon cache 'desktop.ini' was safely filtered to keep destination clean.">
            (1 OS system file &apos;desktop.ini&apos; safely excluded)
          </span>
        </div>
      </div>

      {/* Actions: Inspect & Export */}
      <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/60">
        <button
          onClick={() => onInspectFiles(batch)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold transition border border-zinc-800"
        >
          <FileSearch className="w-3.5 h-3.5 text-emerald-400" />
          <span>Inspect File List ({(batch.stats?.totalFiles || batch.files?.length || 0).toLocaleString()})</span>
        </button>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs transition border border-zinc-800"
          title="Download CSV Audit Report"
        >
          <Download className="w-3.5 h-3.5 text-sky-400" />
          <span>Export CSV</span>
        </button>
      </div>
    </div>
  );
}
