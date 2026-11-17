import React, { useRef } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import GroupCard from './GroupCard';
import { Layers } from 'lucide-react';

export default function VirtualizedGroupFeed({
  groups,
  subfolders = [],
  isScanning = false,
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
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3 min-h-[300px] shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">No Duplicates to Display</h3>
        <p className="text-xs text-slate-500 max-w-sm">
          Enter a local folder path above and click &quot;Start Scan&quot; to discover exact and visual duplicate photos and videos.
        </p>
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
