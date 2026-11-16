import React from 'react';
import { Sparkles, ShieldCheck, Zap, Check } from 'lucide-react';

export const friendlyPresets = [
  {
    id: 'balanced',
    title: 'Smart Balance',
    tag: 'Recommended',
    ratio: 0.42,
    desc: 'Reduces size by ~60% while maintaining visual fidelity',
    icon: Sparkles
  },
  {
    id: 'ultra_lossless',
    title: 'High Fidelity',
    tag: 'High Quality',
    ratio: 0.72,
    desc: 'Visually indistinguishable from master original',
    icon: ShieldCheck
  },
  {
    id: 'compact',
    title: 'Smallest File',
    tag: 'Save ~75%',
    ratio: 0.25,
    desc: 'Lightweight encoding for messaging & web upload',
    icon: Zap
  }
];

export default function VideoPresetSelector({
  preset,
  setPreset,
  origMB,
  isProcessing,
  hasResult,
  onStartCompress
}) {
  const current = friendlyPresets.find((p) => p.id === preset) || friendlyPresets[0];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-3 gap-1.5">
        {friendlyPresets.map((p) => {
          const isSelected = preset === p.id;
          const itemEstMB = (origMB * p.ratio).toFixed(1);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPreset(p.id);
                if (preset === p.id && !isProcessing && !hasResult) {
                  onStartCompress();
                }
              }}
              className={`p-2 rounded-lg border text-left transition flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-950/40 text-zinc-100 ring-1 ring-emerald-500/50'
                  : 'border-zinc-800 bg-zinc-950/70 hover:border-zinc-700 text-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs truncate">{p.title}</span>
                {isSelected && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
              </div>
              <span className={`text-[10px] font-semibold mt-1 ${isSelected ? 'text-emerald-300' : 'text-zinc-500'}`}>
                {p.tag}
              </span>
              <span className="text-[10px] font-mono text-zinc-500 mt-0.5">
                ~{itemEstMB} MB
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-zinc-400 px-1 pt-0.5">
        {current.desc}
      </p>
    </div>
  );
}
