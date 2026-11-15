import React, { useState } from 'react';
import { SlidersHorizontal, ChevronUp, ChevronDown } from 'lucide-react';
import TopControlBar from './TopControlBar';
import ScanTelemetryCard from './ScanTelemetryCard';
import VirtualizedGroupFeed from './VirtualizedGroupFeed';
import SmartSelectStickyBar from './SmartSelectStickyBar';
import SynchronizedInspectorModal from './SynchronizedInspectorModal';
import SafeActionModal from './SafeActionModal';
import RestoreHistoryDrawer from './RestoreHistoryDrawer';
import StopConfirmModal from './StopConfirmModal';
import { useDuplicateFinder } from './useDuplicateFinder';

export default function DuplicateFinder({ showToast }) {
  const f = useDuplicateFinder(showToast);
  const [isBarCollapsed, setIsBarCollapsed] = useState(false);

  const filteredGroups = f.groups.filter((g) => {
    if (f.mediaFilter !== 'all' && !g.files.some((file) => file.mediaType === f.mediaFilter)) {
      return false;
    }
    const gMode = g.matchType === 'exact_sha256' ? 'exact' : g.matchType === 'raw_pixel' ? 'pixel' : 'visual';
    if (!f.matchModes.includes(gMode)) return false;

    const conf = Number(g.confidence ?? 100);
    return conf >= f.similarity;
  });

  const allSelectedFiles = filteredGroups.flatMap((g) => g.files.filter((file) => file.markedForDelete));
  const selectedBytes = allSelectedFiles.reduce((acc, file) => acc + (file.size || 0), 0);
  const filteredGroupIds = filteredGroups.map((g) => g.id);

  return (
    <div className="w-full space-y-4 pb-16">
      {/* Top Bar with Clean Collapse Toggle */}
      <div className="relative">
        {!isBarCollapsed ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Search & Scan Filters</span>
              <button
                type="button"
                onClick={() => setIsBarCollapsed(true)}
                className="text-xs text-slate-500 hover:text-emerald-700 flex items-center gap-1 font-semibold transition cursor-pointer"
              >
                <span>Collapse Bar</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
            <TopControlBar
              rootPath={f.rootPath}
              setRootPath={f.setRootPath}
              isScanning={f.isScanning}
              onStartScan={f.handleStartScan}
              onStopScan={f.requestStopScan}
              similarity={f.similarity}
              setSimilarity={f.setSimilarity}
              matchModes={f.matchModes}
              setMatchModes={f.setMatchModes}
              mediaFilter={f.mediaFilter}
              setMediaFilter={f.setMediaFilter}
            />
          </div>
        ) : (
          <div className="flex items-center justify-between p-2.5 px-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
              <span>Filters Hidden (Maximum Photo View)</span>
            </div>
            <button
              type="button"
              onClick={() => setIsBarCollapsed(false)}
              className="px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>Expand Filters</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {f.isScanning && (
        <ScanTelemetryCard telemetry={f.telemetry || { stage: 'discovering', currentFile: 'Initializing scanner...' }} />
      )}

      {filteredGroups.length > 0 && (
        <SmartSelectStickyBar
          selectedCount={allSelectedFiles.length}
          selectedBytes={selectedBytes}
          onAutoSelectRule={(rule) => f.handleGlobalAutoSelect(rule, filteredGroupIds)}
          onOpenActionModal={() => f.setIsActionModalOpen(true)}
          onOpenHistoryDrawer={() => f.setIsHistoryDrawerOpen(true)}
        />
      )}

      <VirtualizedGroupFeed
        groups={filteredGroups}
        onToggleFile={f.handleToggleFile}
        onInspectFile={(group, file) => f.setInspectModal({ isOpen: true, group, file })}
        onGroupAutoSelect={f.handleGroupAutoSelect}
      />

      {f.inspectModal.isOpen && (
        <SynchronizedInspectorModal
          group={f.inspectModal.group}
          initialFile={f.inspectModal.file}
          onClose={() => f.setInspectModal({ isOpen: false, group: null, file: null })}
        />
      )}

      {f.isActionModalOpen && (
        <SafeActionModal
          selectedCount={allSelectedFiles.length}
          selectedBytes={selectedBytes}
          onConfirm={(mode) => f.handleExecuteAction(mode, allSelectedFiles)}
          onClose={() => f.setIsActionModalOpen(false)}
        />
      )}

      <RestoreHistoryDrawer
        isOpen={f.isHistoryDrawerOpen}
        onClose={() => f.setIsHistoryDrawerOpen(false)}
        onShowToast={showToast}
      />

      <StopConfirmModal
        isOpen={f.isStopModalOpen}
        onClose={() => f.setIsStopModalOpen(false)}
        onConfirm={f.handleStopScan}
        percent={f.telemetry?.percent || 0}
      />
    </div>
  );
}
