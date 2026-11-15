import React from 'react';
import { Sliders, Target, Check } from 'lucide-react';

export default function ImageStrategySettings({
  mode,
  setMode,
  format,
  setFormat,
  quality,
  setQuality,
  targetKB,
  setTargetKB,
  enhance
}) {
  const targetPresets = [
    { label: '< 200 KB', kb: 200 },
    { label: '< 500 KB', kb: 500 },
    { label: '< 1 MB', kb: 1000 },
    { label: '< 2 MB', kb: 2000 }
  ];

  return (
    <div className="space-y-3.5">
      {/* Strategy Switcher */}
      <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 border border-slate-200 rounded-lg text-xs">
        <button
          onClick={() => setMode('quality')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md transition ${
            mode === 'quality' ? 'bg-white text-emerald-800 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Quality Mode</span>
        </button>
        <button
          onClick={() => setMode('target')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md transition ${
            mode === 'target' ? 'bg-white text-emerald-800 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Target Size</span>
        </button>
      </div>

      {/* Target Size or Quality Slider */}
      {mode === 'target' ? (
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">File Size Cap</label>
          <div className="grid grid-cols-2 gap-1.5">
            {targetPresets.map((preset) => (
              <button
                key={preset.kb}
                onClick={() => setTargetKB(preset.kb)}
                className={`py-2 px-2.5 rounded-lg border text-xs font-semibold transition flex items-center justify-between ${
                  targetKB === preset.kb ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-2xs' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <span>{preset.label}</span>
                {targetKB === preset.kb && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Quality</label>
            <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              {quality}%
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-100 border border-slate-200 rounded-lg text-xs">
            {[
              { val: 88, label: 'Zero Loss (88)' },
              { val: 80, label: 'Balanced (80)' },
              { val: 65, label: 'Compact (65)' }
            ].map((p) => (
              <button
                key={p.val}
                onClick={() => setQuality(p.val)}
                className={`py-1 px-1 rounded-md transition text-center text-[11px] ${
                  quality === p.val ? 'bg-white text-emerald-800 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <input
            type="range"
            min="30"
            max="100"
            value={quality}
            onChange={(e) => setQuality(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
        </div>
      )}

      {/* Output Format */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Output Format</label>
        <div className="grid grid-cols-3 gap-1.5">
          {['webp', 'jpeg', 'png'].map((fmt) => (
            <button
              key={fmt}
              onClick={() => setFormat(fmt)}
              className={`py-1.5 px-2 rounded-lg border text-xs font-bold uppercase transition text-center ${
                format === fmt ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-2xs' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
