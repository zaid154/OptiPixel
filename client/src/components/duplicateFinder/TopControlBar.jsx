import React from 'react';
import { Play, Square, Sliders, Folder, Search, Image as ImageIcon, Film, RotateCcw } from 'lucide-react';

export default function TopControlBar({
  rootPath,
  setRootPath,
  isScanning,
  hasResults,
  onStartScan,
  onStopScan,
  onClearResults,
  similarity,
  setSimilarity,
  matchModes,
  setMatchModes,
  mediaFilter,
  setMediaFilter
}) {
  const toggleMode = (mode) => {
    if (matchModes.includes(mode)) {
      if (matchModes.length > 1) setMatchModes(matchModes.filter((m) => m !== mode));
    } else {
      setMatchModes([...matchModes, mode]);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs space-y-4">
      {/* Folder Path Input & Action */}
      <div className="flex flex-col md:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Folder className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={rootPath}
            onChange={(e) => setRootPath(e.target.value.replace(/^["']+|["']+$/g, ''))}
            placeholder="Enter absolute folder path (e.g. C:\Users\user\Pictures or /media/photos)"
            disabled={isScanning}
            className="w-full bg-slate-50 border border-slate-300/80 rounded-lg pl-10 pr-4 py-2 text-xs font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-60 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {!isScanning ? (
            <>
              <button
                type="button"
                onClick={onStartScan}
                disabled={!rootPath.trim()}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Scan</span>
              </button>
              {hasResults && onClearResults && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to clear scan results and reset the view?')) {
                      onClearResults();
                    }
                  }}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 text-xs font-semibold transition cursor-pointer"
                  title="Clear scan results and reset view"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Clear Results</span>
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={onStopScan}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition shadow-xs cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Scan</span>
            </button>
          )}
        </div>
      </div>

      {/* Matching Modes, Similarity Slider & Media Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2.5 border-t border-slate-100 text-xs">
        {/* Match Mode Toggles */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium flex items-center gap-1">
            <Search className="w-3.5 h-3.5 text-slate-400" /> Modes:
          </span>
          <button
            onClick={() => toggleMode('exact')}
            disabled={isScanning}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              matchModes.includes('exact')
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs'
                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200/70'
            }`}
          >
            Exact SHA-256
          </button>
          <button
            onClick={() => toggleMode('pixel')}
            disabled={isScanning}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              matchModes.includes('pixel')
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs'
                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200/70'
            }`}
            title="1:1 Raw Pixel Bitmap Match (Format & Metadata Agnostic)"
          >
            1:1 Raw Pixel
          </button>
          <button
            onClick={() => toggleMode('visual')}
            disabled={isScanning}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              matchModes.includes('visual')
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs'
                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200/70'
            }`}
          >
            Visual Perceptual
          </button>
        </div>

        {/* Similarity Threshold Slider */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span>Similarity Threshold:</span>
            <span className="font-mono font-bold text-emerald-700">{similarity}%</span>
          </div>
          <input
            type="range"
            min="85"
            max="100"
            step="1"
            value={similarity}
            onChange={(e) => setSimilarity(Number(e.target.value))}
            disabled={isScanning}
            className="w-28 accent-emerald-600 cursor-pointer"
          />
        </div>

        {/* Media Type Filter */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          {['all', 'image', 'video'].map((type) => (
            <button
              key={type}
              onClick={() => setMediaFilter(type)}
              className={`px-2.5 py-0.5 rounded-md text-[11px] capitalize transition cursor-pointer ${
                mediaFilter === type
                  ? 'bg-white text-emerald-800 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {type === 'image' && <ImageIcon className="w-3 h-3 inline mr-1" />}
              {type === 'video' && <Film className="w-3 h-3 inline mr-1" />}
              {type}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
