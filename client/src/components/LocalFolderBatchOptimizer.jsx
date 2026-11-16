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

  const quickPaths = [{ label: 'Pictures', path: 'C:\\Users\\user\\Pictures' }, { label: 'Videos', path: 'C:\\Users\\user\\Videos' }, { label: 'Desktop', path: 'C:\\Users\\user\\Desktop' }, { label: 'D: Drive', path: 'D:\\' }];

  useEffect(() => {
    try { localStorage.setItem('optipixel_batch_folder_saved', JSON.stringify({ step, sourcePath, destPath, scanResult, activeBatchId, batchProgress })); } catch {}
  }, [step, sourcePath, destPath, scanResult, activeBatchId, batchProgress]);

  const connectSSE = (batchId) => {
    if (eventSourceRef.current) eventSourceRef.current.close();
    const sse = new EventSource(`/api/batch-folder/progress/${batchId}`);
    eventSourceRef.current = sse;
    sse.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        setBatchProgress(d);
        if (d.status === 'completed') {
          setStep(4);
          saveBatchToHistory({
            id: batchId,
            sourceDir: d.sourceDir || sourcePath,
            destDir: d.destDir || destPath,
            stats: d.stats,
            files: d.files || scanResult?.files || []
          });
        }
      } catch {}
    };
  };

  useEffect(() => {
    fetch('/api/batch-folder/active').then((r) => r.json()).then((d) => {
      if (d.activeBatch) {
        setBatchProgress(d.activeBatch);
        setActiveBatchId(d.activeBatch.batchId);
        if (d.activeBatch.status === 'running' || d.activeBatch.status === 'paused') {
          setStep(3);
          connectSSE(d.activeBatch.batchId);
        } else if (d.activeBatch.status === 'completed') {
          setStep(4);
        }
      } else if (saved.activeBatchId && saved.step === 3) {
        connectSSE(saved.activeBatchId);
      }
    }).catch(() => {});
    return () => { if (eventSourceRef.current) eventSourceRef.current.close(); };
  }, []);

  useEffect(() => {
    if (step !== 3) return;
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/batch-folder/active');
        const data = await res.json();
        if (data.activeBatch) {
          setBatchProgress(data.activeBatch);
          if (data.activeBatch.status === 'completed') {
            setStep(4);
            saveBatchToHistory({
              id: data.activeBatch.batchId,
              sourceDir: data.activeBatch.sourceDir || sourcePath,
              destDir: data.activeBatch.destDir || destPath,
              stats: data.activeBatch.stats,
              files: data.activeBatch.files || scanResult?.files || []
            });
          }
        }
      } catch {}
    }, 1000);
    return () => clearInterval(pollInterval);
  }, [step, sourcePath, destPath, scanResult]);

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
      setBrowserCurrentPath(data.currentPath || ''); setBrowserEntries(data.entries || []);
    } catch {} finally { setBrowserLoading(false); }
  };

  return (
    <div className="w-full space-y-5 select-none animate-in fade-in duration-150">
      <FolderBatchHeader step={step} onStepClick={(s) => setStep(s)} />
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
          onPause={() => pauseBatch(activeBatchId)}
          onResume={() => resumeBatch(activeBatchId)}
          onCancel={() => cancelBatch(activeBatchId)}
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
          onRetryFailed={async () => { setIsRetrying(true); if (await retryFailedBatch(activeBatchId)) setStep(3); setIsRetrying(false); }}
          isRetrying={isRetrying} isCopyingFallback={isCopyingFallback} fallbackSuccessMsg={fallbackSuccessMsg}
          onCopyFallback={async () => { setIsCopyingFallback(true); setFallbackSuccessMsg(await copyFallbackBatch(activeBatchId)); setIsCopyingFallback(false); }}
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
