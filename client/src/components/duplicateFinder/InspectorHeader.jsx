import React from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, RotateCw, Columns2, Sparkles, SlidersHorizontal } from 'lucide-react';

export default function InspectorHeader({
  group,
  isVideo,
  viewMode,
  setViewMode,
  setZoom,
  setPan,
  rotation,
  setRotation,
  onClose
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-bold text-slate-800">Side-by-Side Comparison</span>
        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono text-[11px] font-semibold">
          {group.matchType === 'exact_sha256' ? '100% SHA-256 Exact' : group.matchType === 'raw_pixel' ? '100% Raw Pixel' : `${group.confidence}% Visual Match`}
        </span>
      </div>

      {!isVideo && (
        <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-[11px]">
          <button
            onClick={() => setViewMode('side')}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition ${viewMode === 'side' ? 'bg-emerald-600 text-white font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Columns2 className="w-3 h-3" /> Side-by-Side
          </button>
          <button
            onClick={() => setViewMode('diff')}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition ${viewMode === 'diff' ? 'bg-emerald-600 text-white font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Sparkles className="w-3 h-3" /> Pixel Diff
          </button>
          <button
            onClick={() => setViewMode('slider')}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition ${viewMode === 'slider' ? 'bg-emerald-600 text-white font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <SlidersHorizontal className="w-3 h-3" /> A/B Slider
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* 1-Click Synchronized Rotate (Solves sideways phone videos/photos) */}
        <button
          onClick={() => setRotation((r) => (r + 90) % 360)}
          title="Rotate 90 degrees clockwise"
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-[11px] font-semibold text-slate-700 hover:text-emerald-700 shadow-2xs transition"
        >
          <RotateCw className="w-3.5 h-3.5 text-emerald-600" />
          <span>{rotation ? `${rotation}°` : 'Rotate 90°'}</span>
        </button>

        {!isVideo && viewMode === 'side' && (
          <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg text-slate-600">
            <button onClick={() => setZoom((z) => Math.min(4, z + 0.3))} className="p-1 hover:text-emerald-700"><ZoomIn className="w-3.5 h-3.5" /></button>
            <button onClick={() => setZoom((z) => Math.max(1, z - 0.3))} className="p-1 hover:text-emerald-700"><ZoomOut className="w-3.5 h-3.5" /></button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setRotation(0); }} className="p-1 hover:text-emerald-700"><RotateCcw className="w-3.5 h-3.5" /></button>
          </div>
        )}
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
