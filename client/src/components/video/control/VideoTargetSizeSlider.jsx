import React from 'react';

export default function VideoTargetSizeSlider({
  targetMB,
  setTargetMB,
  origMB
}) {
  const targetChips = origMB > 20
    ? [10, 16, 25, Math.round(origMB * 0.5)]
    : [
        Math.max(0.5, +(origMB * 0.25).toFixed(1)),
        Math.max(0.8, +(origMB * 0.5).toFixed(1)),
        Math.max(1.0, +(origMB * 0.75).toFixed(1))
      ];

  return (
    <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-zinc-400 uppercase">Target Cap</span>
        <span className="font-mono text-xs font-bold text-emerald-400 bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded">
          &lt; {targetMB} MB
        </span>
      </div>
      <div className="flex items-center gap-1">
        {targetChips.map((val) => (
          <button
            key={val}
            type="button"
            onClick={() => setTargetMB(val)}
            className={`flex-1 py-1 rounded border text-xs font-mono font-medium transition text-center ${
              targetMB === val
                ? 'border-emerald-500 bg-emerald-950/50 text-emerald-200'
                : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {val}MB
          </button>
        ))}
      </div>
      <input
        type="range"
        min={origMB > 10 ? 2 : 0.3}
        max={Math.max(10, Math.round(origMB))}
        step={origMB > 10 ? 1 : 0.1}
        value={targetMB}
        onChange={(e) => setTargetMB(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
      />
    </div>
  );
}
