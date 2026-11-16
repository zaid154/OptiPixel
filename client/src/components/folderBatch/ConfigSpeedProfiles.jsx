import React from 'react';
import { Zap, CheckCircle2 } from 'lucide-react';

export default function ConfigSpeedProfiles({ videoMode, setVideoMode, setMinVideoSizeMB, setVideoCrf }) {
  return (
    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3 shadow-2xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-slate-800">Speed & Performance Engine</span>
        </div>
        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
          Hardware Accelerated (Parallel Workers)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {/* Option 1: Max Compression */}
        <button
          type="button"
          onClick={() => { setVideoMode('reencode_all'); setMinVideoSizeMB(0); setVideoCrf(23); }}
          className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
            videoMode === 'reencode_all'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/40 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
          }`}
        >
          <div>
            <div className="text-xs font-bold flex items-center justify-between text-slate-900">
              <span>Max Size Reduction</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">Save 50%+</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Full video re-encoding across all files. Reclaims up to 50%+ disk space.
            </p>
          </div>
          <span className="text-[10px] font-mono text-amber-700 font-semibold mt-2">Cuts size by 40%–65%</span>
        </button>

        {/* Option 2: Copy All Videos As-Is */}
        <button
          type="button"
          onClick={() => setVideoMode('copy_all')}
          className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
            videoMode === 'copy_all'
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400/40 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
          }`}
        >
          <div>
            <div className="text-xs font-bold flex items-center justify-between text-slate-900">
              <span>Photos Only</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold border border-blue-200">Fast Copy</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Compress photos while preserving all videos bit-for-bit without re-encoding.
            </p>
          </div>
          <span className="text-[10px] font-mono text-blue-700 font-semibold mt-2">Instant (Copies videos as-is)</span>
        </button>

        {/* Option 3: Smart Balanced */}
        <button
          type="button"
          onClick={() => { setVideoMode('smart'); setMinVideoSizeMB(15); setVideoCrf(23); }}
          className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
            videoMode === 'smart'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/40 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
          }`}
        >
          <div>
            <div className="text-xs font-bold flex items-center justify-between text-slate-900">
              <span>Smart Balance</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">Recommended</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Intelligently skips already compressed clips and re-encodes bloated files.
            </p>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 font-semibold mt-2">Balanced Quality & Size</span>
        </button>
      </div>
    </div>
  );
}
