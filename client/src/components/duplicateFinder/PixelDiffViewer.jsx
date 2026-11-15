import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

export default function PixelDiffViewer({ pathA, pathB, mode = 'diff' }) {
  const [sliderPos, setSliderPos] = useState(50);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const streamUrlA = `/api/duplicates/stream?path=${encodeURIComponent(pathA)}`;
  const streamUrlB = `/api/duplicates/stream?path=${encodeURIComponent(pathB)}`;
  const diffUrl = `/api/duplicates/pixel-diff?pathA=${encodeURIComponent(pathA)}&pathB=${encodeURIComponent(pathB)}`;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/duplicates/pixel-compare?pathA=${encodeURIComponent(pathA)}&pathB=${encodeURIComponent(pathB)}`)
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pathA, pathB]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-100 p-2 overflow-hidden select-none">
      {/* Top Match Stats Pill */}
      <div className="absolute top-3 z-20 flex items-center gap-2 px-3 py-1 rounded-full bg-white/95 border border-slate-200 text-xs font-mono backdrop-blur-xs shadow-xs text-slate-800">
        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
        {loading ? (
          <span className="text-slate-500">Comparing pixel values...</span>
        ) : stats?.matches ? (
          <span className="text-emerald-700 font-bold">100.00% Exact Pixel Match (0 Differing Pixels)</span>
        ) : stats?.reason ? (
          <span className="text-amber-700 font-semibold">{stats.reason}</span>
        ) : (
          <span>
            Pixel Match: <strong className="text-emerald-700">{stats?.similarity}%</strong> • Differing: <span className="text-rose-600 font-bold">{stats?.diffPixelCount?.toLocaleString()}</span> px
          </span>
        )}
      </div>

      {mode === 'diff' ? (
        <div className="relative aspect-video max-h-full max-w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center">
          <img src={diffUrl} alt="Pixel Diff Heatmap" className="max-h-full max-w-full object-contain pointer-events-none" />
          <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-white/90 text-[10px] font-mono text-slate-700 border border-slate-200 shadow-xs">
            <span className="inline-block w-2 h-2 rounded-full bg-rose-500 mr-1.5 animate-pulse"></span>
            Glowing Pixels = Altered • Dark = Exact Match
          </div>
        </div>
      ) : (
        <div
          className="relative aspect-video max-h-full max-w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center cursor-ew-resize"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            setSliderPos((x / rect.width) * 100);
          }}
        >
          <img src={streamUrlB} alt="Copy B" className="absolute inset-0 w-full h-full object-contain" />
          <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
            <img src={streamUrlA} alt="Master A" className="absolute inset-0 w-full h-full object-contain max-w-none" style={{ width: '100%', height: '100%' }} />
          </div>
          <div className="absolute top-0 bottom-0 w-0.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] z-10 pointer-events-none" style={{ left: `${sliderPos}%` }}>
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shadow-md">
              ↔
            </div>
          </div>
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-white/90 text-[10px] font-mono text-emerald-800 font-bold border border-slate-200 shadow-2xs">
            Left: Master Copy
          </div>
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-white/90 text-[10px] font-mono text-slate-800 font-bold border border-slate-200 shadow-2xs">
            Right: Duplicate Copy
          </div>
        </div>
      )}
    </div>
  );
}
