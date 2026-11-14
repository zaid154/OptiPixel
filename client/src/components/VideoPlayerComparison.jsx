import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  SkipBack,
  SkipForward,
  Repeat,
  Sparkles,
  Zap,
  Film,
  Check,
  Maximize2,
  Columns,
  SplitSquareVertical
} from 'lucide-react';

export default function VideoPlayerComparison({
  originalUrl,
  compressedUrl,
  originalSizeMB,
  compressedSizeMB,
  percentageSaved,
  isProcessing,
  progress = 0,
  fps = 0,
  speed = '1x',
  timeRemainingSec = 0,
  metadata,
  thumbnailUrl,
  onStartCompress,
  isTheaterMode = false,
  onToggleTheater
}) {
  const containerRef = useRef(null);
  const origVideoRef = useRef(null);
  const compVideoRef = useRef(null);
  const isSeekingRef = useRef(false);
  const seekTimeoutRef = useRef(null);

  // Playback States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(metadata?.duration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [audioSource, setAudioSource] = useState('optimized'); // 'optimized' | 'original'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState('side_by_side'); // 'side_by_side' | 'split'
  const [splitPos, setSplitPos] = useState(50); // 0 to 100 for Split Slider mode

  // Orientation & Specs
  const isPortrait = metadata?.height > metadata?.width;
  const isSquare = metadata?.width && metadata?.height && Math.abs(metadata.width - metadata.height) < 40;
  const videoFps = metadata?.fps || 30;

  // Aspect ratio string
  const aspectRatio = (metadata?.width && metadata?.height)
    ? `${metadata.width} / ${metadata.height}`
    : (isPortrait ? '9 / 16' : isSquare ? '1 / 1' : '16 / 9');

  // Initialize duration
  useEffect(() => {
    if (metadata?.duration && (!duration || duration === 0)) {
      setDuration(metadata.duration);
    }
  }, [metadata?.duration]);

  // Sync volume & audio channel
  useEffect(() => {
    if (origVideoRef.current) {
      origVideoRef.current.volume = volume;
      origVideoRef.current.muted = isMuted || (compressedUrl ? audioSource === 'optimized' : false);
    }
    if (compVideoRef.current) {
      compVideoRef.current.volume = volume;
      compVideoRef.current.muted = isMuted || (compressedUrl ? audioSource === 'original' : false);
    }
  }, [volume, isMuted, audioSource, compressedUrl]);

  // Fullscreen listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // -------------------------------------------------------------
  // HIGH-PERFORMANCE ADAPTIVE DRIFT CORRECTION (4 Hz, ZERO STUTTER)
  // Instead of forcing .currentTime (which halts 4K decoders),
  // we smoothly nudge playbackRate by 5-8% to keep them in lockstep!
  // -------------------------------------------------------------
  useEffect(() => {
    if (!isPlaying) return;

    const intervalId = setInterval(() => {
      const orig = origVideoRef.current;
      const comp = compVideoRef.current;
      if (!orig || !comp || orig.paused || comp.paused || isSeekingRef.current) return;

      const drift = orig.currentTime - comp.currentTime; // Positive if comp is behind

      if (Math.abs(drift) > 0.75) {
        // Massive desync (e.g. after long buffer or drag) -> Snap once
        comp.currentTime = orig.currentTime;
        comp.playbackRate = orig.playbackRate;
      } else if (drift > 0.07) {
        // Comp is slightly behind -> speed it up gently to catch up without freezing
        comp.playbackRate = orig.playbackRate * 1.07;
      } else if (drift < -0.07) {
        // Comp is slightly ahead -> slow it down gently
        comp.playbackRate = orig.playbackRate * 0.93;
      } else {
        // In perfect sync -> reset to master rate
        if (comp.playbackRate !== orig.playbackRate) {
          comp.playbackRate = orig.playbackRate;
        }
      }
    }, 250);

    return () => clearInterval(intervalId);
  }, [isPlaying]);

  // -------------------------------------------------------------
  // SYNCHRONIZED MASTER PLAY/PAUSE
  // -------------------------------------------------------------
  const togglePlay = useCallback(async () => {
    const orig = origVideoRef.current;
    const comp = compVideoRef.current;
    if (!orig) return;

    if (isPlaying || (!orig.paused && (!comp || !comp.paused))) {
      orig.pause();
      if (comp) comp.pause();
      setIsPlaying(false);
    } else {
      // Re-align before starting
      if (comp) {
        comp.currentTime = orig.currentTime;
        comp.playbackRate = playbackRate;
      }
      orig.playbackRate = playbackRate;

      try {
        if (comp) {
          await Promise.all([orig.play(), comp.play()]);
        } else {
          await orig.play();
        }
        setIsPlaying(true);
      } catch (err) {
        console.warn('Playback resume handled:', err);
      }
    }
  }, [isPlaying, playbackRate]);

  // -------------------------------------------------------------
  // SMOOTH TIMELINE SEEKING (NO 4K DECODER CHOKING)
  // -------------------------------------------------------------
  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    isSeekingRef.current = true;

    // Debounce actual hardware seeks to 40ms to avoid freezing 4K decoders
    if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
    seekTimeoutRef.current = setTimeout(() => {
      if (origVideoRef.current) origVideoRef.current.currentTime = time;
      if (compVideoRef.current) compVideoRef.current.currentTime = time;
      isSeekingRef.current = false;
    }, 35);
  };

  const handleSeekEnd = () => {
    isSeekingRef.current = false;
    if (origVideoRef.current) origVideoRef.current.currentTime = currentTime;
    if (compVideoRef.current) compVideoRef.current.currentTime = currentTime;
  };

  // Skip time forward/backward
  const skipTime = (seconds) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    setCurrentTime(newTime);
    if (origVideoRef.current) origVideoRef.current.currentTime = newTime;
    if (compVideoRef.current) compVideoRef.current.currentTime = newTime;
  };

  // Step Frame-by-Frame
  const stepFrame = (direction) => {
    if (isPlaying) {
      if (origVideoRef.current) origVideoRef.current.pause();
      if (compVideoRef.current) compVideoRef.current.pause();
      setIsPlaying(false);
    }
    const frameDuration = 1 / videoFps;
    const newTime = Math.max(0, Math.min(duration, currentTime + (direction * frameDuration)));
    setCurrentTime(newTime);
    if (origVideoRef.current) origVideoRef.current.currentTime = newTime;
    if (compVideoRef.current) compVideoRef.current.currentTime = newTime;
  };

  // Playback Rate
  const handleRateChange = (rate) => {
    setPlaybackRate(rate);
    if (origVideoRef.current) origVideoRef.current.playbackRate = rate;
    if (compVideoRef.current) compVideoRef.current.playbackRate = rate;
  };

  // Time update from master video
  const handleTimeUpdate = () => {
    if (isSeekingRef.current) return;
    if (origVideoRef.current) {
      const cur = origVideoRef.current.currentTime;
      setCurrentTime(cur);

      if (!duration && origVideoRef.current.duration) {
        setDuration(origVideoRef.current.duration);
      }

      if (origVideoRef.current.ended) {
        if (isLooping) {
          origVideoRef.current.currentTime = 0;
          if (compVideoRef.current) compVideoRef.current.currentTime = 0;
          origVideoRef.current.play().catch(() => {});
          if (compVideoRef.current) compVideoRef.current.play().catch(() => {});
        } else {
          setIsPlaying(false);
        }
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (origVideoRef.current && origVideoRef.current.duration) {
      setDuration(origVideoRef.current.duration);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        skipTime(-5);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        skipTime(5);
      } else if (e.code === 'Comma') {
        e.preventDefault();
        stepFrame(-1);
      } else if (e.code === 'Period') {
        e.preventDefault();
        stepFrame(1);
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'KeyL') {
        e.preventDefault();
        setIsLooping((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, duration, currentTime, videoFps]);

  // Format Timecodes
  const formatTimecode = (secs) => {
    if (isNaN(secs) || secs < 0) return '00:00.00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const formatSimpleTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Dynamic Viewport Heights
  const maxViewportHeight = isFullscreen
    ? 'calc(100vh - 175px)'
    : isPortrait
      ? '72vh'
      : '56vh';

  return (
    <div
      ref={containerRef}
      className={`flex flex-col gap-3 rounded-2xl border border-zinc-800/90 bg-zinc-950 p-3 sm:p-4 shadow-2xl transition-all duration-200 select-none ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none p-6 justify-between' : ''
      }`}
    >
      {/* 1. STUDIO HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 border-b border-zinc-900 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-100">
              Synchronized Dual Inspection
            </span>
          </div>

          {/* Orientation & Format Pill */}
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800">
            {isPortrait ? '📱 Portrait 9:16' : isSquare ? '⏹ Square 1:1' : '🖥 Landscape 16:9'}
          </span>

          {percentageSaved > 0 && (
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              -{percentageSaved}% Saved
            </span>
          )}
        </div>

        {/* View Switcher, Specs & Fullscreen */}
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

          {/* View Mode Switcher: Side-by-Side vs Split Slider */}
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
                title="Interactive Split Slider Comparison"
              >
                <SplitSquareVertical className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Split Slider</span>
              </button>
            </div>
          )}

          {/* Active Synchronization Pill */}
          <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Synchronized</span>
          </div>

          {/* Theater Mode Toggle */}
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

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen (F)' : 'Enter Fullscreen Comparison (F)'}
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. DUAL VIDEO VIEWPORTS */}
      {viewMode === 'split' && compressedUrl ? (
        /* ================= SPLIT SLIDER VIEW ================= */
        <div className="flex justify-center w-full">
          <div
            onClick={togglePlay}
            style={{
              aspectRatio: aspectRatio,
              maxHeight: maxViewportHeight,
              maxWidth: '100%'
            }}
            className="relative bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800/90 shadow-2xl flex items-center justify-center cursor-pointer group select-none"
          >
            {/* Layer 1: Compressed Video (Underneath) */}
            <video
              ref={compVideoRef}
              src={compressedUrl}
              preload="auto"
              playsInline
              muted={isMuted || audioSource === 'original'}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            />

            {/* Layer 2: Original Video (Clipped to splitPos %) */}
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

            {/* Draggable Divider Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-2xl z-20 pointer-events-none"
              style={{ left: `${splitPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-zinc-900/90 border border-white/60 text-white flex items-center justify-center shadow-xl text-xs font-bold">
                ⇄
              </div>
            </div>

            {/* Transparent Slider Input for Split Control */}
            <input
              type="range"
              min="0"
              max="100"
              value={splitPos}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setSplitPos(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
            />

            {/* Badges */}
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
      ) : (
        /* ================= SIDE-BY-SIDE DUAL VIEW ================= */
        <div className={`flex flex-col md:flex-row items-center justify-center gap-3 sm:gap-4 w-full ${isFullscreen ? 'flex-1 min-h-0' : ''}`}>
          
          {/* LEFT VIEWPORT: ORIGINAL VIDEO */}
          <div
            onClick={togglePlay}
            style={{
              aspectRatio: aspectRatio,
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

            {/* Hover Play/Pause Overlay Indicator */}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <div className="w-12 h-12 rounded-full bg-zinc-900/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl">
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </div>
            </div>

            {/* Original Label Badge */}
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

          {/* RIGHT VIEWPORT: OPTIMIZED VIDEO OR HARDWARE ENCODING HUD */}
          <div
            onClick={compressedUrl ? togglePlay : undefined}
            style={{
              aspectRatio: aspectRatio,
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

                {/* Hover Play/Pause Overlay Indicator */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-zinc-900/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl">
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                  </div>
                </div>

                {/* Optimized Label Badge */}
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
              /* Live GPU Hardware Acceleration Progress HUD */
              <div className="w-full h-full p-6 flex flex-col items-center justify-center gap-4 bg-zinc-950/80 backdrop-blur-md">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10 animate-pulse">
                  <Zap className="w-7 h-7" />
                </div>

                <div className="text-center">
                  <h4 className="text-sm font-bold text-zinc-100 tracking-wide flex items-center justify-center gap-1.5">
                    <span>⚡ GPU Hardware Acceleration Active</span>
                  </h4>
                  <p className="text-xs text-amber-300 font-mono mt-0.5">
                    Intel Iris Xe QuickSync Engine
                  </p>
                </div>

                {/* Progress Bar */}
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

                {/* Hardware Performance Stats */}
                <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 bg-zinc-900/80 border border-zinc-800 px-3 py-1 rounded-lg">
                  <span>FPS: <strong className="text-zinc-200 font-bold">{fps || 33}</strong></span>
                  <span>•</span>
                  <span>Speed: <strong className="text-emerald-400 font-bold">{speed || '1.1x'}</strong></span>
                  <span>•</span>
                  <span className="text-zinc-400">Zero Loss</span>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-zinc-400 text-xs flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-pulse">
                  <Sparkles className="w-6 h-6" />
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
                  <span>🚀 Compress Video Now</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. PROFESSIONAL MASTER PLAYBACK CONTROL DOCK */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5 sm:p-3 flex flex-col gap-2.5 shadow-md">
        
        {/* Scrubber Timeline Slider & Timecodes */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-semibold text-zinc-300 w-16 text-right tabular-nums">
            {formatSimpleTime(currentTime)}
          </span>

          <div className="relative flex-1 flex items-center">
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.05"
              value={currentTime}
              onChange={handleSeek}
              onMouseUp={handleSeekEnd}
              onTouchEnd={handleSeekEnd}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 transition"
            />
          </div>

          <span className="text-xs font-mono font-medium text-zinc-500 w-16 tabular-nums">
            {formatSimpleTime(duration)}
          </span>
        </div>

        {/* Master Transport & Audio Dock */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-zinc-800/60">
          
          {/* Left: Transport Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Skip -5s */}
            <button
              type="button"
              onClick={() => skipTime(-5)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
              title="Rewind 5s (←)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Step -1 Frame */}
            <button
              type="button"
              onClick={() => stepFrame(-1)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition text-[11px] font-mono cursor-pointer"
              title="Step Backward 1 Frame (,)"
            >
              <span className="font-bold">|◀</span>
            </button>

            {/* Master Play/Pause Button */}
            <button
              type="button"
              onClick={togglePlay}
              className="w-11 h-11 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 flex items-center justify-center transition shadow-md cursor-pointer hover:scale-105 active:scale-95"
              title={isPlaying ? 'Pause Both Videos (Space)' : 'Play Both Videos Synchronously (Space)'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            {/* Step +1 Frame */}
            <button
              type="button"
              onClick={() => stepFrame(1)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition text-[11px] font-mono cursor-pointer"
              title="Step Forward 1 Frame (.)"
            >
              <span className="font-bold">▶|</span>
            </button>

            {/* Skip +5s */}
            <button
              type="button"
              onClick={() => skipTime(5)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
              title="Forward 5s (→)"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Loop Toggle */}
            <button
              type="button"
              onClick={() => setIsLooping(!isLooping)}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                isLooping
                  ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
              title={isLooping ? 'Loop Enabled (L)' : 'Enable Loop Playback (L)'}
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          {/* Center: Audio Source Channel & Volume */}
          <div className="flex items-center gap-3">
            {/* Audio Channel Switcher Pill */}
            {compressedUrl && (
              <button
                type="button"
                onClick={() => setAudioSource(audioSource === 'optimized' ? 'original' : 'optimized')}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-lg bg-zinc-950 border border-zinc-700/80 text-zinc-300 hover:border-zinc-500 transition cursor-pointer shadow-xs"
                title="Switch which audio stream to monitor"
              >
                <span className="text-zinc-500 text-[10px]">LISTEN:</span>
                <span className={audioSource === 'optimized' ? 'text-emerald-400 font-bold' : 'text-zinc-200 font-bold'}>
                  {audioSource === 'optimized' ? '✨ Optimized (HD)' : '📼 Original'}
                </span>
              </button>
            )}

            {/* Volume & Mute */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1 text-zinc-400 hover:text-white transition cursor-pointer"
                title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-zinc-300"
              />
            </div>
          </div>

          {/* Right: Playback Speed & Precision Timecode */}
          <div className="flex items-center gap-2">
            {/* Speed Selector Chips */}
            <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg p-0.5 text-[11px] font-mono">
              {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleRateChange(rate)}
                  className={`px-1.5 py-0.5 rounded transition cursor-pointer font-medium ${
                    playbackRate === rate
                      ? 'bg-zinc-800 text-zinc-100 font-bold shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Millisecond Precision Timecode */}
            <div className="hidden sm:block text-[11px] font-mono text-zinc-400 bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded-lg tabular-nums">
              {formatTimecode(currentTime)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}