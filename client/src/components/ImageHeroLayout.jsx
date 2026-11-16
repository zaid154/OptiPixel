import React from 'react';
import DropZone from './DropZone';
import { Zap, Sparkles, ShieldCheck, Sliders, Layers, Eye } from 'lucide-react';

export default function ImageHeroLayout({ onFilesSelected }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 3-Column Hero Section (Left Feature, Center Dropzone, Right Feature) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-stretch">
        {/* Left Feature Card (1 Column) */}
        <div className="lg:col-span-1 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
              <Zap className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">Lossless Optimization</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Reduce photo file sizes by up to 90% without visible artifacts.
              </p>
            </div>
          </div>

          <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <span className="text-slate-600"><strong className="text-slate-800">88% Sweetspot:</strong> Zero perceptual detail degradation.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <span className="text-slate-600"><strong className="text-slate-800">Next-Gen WebP & AVIF:</strong> Universal web performance.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <span className="text-slate-600"><strong className="text-slate-800">Target KB Mode:</strong> Cap strict file size limits.</span>
            </div>
          </div>
        </div>

        {/* Center Main DropZone (2 Columns) */}
        <div className="lg:col-span-2 flex flex-col justify-center">
          <DropZone onFilesSelected={onFilesSelected} isBatch={false} />
        </div>

        {/* Right Feature Card (1 Column) */}
        <div className="lg:col-span-1 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">Clarity & Image Filters</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Fine-tune micro-sharpness, HDR contrast, vibrance, or upscale 2x.
              </p>
            </div>
          </div>

          <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <span className="text-slate-600"><strong className="text-slate-800">Interactive Split Slider:</strong> Side-by-side inspection.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <span className="text-slate-600"><strong className="text-slate-800">Smart Micro-Sharpen:</strong> Crisp text & sharp edges.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <span className="text-slate-600"><strong className="text-slate-800">2x Scale:</strong> Lanczos3 interpolation.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Information Row (Fills the Bottom Void) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">Local Processing</div>
            <div className="text-[11px] text-slate-500">Files processed on-device; your photos stay private.</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">Batch Archive Available</div>
            <div className="text-[11px] text-slate-500">Compress 100+ images into a single .zip download.</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">Real-Time SSIM Quality</div>
            <div className="text-[11px] text-slate-500">Live preview with zoom inspection up to 3x.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
