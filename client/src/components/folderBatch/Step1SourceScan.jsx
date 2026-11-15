import React from 'react';
import { FolderOpen, Folder, ArrowRight, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';

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
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-emerald-600" />
            Select Source Root Folder
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Enter the path to your folder containing photos, videos, and nested sub-folders. OptiPixel will recursively scan all files without modifying or deleting anything.
          </p>
        </div>

        {/* Input & Action */}
        <div className="space-y-3">
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
              <span>Browse</span>
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
                  <span>Scanning...</span>
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
            <span className="text-[11px] font-semibold text-slate-500">Quick Paths:</span>
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
            <span className="font-bold text-emerald-900 block">100% Zero-Deletion Guarantee:</span>
            <p className="mt-0.5 text-slate-600 leading-relaxed">
              Your source files are strictly <strong>Read-Only</strong>. OptiPixel will never delete, move, or alter your original files. All compressed copies will be written to a dedicated output folder of your choice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
