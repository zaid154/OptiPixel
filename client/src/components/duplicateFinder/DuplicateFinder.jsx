import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal, ChevronUp, ChevronDown } from 'lucide-react';
import TopControlBar from './TopControlBar';
import ScanTelemetryCard from './ScanTelemetryCard';
import VirtualizedGroupFeed from './VirtualizedGroupFeed';
import SmartSelectStickyBar from './SmartSelectStickyBar';
import SynchronizedInspectorModal from './SynchronizedInspectorModal';
import SafeActionModal from './SafeActionModal';
import RestoreHistoryDrawer from './RestoreHistoryDrawer';
import StopConfirmModal from './StopConfirmModal';
import FolderPriorityModal from './FolderPriorityModal';
import ConsolidationPreviewModal from './ConsolidationPreviewModal';
import ConsolidationReportModal from './ConsolidationReportModal';
import ConsolidationAuditHubModal from './ConsolidationAuditHubModal';
import MisplacementReviewModal from './MisplacementReviewModal';
import ScanSummaryCard from './ScanSummaryCard';
import { useDuplicateFinder } from './useDuplicateFinder';
import { useFolderPriority } from './useFolderPriority';

export default function DuplicateFinder({ showToast }) {
  const navigate = useNavigate();
  const f = useDuplicateFinder(showToast);
  const priority = useFolderPriority(f.groups, f.setGroups, showToast, (path) => navigate(path));
  const [isBarCollapsed, setIsBarCollapsed] = useState(false);
  const [isSummaryDismissed, setIsSummaryDismissed] = useState(false);
  const [isMisplacementOpen, setIsMisplacementOpen] = useState(false);
  const [auditHubState, setAuditHubState] = useState({ isOpen: false, transactionId: null });

  useEffect(() => {
    if (f.isScanning) setIsSummaryDismissed(false);
  }, [f.isScanning]);

  const filteredGroups = useMemo(() => {
    return f.groups.filter((g) => {
      if (f.mediaFilter !== 'all' && !g.files.some((file) => file.mediaType === f.mediaFilter)) {
        return false;
      }
      const gMode = g.matchType === 'exact_sha256' ? 'exact' : g.matchType === 'raw_pixel' ? 'pixel' : 'visual';
      if (!f.matchModes.includes(gMode)) return false;
      const conf = Number(g.confidence ?? 100);
      return conf >= f.similarity;
    });
  }, [f.groups, f.mediaFilter, f.matchModes, f.similarity]);

  const detectedSubfolders = useMemo(() => {
    const set = new Set();
    for (const g of f.groups) {
      for (const file of g.files || []) {
        if (file.filePath) {
          const norm = file.filePath.replace(/\\/g, '/');
          const lastSlash = norm.lastIndexOf('/');
          if (lastSlash > 0) {
            const dir = file.filePath.substring(0, lastSlash);
            if (dir && dir.toLowerCase() !== (f.rootPath || '').toLowerCase()) {
              set.add(dir);
            }
          }
        }
      }
    }
    return Array.from(set).sort();
  }, [f.groups, f.rootPath]);

  const { allSelectedFiles, selectedBytes } = useMemo(() => {
    const files = filteredGroups.flatMap((g) => g.files.filter((file) => file.markedForDelete));
    const bytes = files.reduce((acc, file) => acc + (file.size || 0), 0);
    return { allSelectedFiles: files, selectedBytes: bytes };
  }, [filteredGroups]);
  const filteredGroupIds = useMemo(() => filteredGroups.map((g) => g.id), [filteredGroups]);

  return (
    <div className="w-full space-y-4 pb-16">
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
              hasResults={filteredGroups.length > 0}
              onStartScan={f.handleStartScan}
              onStopScan={f.requestStopScan}
              onClearResults={f.handleClearResults}
              onOpenMisplacementModal={() => setIsMisplacementOpen(true)}
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

      {f.isScanning && filteredGroups.length > 0 && (
        <div className="flex items-center justify-between p-2.5 px-4 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-semibold text-emerald-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>Live Progressive Stream: Displaying {filteredGroups.length} duplicate groups while scan finishes in background...</span>
          </div>
          <span className="font-mono text-[11px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Real-time</span>
        </div>
      )}

      {!isSummaryDismissed && !f.isScanning && filteredGroups.length > 0 && (
        <ScanSummaryCard
          groups={filteredGroups}
          rootPath={f.rootPath}
          telemetry={f.telemetry}
          onAutoSelectKeepBest={() => f.handleGlobalAutoSelect('keep_best_quality', filteredGroupIds)}
          onDismiss={() => setIsSummaryDismissed(true)}
        />
      )}

      {filteredGroups.length > 0 && (
        <SmartSelectStickyBar
          selectedCount={allSelectedFiles.length}
          selectedBytes={selectedBytes}
          masterFolder={priority.masterFolder}
          lastTransactionId={priority.lastTransactionId}
          onAutoSelectRule={(rule) => f.handleGlobalAutoSelect(rule, filteredGroupIds)}
          onOpenActionModal={() => f.setIsActionModalOpen(true)}
          onOpenHistoryDrawer={() => f.setIsHistoryDrawerOpen(true)}
          onOpenPriorityModal={() => priority.setIsPriorityModalOpen(true)}
          onRollbackConsolidation={priority.rollbackConsolidation}
          onOpenMisplacementModal={() => setIsMisplacementOpen(true)}
        />
      )}

      <VirtualizedGroupFeed
        groups={filteredGroups}
        subfolders={detectedSubfolders}
        isScanning={f.isScanning}
        lastTransactionId={priority.lastTransactionId}
        hasReport={!!priority.lastConsolidationReport || !!priority.lastTransactionId}
        onViewReport={() => navigate(priority.lastTransactionId ? `/audit/${priority.lastTransactionId}` : '/audit')}
        onRollback={priority.rollbackConsolidation}
        onOpenHistory={() => f.setIsHistoryDrawerOpen(true)}
        onOpenAuditHub={(txnId) => navigate(txnId ? `/audit/${txnId}` : (priority.lastTransactionId ? `/audit/${priority.lastTransactionId}` : '/audit'))}
        onToggleFile={f.handleToggleFile}
        onRouteFile={f.handleRouteFile}
        onInspectFile={(group, file) => f.setInspectModal({ isOpen: true, group, file })}
        onGroupAutoSelect={f.handleGroupAutoSelect}
      />

      {f.inspectModal.isOpen && (
        <SynchronizedInspectorModal
          group={f.inspectModal.group}
          initialFile={f.inspectModal.file}
          rootPath={f.rootPath}
          subfolders={detectedSubfolders}
          onToggleFile={f.handleToggleFile}
          onRouteFile={f.handleRouteFile}
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

      <FolderPriorityModal
        isOpen={priority.isPriorityModalOpen}
        onClose={() => priority.setIsPriorityModalOpen(false)}
        defaultFolder={detectedSubfolders[0] || f.rootPath}
        subfolders={detectedSubfolders}
        targetGroupsCount={filteredGroups.length}
        onPreview={(folder, opts, useFiltered) =>
          priority.previewPriority(folder, opts, useFiltered ? filteredGroups : f.groups)
        }
        onPreviewAutoAll={(useFiltered) =>
          priority.previewAutoAll(f.rootPath, priority.priorityOptions, useFiltered ? filteredGroups : f.groups)
        }
        onApplySelection={(folder, opts, useFiltered) =>
          priority.applyPriorityOnly(folder, opts, useFiltered ? filteredGroups : f.groups)
        }
      />

      <ConsolidationPreviewModal
        isOpen={priority.isConsolidatePreviewOpen}
        onClose={() => priority.setIsConsolidatePreviewOpen(false)}
        masterFolder={priority.masterFolder}
        summary={priority.previewSummary}
        isAutoAll={priority.isAutoAllMode}
        events={priority.autoAllEvents}
        isExecuting={priority.isExecuting}
        onConfirm={priority.executeConsolidation}
      />

      <ConsolidationAuditHubModal
        isOpen={auditHubState.isOpen || priority.isReportModalOpen}
        onClose={() => {
          setAuditHubState({ isOpen: false, transactionId: null });
          priority.setIsReportModalOpen(false);
        }}
        initialTransactionId={auditHubState.transactionId || priority.lastTransactionId}
        showToast={showToast}
      />

      <RestoreHistoryDrawer
        isOpen={f.isHistoryDrawerOpen}
        onClose={() => f.setIsHistoryDrawerOpen(false)}
        onShowToast={showToast}
        onOpenAuditHub={(txnId) => {
          f.setIsHistoryDrawerOpen(false);
          navigate(txnId ? `/audit/${txnId}` : '/audit');
        }}
      />

      <StopConfirmModal
        isOpen={f.isStopModalOpen}
        onClose={() => f.setIsStopModalOpen(false)}
        onConfirm={f.handleStopScan}
        percent={f.telemetry?.percent || 0}
      />

      <MisplacementReviewModal
        isOpen={isMisplacementOpen}
        onClose={() => setIsMisplacementOpen(false)}
        rootPath={f.rootPath}
        showToast={showToast}
      />
    </div>
  );
}
