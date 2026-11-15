import React from 'react';
import { Sparkles } from 'lucide-react';

export default function ImageEnhancerSettings({
  enhance,
  setEnhance,
  sharpen,
  setSharpen,
  hdrContrast,
  setHdrContrast,
  vibrance,
  setVibrance,
  autoLevels,
  setAutoLevels,
  upscale2x,
  setUpscale2x,
  quality,
  setQuality
}) {
  return (
    <div className={`flex flex-col gap-2.5 p-3.5 rounded-xl border transition-all ${
      enhance ? 'bg-emerald-50/50 border-emerald-300 shadow-2xs' : 'bg-slate-50 border-slate-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className={`w-4 h-4 ${enhance ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
          <div className="flex flex-col">
            <span className={`text-xs font-bold ${enhance ? 'text-emerald-900' : 'text-slate-800'}`}>
              Clarity & Enhancement
            </span>
            <span className="text-[10px] text-slate-500">
              {enhance ? 'Active (Sharpen & Dynamic Range)' : 'Enhance details, HDR & 2x upscale'}
            </span>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enhance}
          onClick={() => {
            const next = !enhance;
            setEnhance(next);
            if (next && quality < 85) setQuality(88);
          }}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase transition border cursor-pointer ${
            enhance
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
              : 'bg-white border-slate-300 text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>{enhance ? 'ON' : 'OFF'}</span>
          <div className={`w-5 h-3 rounded-full p-0.5 transition-colors ${enhance ? 'bg-emerald-700' : 'bg-slate-300'}`}>
            <div className={`w-2 h-2 rounded-full bg-white shadow-xs transition-transform ${enhance ? 'translate-x-2' : 'translate-x-0'}`} />
          </div>
        </button>
      </div>

      {enhance && (
        <div className="flex flex-col gap-2.5 pt-2 border-t border-emerald-200/80 animate-in fade-in duration-150">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-700 font-semibold">
              <span>Micro-Sharpening</span>
              <span className="font-mono text-emerald-700 uppercase font-bold text-[10px]">{sharpen}</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {['none', 'light', 'medium', 'ultra'].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSharpen(lvl)}
                  className={`py-1 text-[10px] font-bold uppercase rounded-md border transition ${
                    sharpen === lvl
                      ? 'border-emerald-500 bg-white text-emerald-900 shadow-2xs'
                      : 'border-slate-200 bg-slate-100 text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            {[
              { label: 'HDR Contrast', active: hdrContrast, toggle: () => setHdrContrast(!hdrContrast) },
              { label: 'Vibrance', active: vibrance, toggle: () => setVibrance(!vibrance) },
              { label: 'Auto Levels', active: autoLevels, toggle: () => setAutoLevels(!autoLevels) }
            ].map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={t.toggle}
                className={`py-1.5 px-1 text-[10px] font-bold rounded-lg border transition text-center ${
                  t.active ? 'border-emerald-500 bg-white text-emerald-900 shadow-2xs' : 'border-slate-200 bg-slate-100 text-slate-500'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setUpscale2x(!upscale2x)}
            className={`w-full py-1.5 px-3 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              upscale2x
                ? 'border-emerald-500 bg-white text-emerald-900 shadow-xs'
                : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>2x HD Resolution (+Pixels)</span>
            {upscale2x && <span className="text-[10px] text-emerald-700 font-extrabold font-mono">ACTIVE</span>}
          </button>
        </div>
      )}
    </div>
  );
}
