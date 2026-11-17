import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { applyGroupAutoSelect, applyGlobalAutoSelect } from './duplicateSelectionUtils';
import { getSavedDupSettings, saveDupSettings, getSavedSelections, saveDupSelections, clearDupSelections } from './duplicatePersistence';

export function useDuplicateFinder(showToast) {
  const saved = getSavedDupSettings();
  const [rootPath, setRootPath] = useState(saved.rootPath || '');
  const [isScanning, setIsScanning] = useState(false);
  const [similarity, setSimilarity] = useState(saved.similarity || 95);
  const [matchModes, setMatchModes] = useState(saved.matchModes || ['exact', 'visual']);
  const [mediaFilter, setMediaFilter] = useState(saved.mediaFilter || 'all');
  const [telemetry, setTelemetry] = useState(null);
  const [groups, setGroups] = useState([]);
  const [inspectModal, setInspectModal] = useState({ isOpen: false, group: null, file: null });
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isStopModalOpen, setIsStopModalOpen] = useState(false);
  const hasUserChangedFilter = useRef(false);

  const handleSetSimilarity = (val) => {
    hasUserChangedFilter.current = true;
    setSimilarity(val);
  };

  const handleSetMatchModes = (val) => {
    hasUserChangedFilter.current = true;
    setMatchModes(val);
  };

  useEffect(() => { saveDupSettings({ rootPath, similarity, matchModes, mediaFilter }); }, [rootPath, similarity, matchModes, mediaFilter]);

  useEffect(() => {
    fetch('/api/duplicates/groups').then((r) => r.json()).then((d) => {
      if (d.rootPath && !rootPath) setRootPath(d.rootPath);
      if (d.isScanning) { setIsScanning(true); if (d.telemetry) setTelemetry(d.telemetry); }
      if (d.groups?.length) {
        const sel = getSavedSelections();
        const hasCustomSel = sel && Object.keys(sel).length > 0;
        setGroups(d.groups.map((g) => ({
          ...g,
          files: g.files.map((f) => ({
            ...f,
            markedForDelete: hasCustomSel && sel[f.filePath] !== undefined ? Boolean(sel[f.filePath]) : false
          }))
        })));
      }
    }).catch((err) => {
      console.error('Failed to load duplicate groups on mount:', err);
    });

    const socket = io({ path: '/socket.io', transports: ['websocket', 'polling'] });
    socket.on('scan:progress', (d) => { setTelemetry(d); if (d.isScanning !== undefined) setIsScanning(d.isScanning); });
    socket.on('scan:partial_groups', (d) => {
      if (d.groups?.length) {
        const cleanPartial = d.groups.map((g) => ({
          ...g,
          files: g.files.map((f) => ({ ...f, markedForDelete: false }))
        }));
        setGroups(cleanPartial);
        showToast?.(`Live Stream: Found ${d.count} duplicate groups (${d.tier || 'progressive'})...`, 'info');
      }
    });
    socket.on('scan:complete', (d) => {
      setIsScanning(false);
      const cleanGroups = (d.groups || []).map((g) => ({
        ...g,
        files: g.files.map((f) => ({ ...f, markedForDelete: false }))
      }));
      setGroups(cleanGroups);
      clearDupSelections();
      if (d.cached) {
        showToast?.(`Instant cache hit: Loaded ${d.groupsCount} groups (< 100ms)!`, 'success');
      } else {
        showToast?.(`Scan complete! Found ${d.groupsCount} duplicate groups.`, 'success');
      }
    });
    socket.on('scan:clear', () => {
      setGroups([]);
      clearDupSelections();
      setTelemetry(null);
    });
    socket.on('scan:error', (err) => { setIsScanning(false); showToast?.(err.message || 'Scan error', 'error'); });
    return () => socket.disconnect();
  }, [showToast]);

  useEffect(() => {
    if (!isScanning) return;
    const sse = new EventSource('/api/duplicates/progress-stream');
    sse.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d) {
          setTelemetry(d);
          if (!d.isScanning && (d.stage === 'complete' || d.stage === 'idle')) {
            setIsScanning(false);
            fetch('/api/duplicates/groups').then((r) => r.json()).then((g) => setGroups(g.groups || []));
          }
        }
      } catch {}
    };
    return () => sse.close();
  }, [isScanning]);

  useEffect(() => {
    if (!hasUserChangedFilter.current || isScanning || groups.length === 0) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/duplicates/recluster', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ similarityThreshold: similarity, matchModes })
        });
        const data = await res.json();
        if (data.groups) setGroups(data.groups);
      } catch (err) {
        console.error('Recluster failed:', err);
        showToast?.('Failed to recluster duplicate groups', 'error');
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [similarity, matchModes, isScanning]);

  const handleStartScan = async () => {
    if (isScanning) return;
    const cleanPath = rootPath.replace(/^["']+|["']+$/g, '').trim();
    if (!cleanPath) return showToast?.('Please specify a folder path', 'warning');
    setRootPath(cleanPath);
    setIsScanning(true);
    setGroups([]);
    saveDupSelections([]);
    clearDupSelections();
    setTelemetry({
      stage: 'discovering',
      processed: 0,
      total: 0,
      currentFile: `Scanning ${cleanPath}...`,
      percent: 0,
      activeRootPath: cleanPath,
      itemsPerSec: '0',
      elapsedSeconds: 0
    });
    try {
      const res = await fetch('/api/duplicates/scan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootPath: cleanPath, similarityThreshold: similarity, matchModes })
      });
      if ((await res.json()).error) throw new Error('Scan failed');
    } catch (err) { setIsScanning(false); showToast?.(err.message, 'error'); }
  };

  const handleStopScan = async () => {
    setIsStopModalOpen(false); setIsScanning(false); setTelemetry(null);
    try { await fetch('/api/duplicates/stop', { method: 'POST' }); } catch {}
    showToast?.('Scan stopped by user', 'info');
  };

  const handleClearResults = async () => {
    try {
      const res = await fetch('/api/duplicates/clear', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to clear');
      setGroups([]);
      clearDupSelections();
      setTelemetry(null);
      showToast?.('Scan results and session cleared', 'info');
    } catch (err) {
      console.error('[DuplicateFinder] Clear results error:', err.message);
      showToast?.(err.message || 'Error clearing results', 'error');
    }
  };

  const handleToggleFile = (groupId, filePath) => {
    setGroups((prev) => {
      const next = prev.map((g) => (g.id !== groupId ? g : {
        ...g, files: g.files.map((f) => (f.filePath === filePath ? { ...f, markedForDelete: !f.markedForDelete } : f))
      }));
      saveDupSelections(next);
      return next;
    });
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleGroupAutoSelect = (groupId, rule) => {
    setGroups((prev) => {
      const next = applyGroupAutoSelect(prev, groupId, rule, rootPath);
      saveDupSelections(next);
      return next;
    });
    showToast?.(`Group rule updated: ${rule.replace(/_/g, ' ')}`, 'info');
  };

  const handleGlobalAutoSelect = (rule, targetGroupIds = null) => {
    let markedCount = 0;
    let savedBytes = 0;

    setGroups((prev) => {
      const next = applyGlobalAutoSelect(prev, rule, targetGroupIds, rootPath);
      saveDupSelections(next);
      for (const g of next) {
        for (const file of g.files || []) {
          if (file.markedForDelete) {
            markedCount++;
            savedBytes += (file.size || 0);
          }
        }
      }
      return next;
    });

    if (rule === 'deselect_all') {
      showToast?.('All files deselected. No files marked for deletion.', 'info');
    } else if (rule === 'keep_best_quality') {
      showToast?.(`Smart Keep Best Applied: ${markedCount} duplicates marked for deletion (${formatBytes(savedBytes)} reclaimable). Best quality copies kept safe!`, 'success');
    } else if (rule === 'keep_oldest') {
      showToast?.(`Keep Oldest Applied: ${markedCount} newer duplicates marked (${formatBytes(savedBytes)})`, 'info');
    } else if (rule === 'keep_largest') {
      showToast?.(`Keep Largest Applied: ${markedCount} smaller copies marked (${formatBytes(savedBytes)})`, 'info');
    }
  };

  const handleExecuteAction = async (actionType, customFileList = null) => {
    const fileList = customFileList || groups.flatMap((g) => g.files.filter((f) => f.markedForDelete));
    try {
      const res = await fetch('/api/duplicates/action', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType, fileList, rootDir: rootPath })
      });
      if ((await res.json()).success) {
        showToast?.(`Processed ${fileList.length} files (${actionType})`, 'success');
        setIsActionModalOpen(false);
        const deleted = new Set(fileList.map((f) => f.filePath));
        setGroups((prev) => {
          const next = prev.map((g) => ({ ...g, files: g.files.filter((f) => !deleted.has(f.filePath)) })).filter((g) => g.files.length > 1);
          saveDupSelections(next);
          return next;
        });
      }
    } catch (err) { showToast?.(err.message, 'error'); }
  };

  const handleRouteFile = async (filePath, targetDir) => {
    try {
      const res = await fetch('/api/duplicates/route-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, targetDir })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to route file');

      const targetFolderName = targetDir.split(/[/\\]/).pop();
      showToast?.(`Moved to ${targetFolderName}`, 'success');

      setGroups((prev) => {
        const next = prev.map((g) => ({
          ...g,
          files: g.files.map((f) =>
            f.filePath === filePath
              ? { ...f, filePath: data.newPath, markedForDelete: false, isOriginal: true }
              : f
          )
        }));
        saveDupSelections(next);
        return next;
      });
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  return {
    rootPath, setRootPath, isScanning, similarity, setSimilarity: handleSetSimilarity,
    matchModes, setMatchModes: handleSetMatchModes, mediaFilter, setMediaFilter, telemetry,
    groups, setGroups, inspectModal, setInspectModal, isActionModalOpen, setIsActionModalOpen,
    isHistoryDrawerOpen, setIsHistoryDrawerOpen, isStopModalOpen, setIsStopModalOpen,
    handleStartScan, requestStopScan: () => setIsStopModalOpen(true), handleStopScan,
    handleClearResults,
    handleToggleFile, handleGroupAutoSelect, handleGlobalAutoSelect, handleExecuteAction,
    handleRouteFile
  };
}
