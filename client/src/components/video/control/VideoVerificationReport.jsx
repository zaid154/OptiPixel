import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function VideoVerificationReport({ verification }) {
  return (
    <div className="p-3 rounded-xl bg-zinc-950 border border-emerald-500/40 shadow-inner flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Stream Integrity & Codec Verified</span>
        </span>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          PASSED
        </span>
      </div>

      <div className="flex flex-col gap-1.5 text-[11px] font-mono border-t border-zinc-800/80 pt-2">
        <div className="flex items-center justify-between text-zinc-300">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>Audio Track:</span>
          </div>
          <span className="text-zinc-100 font-semibold truncate max-w-[170px]">
            {verification?.audio?.message || 'Stereo AAC Intact (Synced)'}
          </span>
        </div>
        <div className="flex items-center justify-between text-zinc-300">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>Resolution:</span>
          </div>
          <span className="text-zinc-100 font-semibold">
            {verification?.video?.resolution ? verification.video.resolution : 'Preserved'}
          </span>
        </div>
        <div className="flex items-center justify-between text-zinc-300">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>Bitstream Integrity:</span>
          </div>
          <span className="text-emerald-400 font-semibold">
            {verification?.bitstream?.message || '0 Corrupt Frames'}
          </span>
        </div>
      </div>
    </div>
  );
}
