import { useState } from 'react';

export function useFolderPriority(groups, setGroups, showToast, onNavigate) {
  const [isPriorityModalOpen, setIsPriorityModalOpen] = useState(false);
  const [isConsolidatePreviewOpen, setIsConsolidatePreviewOpen] = useState(false);
  const [masterFolder, setMasterFolder] = useState('');
  const [isAutoAllMode, setIsAutoAllMode] = useState(false);
  const [autoAllEvents, setAutoAllEvents] = useState([]);
  const [activeGroups, setActiveGroups] = useState(null);
  const [priorityOptions, setPriorityOptions] = useState({
    upgradeQuality: true,
    rescueMissing: true,
    cleanExternalDuplicates: true,
  });
  const [previewSummary, setPreviewSummary] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastTransactionId, setLastTransactionId] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [lastConsolidationReport, setLastConsolidationReport] = useState(null);

  const previewPriority = async (targetFolder, options = priorityOptions, targetGroups = groups) => {
    if (!targetFolder) return showToast?.('Please specify a master folder path', 'warning');
    try {
      const res = await fetch('/api/duplicates/priority/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterFolder: targetFolder, options, groups: targetGroups }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setIsAutoAllMode(false);
      setPreviewSummary(data.summary);
      setMasterFolder(targetFolder);
      setActiveGroups(targetGroups);
      setIsPriorityModalOpen(false);
      setIsConsolidatePreviewOpen(true);
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  const previewAutoAll = async (rootPath, options = priorityOptions, targetGroups = groups) => {
    try {
      const res = await fetch('/api/duplicates/priority/auto-all/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootPath, options, groups: targetGroups }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setIsAutoAllMode(true);
      setAutoAllEvents(data.events || []);
      setPreviewSummary(data.summary);
      setMasterFolder(rootPath);
      setActiveGroups(targetGroups);
      setIsPriorityModalOpen(false);
      setIsConsolidatePreviewOpen(true);
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  const applyPriorityOnly = async (targetFolder, options = priorityOptions, targetGroups = groups) => {
    if (!targetFolder) return showToast?.('Please specify a master folder path', 'warning');
    try {
      const res = await fetch('/api/duplicates/priority/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterFolder: targetFolder, options, groups: targetGroups }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.groups) {
        const updatedMap = new Map(data.groups.map((g) => [g.id, g]));
        setGroups((prev) => prev.map((g) => updatedMap.get(g.id) || g));
        setMasterFolder(targetFolder);
        showToast?.('Master folder priority rules applied to selection!', 'success');
      }
      setIsPriorityModalOpen(false);
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  const executeConsolidation = async () => {
    if (!masterFolder) return;
    setIsExecuting(true);
    const endpoint = isAutoAllMode ? '/api/duplicates/priority/auto-all/execute' : '/api/duplicates/consolidate/execute';
    const payload = isAutoAllMode
      ? { rootPath: masterFolder, options: priorityOptions, groups: activeGroups || groups }
      : { masterFolder, options: priorityOptions, groups: activeGroups || groups };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setLastTransactionId(data.transactionId);
      setLastConsolidationReport({
        transactionId: data.transactionId,
        masterFolder: isAutoAllMode ? 'All Discovered Events' : masterFolder,
        summary: data.summary,
        operations: data.operations || [],
        status: 'completed',
      });
      setIsConsolidatePreviewOpen(false);
      if (onNavigate && data.transactionId) {
        onNavigate(`/audit/${data.transactionId}`);
      } else {
        setIsReportModalOpen(true);
      }
      showToast?.(
        isAutoAllMode
          ? `All Events Consolidated! Organized ${data.summary?.discoveredEventsCount || ''} events, Upgraded ${data.summary?.upgradedCount}, Quarantined ${data.summary?.deletedCount}`
          : `Consolidation complete! Kept ${data.summary?.keptCount}, Upgraded ${data.summary?.upgradedCount}`,
        'success'
      );

      const delSet = new Set((data.operations || []).filter((o) => o.action === 'DELETE').map((o) => o.sourcePath));
      setGroups((prev) =>
        prev
          .map((g) => ({ ...g, files: g.files.filter((f) => !delSet.has(f.filePath)) }))
          .filter((g) => g.files.length > 1)
      );
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  const rollbackConsolidation = async (txnId = lastTransactionId) => {
    if (!txnId) return;
    try {
      const res = await fetch('/api/duplicates/consolidate/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txnId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setLastTransactionId(null);
      setLastConsolidationReport((prev) => (prev?.transactionId === txnId ? { ...prev, status: 'rolled_back' } : prev));
      showToast?.(`Rollback successful! Restored ${data.restoredCount} files.`, 'success');

      const gRes = await fetch('/api/duplicates/groups');
      const gData = await gRes.json();
      if (gData.groups) setGroups(gData.groups);
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  return {
    isPriorityModalOpen,
    setIsPriorityModalOpen,
    isConsolidatePreviewOpen,
    setIsConsolidatePreviewOpen,
    masterFolder,
    setMasterFolder,
    isAutoAllMode,
    autoAllEvents,
    priorityOptions,
    setPriorityOptions,
    previewSummary,
    isExecuting,
    lastTransactionId,
    isReportModalOpen,
    setIsReportModalOpen,
    lastConsolidationReport,
    setLastConsolidationReport,
    previewPriority,
    previewAutoAll,
    applyPriorityOnly,
    executeConsolidation,
    rollbackConsolidation,
  };
}
