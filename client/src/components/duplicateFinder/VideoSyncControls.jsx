import React from 'react';
import { Play, Pause, Volume2, VolumeX, FastForward } from 'lucide-react';

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
    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200/90 rounded-xl px-3.5 py-2">
      {/* Play / Pause Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={onTogglePlay}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>{isPlaying ? 'Pause Both' : 'Play Both'}</span>
        </button>

        <span className="font-mono text-xs text-slate-600 font-semibold">
          {formatTime(currentTime)} <span className="text-slate-400">/</span> {formatTime(duration)}
        </span>
      </div>

      {/* Synchronized Timeline Scrubber */}
      <div className="flex-1 min-w-[180px] flex items-center gap-2">
        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.05"
          value={currentTime || 0}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 hover:accent-emerald-700 transition"
        />
      </div>

      {/* Audio Mode Switcher */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onToggleAudio}
          title="Toggle audio between Master, Duplicate, and Mute"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 text-[11px] font-medium shadow-2xs transition"
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
