import { useState } from 'react';

export function useFolderPriority(groups, setGroups, showToast) {
  const [isPriorityModalOpen, setIsPriorityModalOpen] = useState(false);
  const [isConsolidatePreviewOpen, setIsConsolidatePreviewOpen] = useState(false);
  const [masterFolder, setMasterFolder] = useState('');
  const [activeGroups, setActiveGroups] = useState(null);
  const [priorityOptions, setPriorityOptions] = useState({
    upgradeQuality: true,
    rescueMissing: true,
    cleanExternalDuplicates: true,
  });
  const [previewSummary, setPreviewSummary] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastTransactionId, setLastTransactionId] = useState(null);

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

      setPreviewSummary(data.summary);
      setMasterFolder(targetFolder);
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
    try {
      const res = await fetch('/api/duplicates/consolidate/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterFolder, options: priorityOptions, groups: activeGroups || groups }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setLastTransactionId(data.transactionId);
      setIsConsolidatePreviewOpen(false);
      showToast?.(
        `Consolidation complete! Kept ${data.summary?.keptCount}, Upgraded ${data.summary?.upgradedCount}, Rescued ${data.summary?.rescuedCount}`,
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
    priorityOptions,
    setPriorityOptions,
    previewSummary,
    isExecuting,
    lastTransactionId,
    previewPriority,
    applyPriorityOnly,
    executeConsolidation,
    rollbackConsolidation,
  };
}
