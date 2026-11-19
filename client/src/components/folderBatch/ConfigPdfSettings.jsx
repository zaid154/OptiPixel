import React from 'react';
import { FileText, CheckCircle2, Copy, ShieldCheck, Lock, Sparkles } from 'lucide-react';

export default function ConfigPdfSettings({ optimizePdf = true, setOptimizePdf = () => {} }) {
  return (
    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
      {/* Header with dynamic status badge */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <FileText className="w-3.5 h-3.5 text-rose-600" />
          <span>PDF & Document Optimization</span>
        </div>
        {optimizePdf ? (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-semibold flex items-center gap-1 shadow-2xs">
            <Sparkles className="w-2.5 h-2.5 fill-current" /> Lossless Compression ON
          </span>
        ) : (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono font-semibold flex items-center gap-1 shadow-2xs">
            <Copy className="w-2.5 h-2.5" /> Copy Only (Compression OFF)
          </span>
        )}
      </div>

      {/* Main card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900">Document Processing Mode</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 font-semibold font-mono">
              100% Vector Text Crisp
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {optimizePdf
              ? 'Losslessly deflates PDF streams, strips redundant metadata bloat, and keeps text 100% crisp & zoomable.'
              : 'Direct 1:1 bit-for-bit file copy without any compression or modification to original PDF files.'}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[10px] text-slate-500 font-medium">
            <span className="flex items-center gap-1 text-emerald-700">
              <ShieldCheck className="w-3 h-3 text-emerald-600" /> Digital Signatures Kept Safe
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-600">
              <Lock className="w-3 h-3 text-slate-400" /> Encrypted PDFs Bypassed Safely
            </span>
            <span>•</span>
            <span className="text-slate-600">Smart Guard &gt; 5% savings</span>
          </div>
        </div>

        {/* 2-Option Segmented Selector */}
        <div className="grid grid-cols-2 gap-2 sm:w-80 shrink-0">
          <button
            type="button"
            onClick={() => setOptimizePdf(true)}
            className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
              optimizePdf
                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs font-bold ring-1 ring-emerald-500'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <CheckCircle2 className={`w-3.5 h-3.5 ${optimizePdf ? 'text-emerald-600' : 'text-slate-300'}`} />
              <span>Optimize PDFs</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Compress streams & clean</div>
          </button>

          <button
            type="button"
            onClick={() => setOptimizePdf(false)}
            className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
              !optimizePdf
                ? 'bg-slate-100 border-slate-400 text-slate-900 shadow-xs font-bold ring-1 ring-slate-400'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <Copy className={`w-3.5 h-3.5 ${!optimizePdf ? 'text-slate-700' : 'text-slate-300'}`} />
              <span>Copy Only</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">1:1 Raw original clone</div>
          </button>
        </div>
      </div>
    </div>
  );
}
