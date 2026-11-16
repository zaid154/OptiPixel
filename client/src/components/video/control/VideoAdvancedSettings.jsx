import React, { useState } from 'react';
import { Sliders, ChevronDown, ChevronUp } from 'lucide-react';

export default function VideoAdvancedSettings({
  resolution,
  setResolution,
  codec,
  setCodec,
  mute,
  setMute
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="border border-zinc-800/80 rounded-lg overflow-hidden bg-zinc-950/40">
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full py-1.5 px-2.5 flex items-center justify-between text-[11px] text-zinc-400 hover:text-zinc-200 transition"
      >
        <div className="flex items-center gap-1.5">
          <Sliders className="w-3 h-3" />
          <span>Advanced (Codec, Scale, Audio)</span>
        </div>
        {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {showAdvanced && (
        <div className="p-2.5 border-t border-zinc-800 flex flex-col gap-2 animate-in fade-in duration-150">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-medium text-zinc-400 uppercase">Resolution</label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded px-2 py-1 outline-none"
            >
              <option value="original">Original</option>
              <option value="1080p">1080p (FHD)</option>
              <option value="720p">720p (HD)</option>
              <option value="480p">480p (SD)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-medium text-zinc-400 uppercase">Codec</label>
            <select
              value={codec}
              onChange={(e) => setCodec(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded px-2 py-1 outline-none"
            >
              <option value="libx264">H.264 (Universal)</option>
              <option value="libx265">H.265 (HEVC)</option>
              <option value="libvpx-vp9">VP9 (WebM)</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-1.5 rounded bg-zinc-900 border border-zinc-800 text-xs">
            <span className="text-zinc-300 text-[11px]">Remove Audio</span>
            <input
              type="checkbox"
              checked={mute}
              onChange={(e) => setMute(e.target.checked)}
              className="w-3.5 h-3.5 rounded bg-zinc-800 border-zinc-700 accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
