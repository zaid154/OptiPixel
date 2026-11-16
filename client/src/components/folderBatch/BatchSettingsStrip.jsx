import React from 'react';
import { Sliders, ShieldCheck, Zap, Image as ImageIcon, Film, FastForward, HardDrive } from 'lucide-react';

export default function BatchSettingsStrip({ settings = {} }) {
  const isWebp = settings.imageFormat === 'webp';
  const imgQuality = settings.imageQuality || 90;

  let videoLabel = 'Smart Balanced';
  if (settings.videoMode === 'copy_all') videoLabel = 'Copy (Fastest)';
  else if (settings.videoMode === 'reencode_all') videoLabel = 'Max Compression';
  else if (settings.videoPreset === 'quality') videoLabel = 'Ultra Quality';
  else if (settings.videoPreset === 'speed') videoLabel = 'Smallest File';

  const videoCrf = settings.videoCrf || (settings.videoPreset === 'quality' ? 19 : settings.videoPreset === 'speed' ? 28 : 23);
  const minKb = settings.minImageSizeKB || 500;

  return (
    <div className="flex flex-wrap items-center gap-2 py-2 px-3.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-700 shadow-2xs">
      <div className="flex items-center gap-1.5 text-slate-500 font-bold uppercase text-[10px] tracking-wider shrink-0 mr-1">
        <Sliders className="w-3.5 h-3.5 text-slate-400" />
        <span>Selected Settings:</span>
      </div>

      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-medium shadow-2xs">
        <ImageIcon className="w-3 h-3 text-blue-600 shrink-0" />
        <span className="text-slate-400 text-[11px]">Photo:</span>
        <strong className="text-slate-800 font-mono">{isWebp ? 'Smart WebP' : 'Original Format'}</strong>
        <span className="text-emerald-700 font-bold font-mono text-[11px]">({imgQuality}% Q)</span>
      </div>

      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-medium shadow-2xs">
        <Film className="w-3 h-3 text-amber-600 shrink-0" />
        <span className="text-slate-400 text-[11px]">Video:</span>
        <strong className="text-slate-800 font-mono">
          {settings.videoMode === 'copy_all' ? 'Original Copy' : `${videoLabel} (CRF ${videoCrf})`}
        </strong>
        {settings.videoMode !== 'copy_all' && (
          <span className="text-slate-400 font-mono text-[10px]">QSV</span>
        )}
      </div>

      {settings.preserveExif !== false && (
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium shadow-2xs">
          <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
          <span className="text-[11px]">EXIF Kept</span>
        </div>
      )}

      {settings.smartQualityGuard !== false && (
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium shadow-2xs">
          <Zap className="w-3 h-3 text-amber-500 shrink-0" />
          <span className="text-[11px]">Guard &gt;{minKb}KB</span>
        </div>
      )}

      {settings.skipExisting !== false && (
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium shadow-2xs">
          <FastForward className="w-3 h-3 text-blue-500 shrink-0" />
          <span className="text-[11px]">Skip Existing</span>
        </div>
      )}

      {settings.copyNonMedia !== false && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-500 font-medium shadow-2xs">
          <HardDrive className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="text-[11px]">Copy Docs</span>
        </div>
      )}
    </div>
  );
}
