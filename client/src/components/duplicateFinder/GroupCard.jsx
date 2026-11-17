import React from 'react';
import MediaItemCard from './MediaItemCard';
import { Layers, CheckCircle2, ShieldCheck, Check } from 'lucide-react';

export default function GroupCard({ group, groupIndex, subfolders = [], onToggleFile, onRouteFile, onInspectFile, onGroupAutoSelect }) {
  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const keepCount = group.files.filter((f) => !f.markedForDelete).length;
  const deleteCount = group.files.filter((f) => f.markedForDelete).length;
  const isExact = group.matchType === 'exact_sha256';

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3.5">
      {/* Group Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-900">Duplicate Group #{groupIndex + 1}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                {group.matchType === 'exact_sha256'
                  ? '100% Exact SHA-256'
                  : group.matchType === 'raw_pixel'
                  ? '100% 1:1 Pixel Match'
                  : `${group.confidence}% Visual Match`}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono mt-0.5">
              <span className="text-slate-500">
                {group.files.length} Copies • Reclaimable: <span className="text-emerald-700 font-semibold">{formatBytes(group.wastedBytes)}</span>
              </span>
              <span className="text-slate-300">•</span>
              {deleteCount > 0 ? (
                <span className="px-1.5 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-[10.5px]">
                  {deleteCount} to delete, {keepCount} to keep
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium text-[10.5px]">
                  All copies kept
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Group Quick Helpers */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => onGroupAutoSelect(group.id, 'keep_best_quality')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-semibold transition cursor-pointer shadow-2xs"
            title="Automatically keep the highest resolution and clarity copy"
          >
            <Check className="w-3 h-3 text-emerald-600" />
            Keep Best Quality
          </button>
          <button
            onClick={() => onGroupAutoSelect(group.id, 'keep_largest')}
            className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition cursor-pointer"
          >
            Keep Largest
          </button>
          <button
            onClick={() => onGroupAutoSelect(group.id, 'keep_oldest')}
            className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition cursor-pointer"
          >
            Keep Oldest
          </button>
        </div>
      </div>

      {/* Responsive Grid of File Cards (Adapts to copies count) */}
      <div className={
        group.files.length === 2
          ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
          : group.files.length === 3
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5'
          : group.files.length === 4
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5'
          : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3.5'
      }>
        {group.files.map((file) => (
          <MediaItemCard
            key={file.filePath}
            file={file}
            subfolders={subfolders}
            isLastKeep={keepCount <= 1}
            onToggle={(path) => onToggleFile(group.id, path)}
            onRouteFile={onRouteFile}
            onInspect={(f) => onInspectFile(group, f)}
          />
        ))}
      </div>
    </div>
  );
}
