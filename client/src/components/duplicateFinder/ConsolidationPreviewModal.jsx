import React from 'react';
import { ShieldCheck, ArrowUpRight, FolderPlus, Trash2, HardDrive, CheckCircle2, X, Loader2, Layers } from 'lucide-react';

export default function ConsolidationPreviewModal({
  isOpen,
  onClose,
  masterFolder,
  summary,
  isAutoAll = false,
  events = [],
  isExecuting,
  onConfirm,
}) {
  if (!isOpen || !summary) return null;

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200/90 shadow-xl overflow-hidden text-slate-800">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600">
              {isAutoAll ? <Layers className="w-5 h-5" /> : <HardDrive className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isAutoAll ? 'Auto-Consolidate All Events Impact' : 'Consolidation Impact Preview'}
              </h3>
              <p className="text-xs text-slate-500 font-mono truncate max-w-xs">
                {isAutoAll ? `Organizing ${summary.discoveredEventsCount || events.length} Event Folders` : masterFolder}
              </p>
            </div>
          </div>
          <button onClick={onClose} disabled={isExecuting} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Impact Cards Grid */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
              <div className="flex items-center gap-1.5 text-emerald-800 font-semibold mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Kept in Events</span>
              </div>
              <span className="text-xl font-bold font-mono text-emerald-900">{summary.keptCount}</span>
              <p className="text-[10px] text-emerald-700/80 mt-0.5">Primary originals preserved</p>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80">
              <div className="flex items-center gap-1.5 text-amber-800 font-semibold mb-1">
                <ArrowUpRight className="w-4 h-4 text-amber-600" />
                <span>Upgraded & Moved</span>
              </div>
              <span className="text-xl font-bold font-mono text-amber-900">{summary.upgradedCount}</span>
              <p className="text-[10px] text-amber-700/80 mt-0.5">High-res copies routed in</p>
            </div>

            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/80">
              <div className="flex items-center gap-1.5 text-indigo-800 font-semibold mb-1">
                <FolderPlus className="w-4 h-4 text-indigo-600" />
                <span>Rescued Missing</span>
              </div>
              <span className="text-xl font-bold font-mono text-indigo-900">{summary.rescuedCount}</span>
              <p className="text-[10px] text-indigo-700/80 mt-0.5">Missing photos saved to events</p>
            </div>

            <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/80">
              <div className="flex items-center gap-1.5 text-rose-800 font-semibold mb-1">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Quarantined</span>
              </div>
              <span className="text-xl font-bold font-mono text-rose-900">{summary.deletedCount}</span>
              <p className="text-[10px] text-rose-700/80 mt-0.5">Freed: {formatBytes(summary.freedBytes)}</p>
            </div>
          </div>

          {/* Event Chips List */}
          {isAutoAll && events?.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
                Targeted Event Folders ({events.length}):
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {events.map((ev) => (
                  <span key={ev.name} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[10.5px] font-mono">
                    📁 {ev.name} ({ev.count})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Safety Notice */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-600 leading-relaxed">
              <strong>100% Safe Quarantine & Undo</strong>: Redundant files are moved to a local hidden quarantine folder. You can reverse this anytime with 1-click. Unrelated event photos are never touched.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button onClick={onClose} disabled={isExecuting} className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-200/60 transition">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-xs"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Consolidating...</span>
              </>
            ) : (
              <>
                <HardDrive className="w-3.5 h-3.5" />
                <span>Confirm & Consolidate</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
