import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { applyGroupAutoSelect, applyGlobalAutoSelect } from './duplicateSelectionUtils';

export function useDuplicateFinder(showToast) {
  const [rootPath, setRootPath] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [similarity, setSimilarity] = useState(95);
  const [matchModes, setMatchModes] = useState(['exact', 'visual']);
  const [mediaFilter, setMediaFilter] = useState('all');
  const [telemetry, setTelemetry] = useState(null);
  const [groups, setGroups] = useState([]);
  const [inspectModal, setInspectModal] = useState({ isOpen: false, group: null, file: null });
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isStopModalOpen, setIsStopModalOpen] = useState(false);
  const sseRef = useRef(null);

  useEffect(() => {
    fetch('/api/duplicates/groups').then((r) => r.json()).then((d) => {
      if (d.isScanning) { setIsScanning(true); if (d.telemetry) setTelemetry(d.telemetry); }
      if (d.groups?.length) setGroups(d.groups);
    }).catch(() => {});

    const socket = io({ path: '/socket.io', transports: ['websocket', 'polling'] });
    socket.on('scan:progress', (d) => { setTelemetry(d); if (d.isScanning !== undefined) setIsScanning(d.isScanning); });
    socket.on('scan:complete', (d) => {
      setIsScanning(false); setGroups(d.groups || []);
      showToast?.(`Scan complete! Found ${d.groupsCount} duplicate groups.`, 'success');
    });
    socket.on('scan:error', (err) => { setIsScanning(false); showToast?.(err.message || 'Scan error', 'error'); });
    return () => socket.disconnect();
  }, [showToast]);

  useEffect(() => {
    if (!isScanning) { if (sseRef.current) { sseRef.current.close(); sseRef.current = null; } return; }
    const sse = new EventSource('/api/duplicates/progress-stream');
    sseRef.current = sse;
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
    sse.onerror = () => sse.close();
    const pollTimer = setInterval(async () => {
      try {
        const res = await fetch('/api/duplicates/progress');
        const data = await res.json();
        if (data?.stage === 'complete') {
          setIsScanning(false);
          const gRes = await fetch('/api/duplicates/groups');
          const gData = await gRes.json();
          setGroups(gData.groups || []);
        }
      } catch {}
    }, 1200);
    return () => { clearInterval(pollTimer); sse.close(); };
  }, [isScanning]);

  // Fast In-Memory Recluster on threshold or mode change
  useEffect(() => {
    if (isScanning || groups.length === 0) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/duplicates/recluster', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ similarityThreshold: similarity, matchModes })
        });
        const data = await res.json();
        if (data.groups) setGroups(data.groups);
      } catch {}
    }, 350);
    return () => clearTimeout(timer);
  }, [similarity, matchModes, isScanning]);

  const handleStartScan = async () => {
    const cleanPath = rootPath.replace(/^["']+|["']+$/g, '').trim();
    if (!cleanPath) return showToast?.('Please specify a folder path', 'warning');
    setRootPath(cleanPath); setIsScanning(true);
    setTelemetry({ stage: 'discovering', processed: 0, total: 0, currentFile: `Scanning ${cleanPath}...`, percent: 0 });
    try {
      const res = await fetch('/api/duplicates/scan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootPath: cleanPath, similarityThreshold: similarity, matchModes })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
    } catch (err) { setIsScanning(false); showToast?.(err.message, 'error'); }
  };

  const handleStopScan = async () => {
    setIsStopModalOpen(false); setIsScanning(false); setTelemetry(null);
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
    try { await fetch('/api/duplicates/stop', { method: 'POST' }); } catch {}
    showToast?.('Scan stopped by user', 'info');
  };

  const handleToggleFile = (groupId, filePath) => {
    setGroups((prev) => prev.map((g) => (g.id !== groupId ? g : {
      ...g, files: g.files.map((f) => (f.filePath === filePath ? { ...f, markedForDelete: !f.markedForDelete } : f))
    })));
  };

  const handleGroupAutoSelect = (groupId, rule) => setGroups((prev) => applyGroupAutoSelect(prev, groupId, rule));
  const handleGlobalAutoSelect = (rule, targetGroupIds = null) =>
    setGroups((prev) => applyGlobalAutoSelect(prev, rule, targetGroupIds));

  const handleExecuteAction = async (actionType, customFileList = null) => {
    const fileList = customFileList || groups.flatMap((g) => g.files.filter((f) => f.markedForDelete));
    try {
      const res = await fetch('/api/duplicates/action', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType, fileList, rootDir: rootPath })
      });
      const data = await res.json();
      if (data.success) {
        showToast?.(`Processed ${fileList.length} files (${actionType})`, 'success');
        setIsActionModalOpen(false);
        const deleted = new Set(fileList.map((f) => f.filePath));
        setGroups((prev) => prev.map((g) => ({ ...g, files: g.files.filter((f) => !deleted.has(f.filePath)) })).filter((g) => g.files.length > 1));
      }
    } catch (err) { showToast?.(err.message, 'error'); }
  };

  return {
    rootPath, setRootPath, isScanning, similarity, setSimilarity,
    matchModes, setMatchModes, mediaFilter, setMediaFilter, telemetry,
    groups, inspectModal, setInspectModal, isActionModalOpen, setIsActionModalOpen,
    isHistoryDrawerOpen, setIsHistoryDrawerOpen, isStopModalOpen, setIsStopModalOpen,
    handleStartScan, requestStopScan: () => setIsStopModalOpen(true), handleStopScan,
    handleToggleFile, handleGroupAutoSelect, handleGlobalAutoSelect, handleExecuteAction
  };
}
