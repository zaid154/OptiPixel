import React, { useRef } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import GroupCard from './GroupCard';
import { Layers, CheckCircle2, Undo2, History, FileText, Search, ShieldCheck, Sparkles, GitCompare, HardDrive, Play } from 'lucide-react';

export default function VirtualizedGroupFeed({
  groups,
  subfolders = [],
  isScanning = false,
  lastTransactionId = null,
  hasReport = false,
  onViewReport = null,
  onRollback,
  onOpenHistory,
  onOpenAuditHub = null,
  onToggleFile,
  onRouteFile,
  onInspectFile,
  onGroupAutoSelect
}) {
  const parentRef = useRef(null);

  const rowVirtualizer = useWindowVirtualizer({
    count: groups.length,
    estimateSize: () => 380,
    overscan: 12,
    scrollMargin: parentRef.current?.offsetTop ?? 0
  });

  if (groups.length === 0) {
    if (isScanning) {
      return (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3 min-h-[300px] shadow-xs">
          <div className="w-10 h-10 border-3 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
          <h3 className="text-sm font-bold text-slate-800">Analyzing Media & Searching Duplicates...</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Scanning files and matching perceptual fingerprints. Discovered duplicate groups will stream in live as matches are confirmed.
          </p>
        </div>
      );
    }

    if (lastTransactionId) {
      return (
        <div className="bg-white border border-emerald-200 rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-3 min-h-[300px] shadow-xs animate-in fade-in duration-200">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">All Duplicates Resolved!</h3>
          <p className="text-xs text-slate-500 max-w-md">
            Your media library has been consolidated. Redundant copies were safely moved to your local quarantine folder.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            {(hasReport || lastTransactionId) && (onOpenAuditHub || onViewReport) && (
              <button
                type="button"
                onClick={() => (onOpenAuditHub ? onOpenAuditHub(lastTransactionId) : onViewReport?.())}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Open Dedicated Audit Hub (with Pictures)</span>
              </button>
            )}
            {onRollback && (
              <button
                type="button"
                onClick={onRollback}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Undo Consolidation</span>
              </button>
            )}
            {onOpenHistory && (
              <button
                type="button"
                onClick={onOpenHistory}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-slate-300" />
                <span>View Quarantine History</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs text-left">
        {/* Top Header & Overview */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
                <Search className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Smart Duplicate & Quality-Aware Cleanup
              </h3>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Safe Quarantine Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
              Dhoond nikalta hai exact copy photos aur WhatsApp/social media ki compressed copies. OptiPixel resolution aur clarity compare karke <strong>Camera wali best quality photo ko bachata hai</strong> aur bekaar duplicate copy ko quarantine ke liye select karta hai.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Zero-Deletion Guarantee</span>
            </span>
          </div>
        </div>

        {/* 3 Core Capabilities */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                <GitCompare className="w-4 h-4" />
              </div>
              <span>1. Visual AI & Exact Match</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Perceptual Hashing (<code>pHash</code>) aur SHA-256 use karke exact photos ke saath WhatsApp/Telegram ki downscaled ya format-converted photos ko bhi dhoond leta hai.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
              <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                <Sparkles className="w-4 h-4" />
              </div>
              <span>2. Auto-Keeps Best Quality</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Resolution (4K vs 720p), sharpness aur EXIF camera data compare karke system <strong>Original Best Quality Photo ko 'KEEP' mark karta hai</strong> aur low-res copy ko delete select karta hai.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                <HardDrive className="w-4 h-4" />
              </div>
              <span>3. 100% Safe Quarantine</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Koi bhi duplicate permanent delete nahi hota — sabhi files <strong>Restore Hub (Quarantine)</strong> me safe rehti hain jise aap kabhi bhi 1-click me wapas la sakte hain!
            </p>
          </div>
        </div>

        {/* Quick 2-Step Action Instructions Banner */}
        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            </div>
            <div>
              <span className="font-bold text-emerald-950 block">Kaise Shuru Karein (How to Start):</span>
              <p className="text-slate-600 mt-0.5">
                Upar diye gaye <strong>"Browse"</strong> button se folder choose karein aur green <strong>"Start Scan"</strong> button par click karein.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-800 shrink-0">
            <span className="px-2.5 py-1 rounded-md bg-white border border-emerald-200 font-semibold shadow-2xs">
              ⚡ Instant Deep Scan
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="w-full">
      <div
        className="relative w-full"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const group = groups[virtualRow.index];
          return (
            <div
              key={group.id}
              ref={rowVirtualizer.measureElement}
              data-index={virtualRow.index}
              className="absolute top-0 left-0 w-full pb-4"
              style={{
                transform: `translateY(${virtualRow.start - (rowVirtualizer.options.scrollMargin || 0)}px)`
              }}
            >
              <GroupCard
                group={group}
                groupIndex={virtualRow.index}
                subfolders={subfolders}
                onToggleFile={onToggleFile}
                onRouteFile={onRouteFile}
                onInspectFile={onInspectFile}
                onGroupAutoSelect={onGroupAutoSelect}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
