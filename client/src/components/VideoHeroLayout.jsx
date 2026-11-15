import React from 'react';
import VideoDropZone from './VideoDropZone';
import { Film, Sparkles, ShieldCheck, Cpu, HardDrive } from 'lucide-react';

export default function VideoHeroLayout({ onVideoSelected, onError }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-stretch">
        <div className="lg:col-span-1 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
              <Film className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">Video Compression</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Smart CRF & Bitrate optimization for Discord, WhatsApp & web.
              </p>
            </div>
          </div>

          <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <span className="text-slate-600"><strong className="text-slate-800">Target Size:</strong> Hit exact MB targets (e.g. 25 MB limit).</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <span className="text-slate-600"><strong className="text-slate-800">H.264 & HEVC:</strong> Universal hardware compatibility.</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col justify-center">
          <VideoDropZone onVideoSelected={onVideoSelected} onError={onError} />
        </div>

        <div className="lg:col-span-1 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">Precision Playback</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Inspect frames side-by-side with theater mode and live stats.
              </p>
            </div>
          </div>

          <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <span className="text-slate-600"><strong className="text-slate-800">Dual Sync Player:</strong> Side-by-side visual comparison.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <span className="text-slate-600"><strong className="text-slate-800">Theater Mode:</strong> Expand to full screen width.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">Hardware Accelerated</div>
            <div className="text-[11px] text-slate-500">FFmpeg multi-core encoding pipeline.</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">100% In-Memory Processing</div>
            <div className="text-[11px] text-slate-500">Files are cleared immediately upon session end.</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">Up to 10 GB Supported</div>
            <div className="text-[11px] text-slate-500">High bitrate 4K and 1080p clips handled effortlessly.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
