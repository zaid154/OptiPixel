import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function ConfigQualityGuard({
  smartQualityGuard,
  setSmartQualityGuard,
  minImageSizeKB,
  setMinImageSizeKB,
  minVideoSizeMB,
  setMinVideoSizeMB
}) {
  return (
    <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/90 space-y-3 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-2.5">
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-bold text-emerald-950 flex items-center gap-2">
              Smart Quality Guard (Need-Based Optimization)
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">Zero Degradation</span>
            </span>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Jo photos/videos pehle se light hain unhe untouched rakhega. Kaam sirf un heavy files par hoga jinko compression ki zarurat hai.
            </p>
          </div>
        </div>

        <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={smartQualityGuard}
            onChange={(e) => setSmartQualityGuard(e.target.checked)}
            className="rounded accent-emerald-600 w-3.5 h-3.5"
          />
          <span>Active Guard</span>
        </label>
      </div>

      {smartQualityGuard && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Photos */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-700 font-semibold">Photos untouched if smaller than:</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '300 KB', val: 300 },
                { label: '500 KB (Recommended)', val: 500 },
                { label: '1 MB', val: 1024 },
                { label: 'All Photos', val: 0 }
              ].map((chip) => (
                <button
                  key={chip.val}
                  type="button"
                  onClick={() => setMinImageSizeKB(chip.val)}
                  className={`text-[11px] px-2 py-0.5 rounded-md border font-mono transition cursor-pointer ${
                    minImageSizeKB === chip.val
                      ? 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Videos */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-700 font-semibold">Videos untouched if smaller than:</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '5 MB', val: 5 },
                { label: '15 MB (Recommended)', val: 15 },
                { label: '30 MB', val: 30 },
                { label: 'All Videos', val: 0 }
              ].map((chip) => (
                <button
                  key={chip.val}
                  type="button"
                  onClick={() => setMinVideoSizeMB(chip.val)}
                  className={`text-[11px] px-2 py-0.5 rounded-md border font-mono transition cursor-pointer ${
                    minVideoSizeMB === chip.val
                      ? 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
