import React from 'react';
import { Play, Pause, Zap, RefreshCw } from 'lucide-react';

export default function VideoSideBySideView({
  aspectRatio,
  maxViewportHeight,
  isFullscreen,
  togglePlay,
  origVideoRef,
  compVideoRef,
  originalUrl,
  compressedUrl,
  thumbnailUrl,
  isMuted,
  audioSource,
  handleTimeUpdate,
  handleLoadedMetadata,
  isPlaying,
  setIsPlaying,
  originalSizeMB,
  compressedSizeMB,
  percentageSaved,
  metadata,
  isProcessing,
  progress,
  timeRemainingSec,
  fps,
  speed,
  onStartCompress
}) {
  return (
    <div className={`flex flex-col md:flex-row items-center justify-center gap-3 sm:gap-4 w-full ${isFullscreen ? 'flex-1 min-h-0' : ''}`}>
      {/* Left Viewport: Original Video */}
      <div
        onClick={togglePlay}
        style={{
          aspectRatio,
          maxHeight: maxViewportHeight,
          maxWidth: '100%'
        }}
        className="relative bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800/90 shadow-2xl flex items-center justify-center flex-1 min-w-0 cursor-pointer group"
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
          muted={isMuted || (compressedUrl ? audioSource === 'optimized' : false)}
          className="w-full h-full object-contain pointer-events-none"
        />

        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-zinc-900/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl">
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </div>
        </div>

        <div className="absolute top-3 left-3 pointer-events-none z-20">
          <div className="px-3 py-1.5 rounded-lg bg-zinc-950/85 backdrop-blur-md border border-white/10 text-xs shadow-lg flex flex-col">
            <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-400">Original Source</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-mono font-bold text-zinc-100 text-xs">{originalSizeMB} MB</span>
              <span className="text-[10px] text-zinc-500 font-mono">• {metadata?.width}×{metadata?.height}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Viewport: Compressed / Processing HUD */}
      <div
        onClick={compressedUrl ? togglePlay : undefined}
        style={{
          aspectRatio,
          maxHeight: maxViewportHeight,
          maxWidth: '100%'
        }}
        className={`relative bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800/90 shadow-2xl flex items-center justify-center flex-1 min-w-0 group ${
          compressedUrl ? 'cursor-pointer' : ''
        }`}
      >
        {compressedUrl ? (
          <>
            <video
              ref={compVideoRef}
              src={compressedUrl}
              preload="auto"
              playsInline
              muted={isMuted || audioSource === 'original'}
              className="w-full h-full object-contain pointer-events-none"
            />

            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <div className="w-12 h-12 rounded-full bg-zinc-900/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl">
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </div>
            </div>

            <div className="absolute top-3 left-3 pointer-events-none z-20">
              <div className="px-3 py-1.5 rounded-lg bg-emerald-950/85 backdrop-blur-md border border-emerald-500/40 text-xs shadow-lg flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-400">Optimized Stream</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500 text-zinc-950">
                    -{percentageSaved}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono font-bold text-emerald-200 text-xs">{compressedSizeMB} MB</span>
                  <span className="text-[10px] text-emerald-400/70 font-mono">• H.264 Universal</span>
                </div>
              </div>
            </div>
          </>
        ) : isProcessing ? (
          <div className="w-full h-full p-6 flex flex-col items-center justify-center gap-4 bg-zinc-950/80 backdrop-blur-md">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10 animate-pulse">
              <Zap className="w-7 h-7" />
            </div>

            <div className="text-center">
              <h4 className="text-sm font-bold text-zinc-100 tracking-wide flex items-center justify-center gap-1.5">
                <span>Hardware Accelerated Encoder Active</span>
              </h4>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                FFmpeg Stream Pipeline
              </p>
            </div>

            <div className="w-full max-w-xs flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-amber-400 font-bold text-sm">{progress}%</span>
                <span className="text-zinc-400 text-xs">
                  {timeRemainingSec > 0 ? `~${timeRemainingSec}s remaining` : 'Finalizing Stream'}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-300 shadow-sm"
                  style={{ width: `${Math.max(4, progress)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 bg-zinc-900/80 border border-zinc-800 px-3 py-1 rounded-lg">
              <span>FPS: <strong className="text-zinc-200 font-bold">{fps || 30}</strong></span>
              <span>•</span>
              <span>Speed: <strong className="text-emerald-400 font-bold">{speed || '1.0x'}</strong></span>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-zinc-400 text-xs flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-zinc-200 text-sm">Ready to Optimize</span>
              <span className="text-xs text-zinc-400">Select preset or click below to begin</span>
            </div>
            <button
              type="button"
              onClick={onStartCompress}
              className="mt-1 py-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center gap-2 transition shadow-md cursor-pointer hover:scale-105 active:scale-95"
            >
              <span>Compress Video Now</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
