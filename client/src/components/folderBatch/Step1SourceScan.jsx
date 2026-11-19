import React from 'react';
import { FolderOpen, Folder, ArrowRight, RefreshCw, AlertTriangle, ShieldCheck, Search, Sliders, HardDrive, CheckCircle2 } from 'lucide-react';

export default function Step1SourceScan({
  sourcePath,
  setSourcePath,
  onBrowse,
  onScan,
  isScanning,
  scanError,
  quickPaths = []
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-6 shadow-xs">
        {/* Header & Purpose */}
        <div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-emerald-600" />
              <span>Step 1: Choose Your Folder & Preview</span>
            </h2>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Safe Read-Only Scan
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Select the folder on your computer that contains photos, videos, or documents. Clicking <strong>Scan Folder</strong> will only inspect your media to show file counts, total size, and estimated time — <strong>nothing will be compressed, deleted, or changed yet.</strong>
          </p>
        </div>

        {/* 3-Step Process Flow Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs shrink-0 mt-0.5">
              <Search className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-950 block">1. Scan & Inspect</span>
              <p className="text-[11px] text-emerald-800/90 mt-0.5 leading-snug">
                Detects all photos, videos, and documents in 1-2 seconds.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-slate-200 text-slate-700 font-bold text-xs shrink-0 mt-0.5">
              <Sliders className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 block">2. Choose Settings</span>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Pick your quality level and destination folder in Step 2.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-slate-200 text-slate-700 font-bold text-xs shrink-0 mt-0.5">
              <HardDrive className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 block">3. Optimize & Save</span>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Optimized copies saved into a separate new folder.
              </p>
            </div>
          </div>
        </div>

        {/* Input & Action */}
        <div className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={sourcePath}
                onChange={(e) => setSourcePath(e.target.value)}
                placeholder="e.g. C:\Users\user\Pictures\Archive or D:\Photos2024"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 font-mono focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-2xs"
              />
            </div>
            <button
              type="button"
              onClick={onBrowse}
              className="px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 hover:border-slate-300 flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
              title="Browse local folders"
            >
              <Folder className="w-4 h-4 text-slate-500" />
              <span>Browse Folder</span>
            </button>
            <button
              type="button"
              onClick={() => onScan(sourcePath)}
              disabled={isScanning || !sourcePath}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Scanning Media...</span>
                </>
              ) : (
                <>
                  <span>Scan Folder</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Quick Suggestion Chips */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-[11px] font-semibold text-slate-500">Quick Shortcuts:</span>
            {quickPaths.map((qp) => (
              <button
                key={qp.path}
                type="button"
                onClick={() => {
                  setSourcePath(qp.path);
                  onScan(qp.path);
                }}
                className="text-[11px] font-mono font-medium px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 hover:border-slate-300 transition cursor-pointer shadow-2xs"
              >
                {qp.label}
              </button>
            ))}
          </div>
        </div>

        {scanError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{scanError}</span>
          </div>
        )}

        {/* Zero Deletion & Safety Guarantee Badge */}
        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3 text-xs text-slate-700 shadow-2xs">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-emerald-900 block flex items-center gap-1.5">
              <span>100% Zero-Deletion Guarantee</span>
              <span className="text-[10px] bg-emerald-200/60 text-emerald-900 px-1.5 py-0.2 rounded font-mono font-normal">Originals Untouched</span>
            </span>
            <p className="mt-0.5 text-slate-600 leading-relaxed">
              Your source files are strictly <strong>Read-Only</strong>. OptiPixel will never delete, rename, or overwrite your original files. All optimized copies will be saved into a separate output folder (like <code className="text-emerald-800 font-mono font-semibold">[Folder]_Optimized</code>) so your originals stay 100% safe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
