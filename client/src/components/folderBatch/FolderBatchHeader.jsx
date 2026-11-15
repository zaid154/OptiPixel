import React from 'react';
import { FolderTree, ChevronRight } from 'lucide-react';

export default function FolderBatchHeader({ step, onStepClick }) {
  const steps = [
    { num: 1, label: 'Scan' },
    { num: 2, label: 'Settings' },
    { num: 3, label: 'Process' },
    { num: 4, label: 'Done' }
  ];

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
          <FolderTree className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Local Folder Batch Optimizer
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold shadow-2xs">
              11,000+ Files Support
            </span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Direct NVMe/SSD Disk Engine • Replicates exact folder structure • Zero browser upload lag
          </p>
        </div>
      </div>

      {/* Modern Stepper Indicator */}
      <div className="flex items-center gap-1.5 text-xs font-semibold bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
        {steps.map((s, idx) => (
          <React.Fragment key={s.num}>
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition ${
                step === s.num
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : step > s.num
                  ? 'bg-white text-emerald-800 border border-emerald-200/60 shadow-2xs cursor-pointer'
                  : 'text-slate-400'
              }`}
              onClick={() => (step > s.num && onStepClick ? onStepClick(s.num) : null)}
            >
              <span className="text-[11px] font-mono">{s.num}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {idx < steps.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
