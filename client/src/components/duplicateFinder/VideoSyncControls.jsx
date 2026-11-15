import React from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw, RotateCw } from 'lucide-react';

export default function VideoSyncControls({
  isPlaying,
  onTogglePlay,
  currentTime = 0,
  duration = 0,
  onSeek,
  audioMode = 'left',
  onToggleAudio
}) {
  const formatTime = (sec) => {
    if (!sec || isNaN(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200/90 rounded-xl px-4 py-2 shadow-2xs">
      {/* Play / Pause & Frame Steppers */}
      <div className="flex items-center gap-2">
        <button
          onClick={onTogglePlay}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>{isPlaying ? 'Pause Both' : 'Play Both'}</span>
        </button>

        <button
          onClick={() => onSeek(Math.max(0, currentTime - 1))}
          title="Step back 1 second"
          className="px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 text-[11px] font-mono font-semibold transition"
        >
          -1s
        </button>
        <button
          onClick={() => onSeek(Math.min(duration, currentTime + 1))}
          title="Step forward 1 second"
          className="px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 text-[11px] font-mono font-semibold transition"
        >
          +1s
        </button>

        <span className="font-mono text-xs text-slate-700 font-bold ml-1">
          {formatTime(currentTime)} <span className="text-slate-400">/</span> {formatTime(duration)}
        </span>
      </div>

      {/* Synchronized Timeline Scrubber */}
      <div className="flex-1 min-w-[200px] flex items-center gap-2">
        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.05"
          value={currentTime || 0}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 hover:accent-emerald-700 transition"
        />
      </div>

      {/* Audio Mode Switcher */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onToggleAudio}
          title="Toggle audio between Master, Duplicate, and Mute"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
        >
          {audioMode === 'muted' ? (
            <VolumeX className="w-3.5 h-3.5 text-rose-500" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
          )}
          <span className="font-mono">
            {audioMode === 'left' ? 'Audio: Left' : audioMode === 'right' ? 'Audio: Right' : 'Muted'}
          </span>
        </button>
      </div>
    </div>
  );
}
