import React from 'react';

export default function VideoSplitSliderView({
  aspectRatio,
  maxViewportHeight,
  togglePlay,
  compVideoRef,
  origVideoRef,
  compressedUrl,
  originalUrl,
  thumbnailUrl,
  splitPos,
  setSplitPos,
  isMuted,
  audioSource,
  handleTimeUpdate,
  handleLoadedMetadata,
  setIsPlaying,
  originalSizeMB,
  compressedSizeMB,
  percentageSaved
}) {
  return (
    <div className="flex justify-center w-full">
      <div
        onClick={togglePlay}
        style={{
          aspectRatio,
          maxHeight: maxViewportHeight,
          maxWidth: '100%'
        }}
        className="relative bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800/90 shadow-2xl flex items-center justify-center cursor-pointer group select-none"
      >
        <video
          ref={compVideoRef}
          src={compressedUrl}
          preload="auto"
          playsInline
          muted={isMuted || audioSource === 'original'}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />

        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ clipPath: `inset(0 ${100 - splitPos}% 0 0)` }}
        >
          <video
            ref={origVideoRef}
            src={originalUrl}
            poster={thumbnailUrl}
            preload="auto"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            playsInline
            muted={isMuted || audioSource === 'optimized'}
            className="w-full h-full object-contain"
          />
        </div>

        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-2xl z-20 pointer-events-none"
          style={{ left: `${splitPos}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-zinc-900/90 border border-white/60 text-white flex items-center justify-center shadow-xl text-xs font-bold">
            ⇄
          </div>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          value={splitPos}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setSplitPos(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
        />

        <div className="absolute top-3 left-3 pointer-events-none z-20">
          <span className="px-2.5 py-1 rounded-md bg-zinc-950/85 backdrop-blur-md border border-white/10 text-[10px] font-mono font-bold text-zinc-300">
            ORIGINAL ({originalSizeMB} MB)
          </span>
        </div>
        <div className="absolute top-3 right-3 pointer-events-none z-20">
          <span className="px-2.5 py-1 rounded-md bg-emerald-950/85 backdrop-blur-md border border-emerald-500/40 text-[10px] font-mono font-bold text-emerald-300">
            OPTIMIZED ({compressedSizeMB} MB • -{percentageSaved}%)
          </span>
        </div>
      </div>
    </div>
  );
}
