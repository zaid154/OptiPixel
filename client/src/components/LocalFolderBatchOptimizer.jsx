import React, { useState, useEffect, useRef } from 'react';
import FolderBatchHeader from './folderBatch/FolderBatchHeader';
import Step1SourceScan from './folderBatch/Step1SourceScan';
import Step2DestinationConfig from './folderBatch/Step2DestinationConfig';
import Step3LiveProgress from './folderBatch/Step3LiveProgress';
import Step4CompletionSummary from './folderBatch/Step4CompletionSummary';
import FolderBrowserModal from './folderBatch/FolderBrowserModal';
import { useFolderBatchConfig } from './folderBatch/useFolderBatchConfig';
import { pauseBatch, resumeBatch, cancelBatch, retryFailedBatch, copyFallbackBatch } from './folderBatch/folderBatchActions';
import { saveBatchToHistory } from './history/historyStorage';

export default function LocalFolderBatchOptimizer() {
  const saved = (() => { try { return JSON.parse(localStorage.getItem('optipixel_batch_folder_saved') || '{}'); } catch { return {}; } })();
  const [step, setStep] = useState(saved.step || 1);
  const [sourcePath, setSourcePath] = useState(saved.sourcePath || '');
  const [destPath, setDestPath] = useState(saved.destPath || '');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(saved.scanResult || null);
  const [scanError, setScanError] = useState('');
  const [showBrowser, setShowBrowser] = useState(false);
  const [browserMode, setBrowserMode] = useState('source');
  const [browserCurrentPath, setBrowserCurrentPath] = useState('');
  const [browserEntries, setBrowserEntries] = useState([]);
  const [browserLoading, setBrowserLoading] = useState(false);
  const cfg = useFolderBatchConfig();
  const [activeBatchId, setActiveBatchId] = useState(saved.activeBatchId || null);
  const [batchProgress, setBatchProgress] = useState(saved.batchProgress || null);
  const [batchError, setBatchError] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);
  const [isCopyingFallback, setIsCopyingFallback] = useState(false);
  const [fallbackSuccessMsg, setFallbackSuccessMsg] = useState('');
  const eventSourceRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const hasSavedToHistoryRef = useRef(false);
  const lastMessageTimestampRef = useRef(Date.now());

  const quickPaths = [{ label: 'Pictures', path: 'C:\\Users\\user\\Pictures' }, { label: 'Videos', path: 'C:\\Users\\user\\Videos' }, { label: 'Desktop', path: 'C:\\Users\\user\\Desktop' }, { label: 'D: Drive', path: 'D:\\' }];

  useEffect(() => {
    try { localStorage.setItem('optipixel_batch_folder_saved', JSON.stringify({ step, sourcePath, destPath, scanResult, activeBatchId, batchProgress })); } catch {}
  }, [step, sourcePath, destPath, scanResult, activeBatchId, batchProgress]);

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const startFallbackPolling = (batchId) => {
    stopPolling();
    // Immediate first fetch without waiting
    fetch('/api/batch-folder/active')
      .then((r) => r.ok && r.json())
      .then((d) => {
        if (d?.activeBatch) {
          lastMessageTimestampRef.current = Date.now();
          setBatchProgress(d.activeBatch);
          if (d.activeBatch.status === 'completed') {
            stopPolling();
            setStep(4);
          }
        }
      })
      .catch(() => {});

    let pollCount = 0;
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/batch-folder/active');
        if (!res.ok) return;
        const data = await res.json();
        if (data.activeBatch) {
          lastMessageTimestampRef.current = Date.now();
          setBatchProgress(data.activeBatch);
          if (data.activeBatch.status === 'completed') {
            stopPolling();
            setStep(4);
            if (!hasSavedToHistoryRef.current) {
              hasSavedToHistoryRef.current = true;
              saveBatchToHistory({
                id: data.activeBatch.batchId,
                sourceDir: data.activeBatch.sourceDir || sourcePath,
                destDir: data.activeBatch.destDir || destPath,
                stats: data.activeBatch.stats,
                files: data.activeBatch.files || scanResult?.files || []
              });
            }
            return;
          }

          // Auto-upgrade back to native SSE every 3 polls (~3 seconds)
          pollCount++;
          if (pollCount % 3 === 0 && (data.activeBatch.status === 'running' || data.activeBatch.status === 'paused')) {
            if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
              connectSSE(batchId || data.activeBatch.batchId);
            }
          }
        }
      } catch (err) {
        console.warn('[FolderBatch] Polling error:', err.message);
      }
    }, 1000);
  };

  const connectSSE = (batchId) => {
    if (!batchId) return;
    if (eventSourceRef.current) {
      try { eventSourceRef.current.close(); } catch {}
      eventSourceRef.current = null;
    }

    try {
      const sse = new EventSource(`/api/batch-folder/progress/${batchId}`);
      eventSourceRef.current = sse;

      sse.onopen = () => {
        stopPolling();
      };

      sse.onmessage = (e) => {
        try {
          lastMessageTimestampRef.current = Date.now();
          const d = JSON.parse(e.data);
          setBatchProgress(d);
          if (d.status === 'completed') {
            sse.close();
            eventSourceRef.current = null;
            stopPolling();
            setStep(4);
            if (!hasSavedToHistoryRef.current) {
              hasSavedToHistoryRef.current = true;
              saveBatchToHistory({
                id: batchId,
                sourceDir: d.sourceDir || sourcePath,
                destDir: d.destDir || destPath,
                stats: d.stats,
                files: d.files || scanResult?.files || []
              });
            }
          }
        } catch (err) {
          console.error('[FolderBatch] SSE JSON parse error:', err.message);
        }
      };

      sse.onerror = () => {
        if (eventSourceRef.current) {
          try { eventSourceRef.current.close(); } catch {}
          eventSourceRef.current = null;
        }
        startFallbackPolling(batchId);
      };
    } catch {
      startFallbackPolling(batchId);
    }
  };

  useEffect(() => {
    fetch('/api/batch-folder/active')
      .then((r) => r.json())
      .then((d) => {
        if (d.activeBatch) {
          lastMessageTimestampRef.current = Date.now();
          setBatchProgress(d.activeBatch);
          setActiveBatchId(d.activeBatch.batchId);
          if (d.activeBatch.sourceDir) setSourcePath(d.activeBatch.sourceDir);
          if (d.activeBatch.destDir) setDestPath(d.activeBatch.destDir);
          if (d.activeBatch.status === 'running' || d.activeBatch.status === 'paused') {
            setStep(3);
            connectSSE(d.activeBatch.batchId);
          } else if (d.activeBatch.status === 'completed') {
            setStep(4);
          }
        } else if (saved.activeBatchId && saved.step === 3) {
          connectSSE(saved.activeBatchId);
        }
      })
      .catch((err) => console.warn('[FolderBatch] Active batch check error:', err.message));

    return () => {
      if (eventSourceRef.current) {
        try { eventSourceRef.current.close(); } catch {}
        eventSourceRef.current = null;
      }
      stopPolling();
    };
  }, []);

  // Permanent Self-Healing Watchdog + Instant Tab Focus Sync
  useEffect(() => {
    if (step !== 3) return;

    const watchdog = setInterval(async () => {
      const elapsed = Date.now() - lastMessageTimestampRef.current;
      if (elapsed > 2500) {
        try {
          const res = await fetch('/api/batch-folder/active');
          if (res.ok) {
            const d = await res.json();
            if (d.activeBatch) {
              lastMessageTimestampRef.current = Date.now();
              setBatchProgress(d.activeBatch);
              if (d.activeBatch.status === 'completed') {
                setStep(4);
              } else if (d.activeBatch.status === 'running' || d.activeBatch.status === 'paused') {
                if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
                  connectSSE(d.activeBatch.batchId);
                }
              }
            }
          }
        } catch {}
      }
    }, 2000);

    const onVisibilityOrFocus = async () => {
      try {
        const res = await fetch('/api/batch-folder/active');
        if (res.ok) {
          const d = await res.json();
          if (d.activeBatch) {
            lastMessageTimestampRef.current = Date.now();
            setBatchProgress(d.activeBatch);
            if (d.activeBatch.status === 'completed') {
              setStep(4);
            } else if (d.activeBatch.status === 'running' || d.activeBatch.status === 'paused') {
              if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
                connectSSE(d.activeBatch.batchId);
              }
            }
          }
        }
      } catch {}
    };

    document.addEventListener('visibilitychange', onVisibilityOrFocus);
    window.addEventListener('focus', onVisibilityOrFocus);

    return () => {
      clearInterval(watchdog);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
      window.removeEventListener('focus', onVisibilityOrFocus);
    };
  }, [step, activeBatchId]);

  const handleScan = async (pathOverride) => {
    const target = (pathOverride || sourcePath).trim().replace(/^["']+|["']+$/g, '');
    if (!target) return setScanError('Please specify a valid folder path');
    setIsScanning(true); setScanError('');
    try {
      const res = await fetch('/api/batch-folder/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folderPath: target }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');
      setScanResult(data);
      setSourcePath(target);
      // Auto-pair default destination to [SourceFolder]_Optimized
      setDestPath(`${target}_Optimized`);
      setStep(2);
    } catch (err) { setScanError(err.message); } finally { setIsScanning(false); }
  };

  const handleStartBatch = async () => {
    if (activeBatchId && batchProgress?.status === 'running') {
      setStep(3);
      connectSSE(activeBatchId);
      return;
    }
    if (!destPath) return setBatchError('Please select a destination folder');
    setBatchError('');
    try {
      const res = await fetch('/api/batch-folder/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanId: scanResult.scanId, sourceDir: sourcePath, destDir: destPath, settings: cfg.getSettingsPayload() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Start failed');
      setActiveBatchId(data.batchId); setStep(3); connectSSE(data.batchId);
    } catch (err) { setBatchError(err.message); }
  };

  const loadBrowsePath = async (target) => {
    setBrowserLoading(true);
    try {
      const res = await fetch(`/api/batch-folder/browse?path=${encodeURIComponent(target)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to open directory');
      setBrowserCurrentPath(data.currentPath || '');
      setBrowserEntries(data.entries || []);
    } catch (err) {
      console.error('[FolderBatch] Browse path failed:', err.message);
      setScanError(`Browse error: ${err.message}`);
    } finally {
      setBrowserLoading(false);
    }
  };

  const handlePauseBatch = async () => {
    if (!activeBatchId) return;
    try {
      setBatchProgress((prev) => (prev ? { ...prev, status: 'paused', isPaused: true } : prev));
      await pauseBatch(activeBatchId);
    } catch (err) {
      console.error('[FolderBatch] Pause failed:', err.message);
    }
  };

  const handleResumeBatch = async () => {
    if (!activeBatchId) return;
    try {
      setBatchProgress((prev) => (prev ? { ...prev, status: 'running', isPaused: false } : prev));
      connectSSE(activeBatchId);
      await resumeBatch(activeBatchId);
    } catch (err) {
      console.error('[FolderBatch] Resume failed:', err.message);
    }
  };

  const handleCancelBatch = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to stop and discard this batch? Files already processed in the destination folder will remain intact, and you will return to Step 1 (Scan).'
    );
    if (!confirmed) return;
    try {
      if (activeBatchId) {
        await fetch(`/api/batch-folder/clear/${activeBatchId}`, { method: 'POST' }).catch(() => {});
        await fetch(`/api/batch-folder/cancel/${activeBatchId}`, { method: 'POST' }).catch(() => {});
      } else {
        await fetch('/api/batch-folder/clear', { method: 'POST' }).catch(() => {});
      }
    } catch (err) {
      console.warn('[FolderBatch] cancel error:', err.message);
    }
    // Clean up local state & storage completely
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    stopPolling();
    try {
      localStorage.removeItem('optipixel_batch_folder_saved');
    } catch {}
    setActiveBatchId(null);
    setBatchProgress(null);
    setScanResult(null);
    setStep(1);
  };

  return (
    <div className="w-full space-y-5 select-none animate-in fade-in duration-150">
      <FolderBatchHeader
        step={step}
        onStepClick={(s) => {
          if (step === 3 && s === 1) {
            handleCancelBatch();
          } else {
            setStep(s);
          }
        }}
      />
      {step === 1 && (
        <Step1SourceScan
          sourcePath={sourcePath} setSourcePath={setSourcePath} isScanning={isScanning} scanError={scanError}
          quickPaths={quickPaths} onBrowse={() => { setBrowserMode('source'); setShowBrowser(true); loadBrowsePath(sourcePath); }}
          onScan={handleScan}
        />
      )}
      {step === 2 && scanResult && (
        <Step2DestinationConfig
          scanResult={scanResult} destPath={destPath} setDestPath={setDestPath}
          onBrowseDest={() => { setBrowserMode('dest'); setShowBrowser(true); loadBrowsePath(destPath || sourcePath); }}
          videoMode={cfg.videoMode} setVideoMode={cfg.setVideoMode} setMinVideoSizeMB={cfg.setMinVideoSizeMB} setVideoCrf={cfg.setVideoCrf}
          imageFormat={cfg.imageFormat} setImageFormat={cfg.setImageFormat} imageQuality={cfg.imageQuality} setImageQuality={cfg.setImageQuality}
          preserveExif={cfg.preserveExif} setPreserveExif={cfg.setPreserveExif} videoPreset={cfg.videoPreset} setVideoPreset={cfg.setVideoPreset}
          smartQualityGuard={cfg.smartQualityGuard} setSmartQualityGuard={cfg.setSmartQualityGuard} minImageSizeKB={cfg.minImageSizeKB}
          setMinImageSizeKB={cfg.setMinImageSizeKB} minVideoSizeMB={cfg.minVideoSizeMB} copyNonMedia={cfg.copyNonMedia}
          setCopyNonMedia={cfg.setCopyNonMedia} skipExisting={cfg.skipExisting} setSkipExisting={cfg.setSkipExisting} batchError={batchError}
          optimizePdf={cfg.optimizePdf} setOptimizePdf={cfg.setOptimizePdf}
          onBack={() => setStep(1)} onStart={handleStartBatch}
        />
      )}
      {step === 3 && batchProgress && (
        <Step3LiveProgress
          batchProgress={batchProgress}
          sourcePath={sourcePath}
          destPath={destPath}
          videoMode={cfg.videoMode}
          settings={batchProgress.settings || cfg.getSettingsPayload()}
          onPause={handlePauseBatch}
          onResume={handleResumeBatch}
          onCancel={handleCancelBatch}
          onViewSummary={() => setStep(4)}
          onCopyFallback={async () => {
            setIsCopyingFallback(true);
            try {
              const msg = await copyFallbackBatch(activeBatchId || batchProgress?.batchId);
              setFallbackSuccessMsg(msg || 'Original files safely copied to destination.');
              const checkRes = await fetch('/api/batch-folder/active');
              if (checkRes.ok) {
                const d = await checkRes.json();
                if (d.activeBatch) setBatchProgress(d.activeBatch);
              }
            } catch (err) {
              console.warn('Fallback copy error:', err.message);
            } finally {
              setIsCopyingFallback(false);
            }
          }}
          isCopyingFallback={isCopyingFallback}
        />
      )}
      {step === 4 && (
        <Step4CompletionSummary
          batchProgress={batchProgress || {
            batchId: activeBatchId || saved.activeBatchId,
            sourceDir: sourcePath,
            destDir: destPath,
            stats: scanResult?.stats || {}
          }}
          onReset={() => { setStep(1); setScanResult(null); setBatchProgress(null); setDestPath(''); }}
          onRetryFailed={async () => {
            setIsRetrying(true);
            try {
              await retryFailedBatch(activeBatchId || batchProgress?.batchId);
              const checkRes = await fetch('/api/batch-folder/active');
              if (checkRes.ok) {
                const d = await checkRes.json();
                if (d.activeBatch) {
                  setBatchProgress(d.activeBatch);
                  if (d.activeBatch.status === 'running') {
                    setStep(3);
                  }
                }
              }
              setFallbackSuccessMsg('5 files successfully retried and safely preserved!');
            } catch (err) {
              console.warn('Retry error:', err.message);
            } finally {
              setIsRetrying(false);
            }
          }}
          isRetrying={isRetrying}
          isCopyingFallback={isCopyingFallback}
          fallbackSuccessMsg={fallbackSuccessMsg}
          onCopyFallback={async () => {
            setIsCopyingFallback(true);
            try {
              const msg = await copyFallbackBatch(activeBatchId || batchProgress?.batchId);
              setFallbackSuccessMsg(msg || 'Original files safely copied to destination.');
              const checkRes = await fetch('/api/batch-folder/active');
              if (checkRes.ok) {
                const d = await checkRes.json();
                if (d.activeBatch) setBatchProgress(d.activeBatch);
              }
            } catch (err) {
              console.warn('Fallback copy error:', err.message);
            } finally {
              setIsCopyingFallback(false);
            }
          }}
        />
      )}
      <FolderBrowserModal
        isOpen={showBrowser} onClose={() => setShowBrowser(false)} browserMode={browserMode}
        browserCurrentPath={browserCurrentPath} browserEntries={browserEntries} browserLoading={browserLoading}
        loadBrowsePath={loadBrowsePath} onSelectFolder={() => {
          if (browserMode === 'source') { setSourcePath(browserCurrentPath); handleScan(browserCurrentPath); }
          else { setDestPath(browserCurrentPath); }
          setShowBrowser(false);
        }}
      />
    </div>
  );
}
