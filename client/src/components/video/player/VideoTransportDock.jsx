import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Repeat,
  Volume2,
  VolumeX
} from 'lucide-react';

export default function VideoTransportDock({
  currentTime,
  duration,
  handleSeek,
  handleSeekEnd,
  skipTime,
  stepFrame,
  togglePlay,
  isPlaying,
  isLooping,
  setIsLooping,
  compressedUrl,
  audioSource,
  setAudioSource,
  isMuted,
  toggleMute,
  volume,
  handleVolumeChange,
  playbackRate,
  handleRateChange,
  formatSimpleTime,
  formatTimecode
}) {
  return (
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
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => skipTime(-5)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
            title="Rewind 5s (←)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => stepFrame(-1)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition text-[11px] font-mono cursor-pointer"
            title="Step Backward 1 Frame (,)"
          >
            <span className="font-bold">|◀</span>
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="w-11 h-11 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 flex items-center justify-center transition shadow-md cursor-pointer hover:scale-105 active:scale-95"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => stepFrame(1)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition text-[11px] font-mono cursor-pointer"
            title="Step Forward 1 Frame (.)"
          >
            <span className="font-bold">▶|</span>
          </button>

          <button
            type="button"
            onClick={() => skipTime(5)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
            title="Forward 5s (→)"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsLooping(!isLooping)}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              isLooping
                ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
            title={isLooping ? 'Loop Enabled (L)' : 'Enable Loop (L)'}
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {compressedUrl && (
            <button
              type="button"
              onClick={() => setAudioSource(audioSource === 'optimized' ? 'original' : 'optimized')}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-lg bg-zinc-950 border border-zinc-700/80 text-zinc-300 hover:border-zinc-500 transition cursor-pointer shadow-xs"
              title="Switch audio stream"
            >
              <span className="text-zinc-500 text-[10px]">AUDIO:</span>
              <span className={audioSource === 'optimized' ? 'text-emerald-400 font-bold' : 'text-zinc-200 font-bold'}>
                {audioSource === 'optimized' ? 'Optimized' : 'Original'}
              </span>
            </button>
          )}

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

        <div className="flex items-center gap-2">
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

          <div className="hidden sm:block text-[11px] font-mono text-zinc-400 bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded-lg tabular-nums">
            {formatTimecode(currentTime)}
          </div>
        </div>
      </div>
    </div>
  );
}
