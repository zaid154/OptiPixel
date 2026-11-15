import React from 'react';
import { Image as ImageIcon, Film } from 'lucide-react';

export default function ConfigPhotoVideoSettings({
  imageFormat,
  setImageFormat,
  imageQuality,
  setImageQuality,
  videoPreset,
  setVideoPreset,
  setVideoCrf
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Photo Quality Settings */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 border-b border-slate-200 pb-2">
          <ImageIcon className="w-3.5 h-3.5 text-blue-600" /> <span>Photo Quality Settings</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setImageFormat('webp')}
            className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
              imageFormat === 'webp' ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-2xs font-bold' : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            <div className="text-xs font-bold">Smart WebP</div>
            <div className="text-[10px] text-slate-500">~65% cut, 100% crisp</div>
          </button>
          <button
            type="button"
            onClick={() => setImageFormat('original')}
            className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
              imageFormat === 'original' ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-2xs font-bold' : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            <div className="text-xs font-bold">Keep Format</div>
            <div className="text-[10px] text-slate-500">JPG → JPG, PNG → PNG</div>
          </button>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-600 font-semibold">Quality:</span>
            <span className="font-mono font-bold text-emerald-700">{imageQuality}% (Studio Crisp)</span>
          </div>
          <input
            type="range" min="75" max="95" value={imageQuality}
            onChange={(e) => setImageQuality(parseInt(e.target.value, 10))}
            className="w-full accent-emerald-600 cursor-pointer"
          />
        </div>
      </div>

      {/* Video Presets */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Film className="w-3.5 h-3.5 text-amber-600" /> <span>Video Presets</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-semibold">Intel Iris Xe QSV</span>
        </div>
        <div className="space-y-1.5">
          {[
            { id: 'balanced', label: 'Smart Balance (CRF 23)', desc: '~60% size cut, full 4K/1080p preserved' },
            { id: 'quality', label: 'Ultra Quality (CRF 19)', desc: '~40% size cut, virtually lossless' },
            { id: 'speed', label: 'Smallest File (CRF 28)', desc: '~75% size cut for maximum storage' }
          ].map((p) => (
            <button
              key={p.id} type="button"
              onClick={() => { setVideoPreset(p.id); setVideoCrf(p.id === 'quality' ? 19 : p.id === 'speed' ? 28 : 23); }}
              className={`w-full p-2 rounded-lg border text-left transition flex items-center justify-between cursor-pointer ${
                videoPreset === p.id ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-2xs font-bold' : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              <div><div className="text-xs">{p.label}</div><div className="text-[10px] text-slate-500">{p.desc}</div></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
