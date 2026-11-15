import React from 'react';
import { ZoomIn, ZoomOut, Sparkles } from 'lucide-react';

export default function ComparisonHeaderBar({
  percentageSaved,
  enhance,
  upscale2x,
  zoom,
  setZoom
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Split-Screen Inspection
        </span>
        {percentageSaved > 0 ? (
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
            -{percentageSaved}% Saved
          </span>
        ) : (
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            {upscale2x ? '2x HD Resolution (+Pixels)' : 'High-Fidelity Output'}
          </span>
        )}
        {enhance && (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
            Enhanced
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 text-xs shadow-2xs">
        <button
          onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
          className="p-1 hover:text-emerald-700 text-slate-500 transition"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="px-2 font-mono text-[11px] text-slate-700 font-semibold">{zoom}x</span>
        <button
          onClick={() => setZoom((z) => Math.min(3, z + 0.5))}
          className="p-1 hover:text-emerald-700 text-slate-500 transition"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
