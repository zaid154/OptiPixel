import React from 'react';
import { Columns, SplitSquareVertical, Maximize2, Maximize, Minimize } from 'lucide-react';

export default function VideoPlayerHeader({
  metadata,
  percentageSaved,
  compressedUrl,
  viewMode,
  setViewMode,
  isFullscreen,
  toggleFullscreen,
  isTheaterMode,
  onToggleTheater
}) {
  const isPortrait = metadata?.height > metadata?.width;
  const isSquare = metadata?.width && metadata?.height && Math.abs(metadata.width - metadata.height) < 40;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 border-b border-zinc-900 pb-2.5">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50"></span>
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-100">
            Synchronized Dual Inspection
          </span>
        </div>

        <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800">
          {isPortrait ? 'Portrait 9:16' : isSquare ? 'Square 1:1' : 'Landscape 16:9'}
        </span>

        {percentageSaved > 0 && (
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            -{percentageSaved}% Saved
          </span>
        )}
      </div>

      <div className="flex items-center gap-2.5 text-xs text-zinc-400 font-mono">
        {metadata && (
          <div className="hidden sm:flex items-center gap-2 text-zinc-400">
            <span className="font-semibold text-zinc-200">{metadata.width}×{metadata.height}</span>
            <span>•</span>
            <span>{metadata.fps} FPS</span>
            <span>•</span>
            <span className="uppercase text-zinc-400">{metadata.codec}</span>
          </div>
        )}

        {compressedUrl && (
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('side_by_side')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                viewMode === 'side_by_side'
                  ? 'bg-zinc-800 text-zinc-100 font-bold shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Side by Side Dual Comparison"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Side-by-Side</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-zinc-800 text-zinc-100 font-bold shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Split Slider Comparison"
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Split Slider</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-md">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Synchronized</span>
        </div>

        {onToggleTheater && !isFullscreen && (
          <button
            type="button"
            onClick={onToggleTheater}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              isTheaterMode
                ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300'
                : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
            title={isTheaterMode ? 'Exit Theater Mode' : 'Expand Theater Mode'}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
