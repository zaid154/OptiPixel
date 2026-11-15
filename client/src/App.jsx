import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import DropZone from './components/DropZone';
import ImageHeroLayout from './components/ImageHeroLayout';
import ImageComparisonSlider from './components/ImageComparisonSlider';
import ControlPanel from './components/ControlPanel';
import VideoDropZone from './components/VideoDropZone';
import VideoHeroLayout from './components/VideoHeroLayout';
import VideoPlayerComparison from './components/VideoPlayerComparison';
import VideoControlPanel from './components/VideoControlPanel';
import StatsBanner from './components/StatsBanner';
import Toast from './components/Toast';
import HistoryDrawer from './components/history/HistoryDrawer';
import LocalFolderBatchOptimizer from './components/LocalFolderBatchOptimizer';
import DuplicateFinder from './components/duplicateFinder/DuplicateFinder';
import {
  saveToHistory,
  getAllHistory,
  deleteHistoryItem,
  clearAllHistory,
  getActiveSessionId,
  setActiveSessionId
} from './utils/historyDB';
import { Download, CheckCircle2, Trash2 } from 'lucide-react';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  // Persistent History & Work Recovery
  const [historyItems, setHistoryItems] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Global Toast State
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const showToast = (message, type = 'info') => setToast({ message, type });

  // ---------------- IMAGE MODE STATE ----------------
  const [selectedFile, setSelectedFile] = useState(null);
  const [originalUrl, setOriginalUrl] = useState('');
  const [compressedUrl, setCompressedUrl] = useState('');
  const [compressedBlob, setCompressedBlob] = useState(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [percentageSaved, setPercentageSaved] = useState(0);

  // Image Settings
  const [sessionImageId, setSessionImageId] = useState(null);
  const [mode, setMode] = useState('quality'); // 'quality' | 'target'
  const [format, setFormat] = useState('webp');
  const [quality, setQuality] = useState(88); // 88% = Sweetspot for Zero Perceptible Loss
  const [targetKB, setTargetKB] = useState(500);
  const [isProcessing, setIsProcessing] = useState(false);

  // Smart Image Enhancer State
  const [enhance, setEnhance] = useState(false);
  const [sharpen, setSharpen] = useState('medium'); // 'none' | 'light' | 'medium' | 'ultra'
  const [hdrContrast, setHdrContrast] = useState(true);
  const [vibrance, setVibrance] = useState(true);
  const [autoLevels, setAutoLevels] = useState(false);
  const [upscale2x, setUpscale2x] = useState(false);

  // Batch Image State
  const [batchFiles, setBatchFiles] = useState([]);
  const [batchFormat, setBatchFormat] = useState('webp');
  const [batchQuality, setBatchQuality] = useState(88);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchDone, setBatchDone] = useState(false);

  // AbortController ref to cancel obsolete in-flight image requests
  const abortControllerRef = useRef(null);
  const debounceTimer = useRef(null);

  // ---------------- VIDEO MODE STATE ----------------
  const [videoFile, setVideoFile] = useState(null);
  const [videoOriginalUrl, setVideoOriginalUrl] = useState('');
  const [videoCompressedUrl, setVideoCompressedUrl] = useState('');
  const [videoJobId, setVideoJobId] = useState(null);
  const [videoMetadata, setVideoMetadata] = useState(null);

  // Video Settings
  const [videoMode, setVideoMode] = useState('preset'); // 'preset' | 'target'
  const [videoPreset, setVideoPreset] = useState('balanced'); // Default to Smart Balance (recommended)
  const [videoTargetMB, setVideoTargetMB] = useState(25);
  const [videoCrf, setVideoCrf] = useState(20);
  const [videoCodec, setVideoCodec] = useState('libx264');
  const [videoResolution, setVideoResolution] = useState('original');
  const [videoMute, setVideoMute] = useState(false);

  // Video Progress & Results
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoProcessing, setVideoProcessing] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoFps, setVideoFps] = useState(0);
  const [videoSpeed, setVideoSpeed] = useState('1x');
  const [videoTimeRemaining, setVideoTimeRemaining] = useState(0);
  const [videoResult, setVideoResult] = useState(null);
  const [videoTheaterMode, setVideoTheaterMode] = useState(false);

  // Video Auto-Trigger & Process Tracking Refs
  const lastProcessedVideoSettings = useRef('');
  const videoDebounceTimer = useRef(null);
  const videoEventSourceRef = useRef(null);

  // =================== DEDICATED PAGE RECOVERY ON REFRESH ===================
  useEffect(() => {
    // 1. Fetch History Count for Navbar
    getAllHistory().then((items) => {
      setHistoryItems(items);

      // ONLY restore image if currently on the Image page (/image or /)
      if (location.pathname === '/' || location.pathname.startsWith('/image')) {
        const activeId = getActiveSessionId();
        if (activeId && items.length > 0) {
          const item = items.find((i) => i.id === activeId && i.type === 'image');
          if (item && item.originalBlob && item.compressedBlob) {
            restoreImageFromHistory(item, false);
            showToast(`Restored image session (${item.name})`, 'info');
          }
        }
      }
    });

    // 2. Video Page Session Recovery: If refreshing on /video, validate & restore the video job!
    if (location.pathname.startsWith('/video')) {
      const savedVideoId = sessionStorage.getItem('optipixel_active_video_id');
      const savedMeta = sessionStorage.getItem('optipixel_active_video_meta');
      const savedResult = sessionStorage.getItem('optipixel_active_video_result');

      if (savedVideoId && savedMeta) {
        // Handshake with backend to guarantee the video job and files are ready!
        fetch(`/api/video/status/${savedVideoId}`)
          .then((res) => {
            if (!res.ok) throw new Error('Session expired');
            return res.json();
          })
          .then((statusData) => {
            try {
              const parsedMeta = JSON.parse(savedMeta);
              setVideoJobId(savedVideoId);
              setVideoMetadata(parsedMeta);
              setVideoOriginalUrl(`/api/video/stream/${savedVideoId}?type=original`);

              if (statusData.status === 'completed' || savedResult) {
                const parsedRes = savedResult ? JSON.parse(savedResult) : statusData.result;
                setVideoResult(parsedRes);
                setVideoCompressedUrl(`/api/video/stream/${savedVideoId}?type=compressed`);
                lastProcessedVideoSettings.current = `${savedVideoId}_preset_balanced_25_20_libx264_original_false`;
              } else if (statusData.status === 'processing') {
                setVideoProcessing(true);
                setVideoProgress(statusData.progress || 1);
              }
              showToast(`Restored video session (${parsedMeta.originalName || 'video'})`, 'info');
            } catch (parseErr) {
              console.warn('Parse error restoring video session:', parseErr);
            }
          })
          .catch(() => {
            // Server reported job expired / gone: clean reset to DropZone
            sessionStorage.removeItem('optipixel_active_video_id');
            sessionStorage.removeItem('optipixel_active_video_meta');
            sessionStorage.removeItem('optipixel_active_video_result');
            setVideoJobId(null);
            setVideoMetadata(null);
            setVideoOriginalUrl('');
            setVideoCompressedUrl('');
            setVideoResult(null);
            showToast('Previous video session expired. Please select a video to start.', 'info');
          });
      }
    }

    // Native Clipboard Paste Handler (Ctrl+V)
    const handlePaste = (e) => {
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
          navigate('/image');
          handleSingleImage([file]);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Dedicated Tab Navigation Recovery (Preserve previous work when switching tabs)
  useEffect(() => {
    if ((location.pathname === '/' || location.pathname.startsWith('/image')) && !selectedFile && historyItems.length > 0) {
      const activeId = getActiveSessionId();
      if (activeId) {
        const item = historyItems.find((i) => i.id === activeId && i.type === 'image');
        if (item && item.originalBlob && item.compressedBlob) {
          restoreImageFromHistory(item, false);
        }
      }
    }
  }, [location.pathname, selectedFile, historyItems]);

  const restoreImageFromHistory = (item, notify = true) => {
    navigate('/image');
    setSelectedFile(item.originalBlob);
    setOriginalSize(item.originalSize);
    setCompressedSize(item.compressedSize);
    setPercentageSaved(item.percentageSaved);

    if (item.settings) {
      if (item.settings.format) setFormat(item.settings.format);
      if (item.settings.quality) setQuality(item.settings.quality);
      if (item.settings.mode) setMode(item.settings.mode);
      if (item.settings.targetKB) setTargetKB(item.settings.targetKB);
      if (item.settings.enhance !== undefined) setEnhance(item.settings.enhance);
      if (item.settings.sharpen) setSharpen(item.settings.sharpen);
      if (item.settings.hdrContrast !== undefined) setHdrContrast(item.settings.hdrContrast);
      if (item.settings.vibrance !== undefined) setVibrance(item.settings.vibrance);
      if (item.settings.upscale2x !== undefined) setUpscale2x(item.settings.upscale2x);
    }

    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (compressedUrl) URL.revokeObjectURL(compressedUrl);
    setOriginalUrl(URL.createObjectURL(item.originalBlob));
    setCompressedUrl(URL.createObjectURL(item.compressedBlob));
    setCompressedBlob(item.compressedBlob);
    setActiveSessionId(item.id);

    if (notify) showToast(`Restored ${item.name}`, 'info');
  };

  const handleDeleteHistory = async (id) => {
    await deleteHistoryItem(id);
    const updated = await getAllHistory();
    setHistoryItems(updated);
  };

  const handleClearHistory = async () => {
    await clearAllHistory();
    setHistoryItems([]);
    showToast('History cleared', 'info');
  };

  // =================== IMAGE HANDLERS ===================

  const handleSingleImage = (files) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (compressedUrl) URL.revokeObjectURL(compressedUrl);

    setSelectedFile(file);
    setOriginalSize(file.size);
    setOriginalUrl(URL.createObjectURL(file));
    setCompressedUrl('');
    setCompressedBlob(null);
    setCompressedSize(0);
    setPercentageSaved(0);
    setSessionImageId(null);
  };

  const handleCompressImage = async (isDownload = false) => {
    if (!selectedFile) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsProcessing(true);

    try {
      const formData = new FormData();

      if (sessionImageId) {
        formData.append('sessionImageId', sessionImageId);
      } else {
        formData.append('image', selectedFile);
      }

      let endpoint = '/api/compress/single';
      if (mode === 'target') {
        endpoint = '/api/compress/target-size';
        formData.append('targetKB', targetKB);
        formData.append('format', format);
      } else {
        formData.append('format', format);
        formData.append('quality', quality);
      }

      formData.append('enhance', enhance);
      formData.append('sharpen', sharpen);
      formData.append('hdrContrast', hdrContrast);
      formData.append('vibrance', vibrance);
      formData.append('autoLevels', autoLevels);
      formData.append('upscale2x', upscale2x);
      formData.append('isDownload', isDownload);

      let res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal
      });

      // Auto-recover if session cache expired on server
      if (res.status === 400 && sessionImageId && selectedFile) {
        setSessionImageId(null);
        formData.delete('sessionImageId');
        formData.append('image', selectedFile);
        res = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          signal: abortControllerRef.current.signal
        });
      }

      if (!res.ok) throw new Error('Compression failed');

      const savedPercent = parseFloat(res.headers.get('X-Saved-Percent') || '0');
      const compSize = parseInt(res.headers.get('X-Compressed-Size') || '0', 10);
      const newSessionId = res.headers.get('X-Session-Image-Id');
      if (newSessionId) {
        setSessionImageId(newSessionId);
      }

      const blob = await res.blob();

      setCompressedBlob(blob);
      setCompressedSize(compSize || blob.size);
      setPercentageSaved(savedPercent);

      if (compressedUrl) URL.revokeObjectURL(compressedUrl);
      setCompressedUrl(URL.createObjectURL(blob));

      const historyEntryId = `img_${selectedFile.name}_${selectedFile.size}`;
      saveToHistory({
        id: historyEntryId,
        name: selectedFile.name,
        type: 'image',
        originalSize: selectedFile.size,
        compressedSize: compSize || blob.size,
        percentageSaved: savedPercent,
        format,
        originalBlob: selectedFile,
        compressedBlob: blob,
        settings: { mode, format, quality, targetKB, enhance, sharpen, hdrContrast, vibrance, autoLevels, upscale2x }
      }).then(() => {
        getAllHistory().then((items) => setHistoryItems(items));
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error(err);
        showToast('Compression error. Please retry.', 'error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!selectedFile) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      handleCompressImage(false);
    }, 400);

    return () => clearTimeout(debounceTimer.current);
  }, [selectedFile, mode, format, quality, targetKB, enhance, sharpen, hdrContrast, vibrance, autoLevels, upscale2x]);

  const handleImageDownload = () => {
    if (!compressedBlob) return;
    const ext = format.toLowerCase().replace('jpeg', 'jpg');
    const originalBaseName = selectedFile.name.replace(/\.[^/.]+$/, '');
    const filename = `${originalBaseName}_optimized.${ext}`;

    const url = URL.createObjectURL(compressedBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    showToast('Download started', 'success');
  };

  const handleImageReset = () => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (compressedUrl) URL.revokeObjectURL(compressedUrl);
    setSelectedFile(null);
    setOriginalUrl('');
    setCompressedUrl('');
    setCompressedBlob(null);
    setOriginalSize(0);
    setCompressedSize(0);
    setPercentageSaved(0);
    setSessionImageId(null);
    try {
      sessionStorage.removeItem('optipixel_active_id');
    } catch (e) {}
  };

  // =================== BATCH HANDLERS ===================

  const handleBatchCompress = async () => {
    if (batchFiles.length === 0) return;
    setBatchProcessing(true);
    setBatchDone(false);

    try {
      const formData = new FormData();
      batchFiles.forEach((file) => formData.append('images', file));
      formData.append('format', batchFormat);
      formData.append('quality', batchQuality);

      const res = await fetch('/api/compress/batch', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Batch compression failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `optipixel_batch_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);

      setBatchDone(true);
      showToast('Batch download started!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Batch compression failed.', 'error');
    } finally {
      setBatchProcessing(false);
    }
  };

  // =================== VIDEO HANDLERS ===================

  const handleVideoSelected = async (file) => {
    if (!file) return;

    if (videoOriginalUrl) URL.revokeObjectURL(videoOriginalUrl);
    setVideoFile(file);
    setVideoOriginalUrl(URL.createObjectURL(file));
    setVideoCompressedUrl('');
    setVideoResult(null);
    setVideoProgress(0);
    setVideoUploading(true);

    try {
      const formData = new FormData();
      formData.append('video', file);

      const res = await fetch('/api/video/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Video upload failed');
      }

      const data = await res.json();
      setVideoJobId(data.jobId);
      setVideoMetadata(data);
      // Connect to server stream endpoint for web-compatible H.264 video rendering
      setVideoOriginalUrl(`/api/video/stream/${data.jobId}?type=original`);

      try {
        sessionStorage.setItem('optipixel_active_video_id', data.jobId);
        sessionStorage.setItem('optipixel_active_video_meta', JSON.stringify(data));
      } catch (e) {}

      // Track current settings to prevent double trigger by useEffect
      const initialKey = `${data.jobId}_${videoMode}_${videoPreset}_${videoTargetMB}_${videoCrf}_${videoCodec}_${videoResolution}_${videoMute}`;
      lastProcessedVideoSettings.current = initialKey;

      // Auto-start video optimization immediately with Smart Balance preset!
      startVideoCompression(data.jobId);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to inspect video.', 'error');
      setVideoFile(null);
    } finally {
      setVideoUploading(false);
    }
  };

  const startVideoCompression = async (overrideJobId = null) => {
    const activeId = overrideJobId || videoJobId;
    if (!activeId) return;

    // Close any previous SSE progress stream
    if (videoEventSourceRef.current) {
      videoEventSourceRef.current.close();
      videoEventSourceRef.current = null;
    }

    setVideoProcessing(true);
    setVideoProgress(1);
    setVideoResult(null);

    const currentSettingsKey = `${activeId}_${videoMode}_${videoPreset}_${videoTargetMB}_${videoCrf}_${videoCodec}_${videoResolution}_${videoMute}`;

    try {
      const payload = {
        mode: videoMode,
        preset: videoPreset,
        targetMB: videoTargetMB,
        crf: videoCrf,
        codec: videoCodec,
        resolution: videoResolution,
        mute: videoMute
      };

      const res = await fetch(`/api/video/compress/${activeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Could not initiate video compression');

      const eventSource = new EventSource(`/api/video/progress/${activeId}`);
      videoEventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setVideoProgress(data.progress || 0);
          setVideoFps(data.fps || 0);
          setVideoSpeed(data.speed || '1x');
          setVideoTimeRemaining(data.timeRemainingSec || 0);

          if (data.status === 'completed') {
            eventSource.close();
            videoEventSourceRef.current = null;
            setVideoProcessing(false);
            setVideoResult(data.result);
            setVideoCompressedUrl(`/api/video/stream/${activeId}?type=compressed&t=${Date.now()}`);
            setVideoOriginalUrl(`/api/video/stream/${activeId}?type=original`);
            lastProcessedVideoSettings.current = currentSettingsKey;
            showToast(`Optimization complete (-${data.result?.percentageSaved}%)`, 'success');

            try {
              sessionStorage.setItem('optipixel_active_video_result', JSON.stringify(data.result));
            } catch (e) {}

            saveToHistory({
              id: `vid_${videoFile?.name || 'video'}_${Date.now()}`,
              name: videoFile?.name || videoMetadata?.originalName || 'video.mp4',
              type: 'video',
              originalSize: videoFile?.size || videoMetadata?.sizeBytes || 0,
              compressedSize: data.result?.compressedSize || 0,
              percentageSaved: data.result?.percentageSaved || 0,
              format: videoCodec === 'libvpx-vp9' ? 'webm' : 'mp4',
              settings: { videoMode, videoPreset, videoTargetMB, videoCrf, videoCodec, videoResolution }
            }).then(() => {
              getAllHistory().then((items) => setHistoryItems(items));
            });
          } else if (data.status === 'failed') {
            eventSource.close();
            videoEventSourceRef.current = null;
            setVideoProcessing(false);
            showToast(data.error || 'Video encoding failed.', 'error');
          }
        } catch (e) {
          console.error('SSE parse error:', e);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        videoEventSourceRef.current = null;
        const pollInterval = setInterval(async () => {
          try {
            const check = await fetch(`/api/video/status/${activeId}`).then((r) => r.json());
            setVideoProgress(check.progress || 0);
            if (check.status === 'completed') {
              clearInterval(pollInterval);
              setVideoProcessing(false);
              setVideoResult(check.result);
              setVideoCompressedUrl(`/api/video/stream/${activeId}?type=compressed&t=${Date.now()}`);
              setVideoOriginalUrl(`/api/video/stream/${activeId}?type=original`);
              lastProcessedVideoSettings.current = currentSettingsKey;
              showToast(`Optimization complete (-${check.result?.percentageSaved}%)`, 'success');
            } else if (check.status === 'failed') {
              clearInterval(pollInterval);
              setVideoProcessing(false);
              showToast('Encoding failed on server.', 'error');
            }
          } catch (pollErr) {
            clearInterval(pollInterval);
            setVideoProcessing(false);
          }
        }, 1000);
      };
    } catch (err) {
      console.error(err);
      setVideoProcessing(false);
      showToast(err.message || 'Error running compression.', 'error');
    }
  };

  // Auto-trigger video optimization when settings or presets change (e.g. Smart Balance, Ultra Quality, Smallest File)
  useEffect(() => {
    if (!videoJobId) return;
    if (videoProcessing) return;

    const currentSettingsKey = `${videoJobId}_${videoMode}_${videoPreset}_${videoTargetMB}_${videoCrf}_${videoCodec}_${videoResolution}_${videoMute}`;

    // If already compressed with these exact settings, don't re-compress
    if (lastProcessedVideoSettings.current === currentSettingsKey && videoCompressedUrl) {
      return;
    }

    if (videoDebounceTimer.current) clearTimeout(videoDebounceTimer.current);

    videoDebounceTimer.current = setTimeout(() => {
      startVideoCompression(videoJobId);
    }, 450);

    return () => {
      if (videoDebounceTimer.current) clearTimeout(videoDebounceTimer.current);
    };
  }, [videoJobId, videoMode, videoPreset, videoTargetMB, videoCrf, videoCodec, videoResolution, videoMute]);

  const handleVideoDownload = () => {
    if (!videoJobId) return;
    const a = document.createElement('a');
    a.href = `/api/video/download/${videoJobId}`;
    a.download = `optipixel_${videoJobId}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Video download started!', 'success');
  };

  const handleVideoReset = () => {
    if (videoEventSourceRef.current) {
      videoEventSourceRef.current.close();
      videoEventSourceRef.current = null;
    }
    if (videoDebounceTimer.current) {
      clearTimeout(videoDebounceTimer.current);
    }
    lastProcessedVideoSettings.current = '';
    if (videoOriginalUrl) URL.revokeObjectURL(videoOriginalUrl);
    setVideoFile(null);
    setVideoOriginalUrl('');
    setVideoCompressedUrl('');
    setVideoJobId(null);
    setVideoMetadata(null);
    setVideoResult(null);
    setVideoProgress(0);
    setVideoProcessing(false);

    try {
      sessionStorage.removeItem('optipixel_active_video_id');
      sessionStorage.removeItem('optipixel_active_video_meta');
      sessionStorage.removeItem('optipixel_active_video_result');
    } catch (e) {}
  };

  const hasVideo = !!videoFile || !!videoJobId;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-900 antialiased">
      <Navbar
        historyCount={historyItems.length}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      <main className="flex-1 max-w-[1680px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col gap-5">
        <Routes>
          {/* Default Route: Redirect to Image */}
          <Route path="/" element={<Navigate to="/image" replace />} />

          {/* ===================== PAGE 1: DEDICATED IMAGE PAGE ===================== */}
          <Route
            path="/image"
            element={
              <div className="flex flex-col gap-6 animate-in fade-in duration-150">
                {!selectedFile ? (
                  <ImageHeroLayout onFilesSelected={handleSingleImage} />
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-2">
                      <ImageComparisonSlider
                        originalUrl={originalUrl}
                        compressedUrl={compressedUrl || originalUrl}
                        originalSize={originalSize}
                        compressedSize={compressedSize}
                        percentageSaved={percentageSaved}
                        enhance={enhance}
                        upscale2x={upscale2x}
                      />
                    </div>

                    <div className="lg:col-span-1">
                      <ControlPanel
                        mode={mode}
                        setMode={setMode}
                        format={format}
                        setFormat={setFormat}
                        quality={quality}
                        setQuality={setQuality}
                        targetKB={targetKB}
                        setTargetKB={setTargetKB}
                        isProcessing={isProcessing}
                        onDownload={handleImageDownload}
                        onReset={handleImageReset}
                        compressedSize={compressedSize}
                        percentageSaved={percentageSaved}
                        enhance={enhance}
                        setEnhance={setEnhance}
                        sharpen={sharpen}
                        setSharpen={setSharpen}
                        hdrContrast={hdrContrast}
                        setHdrContrast={setHdrContrast}
                        vibrance={vibrance}
                        setVibrance={setVibrance}
                        autoLevels={autoLevels}
                        setAutoLevels={setAutoLevels}
                        upscale2x={upscale2x}
                        setUpscale2x={setUpscale2x}
                      />
                    </div>
                  </div>
                )}
              </div>
            }
          />

          {/* ===================== PAGE 2: DEDICATED BATCH ARCHIVE PAGE ===================== */}
          <Route
            path="/batch"
            element={
              <div className="max-w-3xl w-full mx-auto flex flex-col gap-4 animate-in fade-in duration-150 mt-2">
                <DropZone onFilesSelected={(files) => setBatchFiles(files)} isBatch={true} />

                {batchFiles.length > 0 && (
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col gap-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">
                          {batchFiles.length} files staged for batch archive
                        </h3>
                        <p className="text-xs font-mono text-slate-500 mt-0.5">
                          Total Size: {(batchFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBatchFiles([])}
                        className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
                      >
                        Clear All
                      </button>
                    </div>

                    {/* Batch Settings */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1.5 font-semibold">
                          Target Format
                        </label>
                        <select
                          value={batchFormat}
                          onChange={(e) => setBatchFormat(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 uppercase outline-none focus:border-emerald-500 font-semibold"
                        >
                          <option value="webp">WebP (Recommended)</option>
                          <option value="jpeg">JPEG (Universal)</option>
                          <option value="png">PNG (Lossless)</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[10px] uppercase font-mono text-slate-500 font-semibold">
                            Quality
                          </label>
                          <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {batchQuality}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="40"
                          max="100"
                          value={batchQuality}
                          onChange={(e) => setBatchQuality(parseInt(e.target.value, 10))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 mt-2"
                        />
                      </div>
                    </div>

                    {/* File List */}
                    <div className="max-h-48 overflow-y-auto flex flex-col gap-1 pr-1 border-t border-slate-100 pt-3 custom-scrollbar">
                      {batchFiles.map((f, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-50 border border-slate-200/80"
                        >
                          <span className="truncate max-w-[320px] text-slate-700 font-mono text-[11px] font-medium">
                            {f.name}
                          </span>
                          <span className="font-mono text-slate-500 text-[11px] font-semibold">
                            {(f.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleBatchCompress}
                      disabled={batchProcessing}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                    >
                      {batchProcessing ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Compressing & Archiving...</span>
                        </>
                      ) : batchDone ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-white" />
                          <span>Downloaded Archive (.zip)</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Compress All & Download (.zip)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            }
          />

          {/* ===================== PAGE 3: DEDICATED VIDEO PAGE ===================== */}
          <Route
            path="/video"
            element={
              <div className="flex flex-col gap-6 animate-in fade-in duration-150">
                {!hasVideo ? (
                  <VideoHeroLayout
                    onVideoSelected={handleVideoSelected}
                    onError={(err) => showToast(err, 'error')}
                  />
                ) : (
                  <div className={`grid gap-6 items-start ${videoTheaterMode ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
                    <div className={videoTheaterMode ? 'col-span-1' : 'lg:col-span-2'}>
                      <VideoPlayerComparison
                        originalUrl={videoOriginalUrl}
                        compressedUrl={videoCompressedUrl}
                        originalSizeMB={videoMetadata?.sizeMB || (videoFile?.size ? (videoFile.size / (1024 * 1024)).toFixed(2) : 0)}
                        compressedSizeMB={videoResult?.compressedSizeMB || 0}
                        percentageSaved={videoResult?.percentageSaved || 0}
                        isProcessing={videoProcessing}
                        progress={videoProgress}
                        fps={videoFps}
                        speed={videoSpeed}
                        timeRemainingSec={videoTimeRemaining}
                        metadata={videoMetadata}
                        thumbnailUrl={videoMetadata?.thumbnailUrl}
                        onStartCompress={startVideoCompression}
                        isTheaterMode={videoTheaterMode}
                        onToggleTheater={() => setVideoTheaterMode(!videoTheaterMode)}
                      />
                    </div>

                    <div className={videoTheaterMode ? 'col-span-1 max-w-2xl mx-auto w-full' : 'lg:col-span-1'}>
                      <VideoControlPanel
                        mode={videoMode}
                        setMode={setVideoMode}
                        preset={videoPreset}
                        setPreset={setVideoPreset}
                        targetMB={videoTargetMB}
                        setTargetMB={setVideoTargetMB}
                        crf={videoCrf}
                        setCrf={setVideoCrf}
                        codec={videoCodec}
                        setCodec={setVideoCodec}
                        resolution={videoResolution}
                        setResolution={setVideoResolution}
                        mute={videoMute}
                        setMute={setVideoMute}
                        isProcessing={videoProcessing}
                        progress={videoProgress}
                        fps={videoFps}
                        speed={videoSpeed}
                        timeRemainingSec={videoTimeRemaining}
                        originalSizeMB={videoFile?.size ? (videoFile.size / (1024 * 1024)) : (videoMetadata?.sizeMB || 0)}
                        onStartCompress={startVideoCompression}
                        onDownload={handleVideoDownload}
                        onReset={handleVideoReset}
                        compressedSizeMB={videoResult?.compressedSizeMB}
                        percentageSaved={videoResult?.percentageSaved}
                        hasResult={!!videoResult}
                        verification={videoResult?.verification}
                      />
                    </div>
                  </div>
                )}
              </div>
            }
          />

          {/* ===================== PAGE 4: LOCAL RECURSIVE FOLDER BATCH OPTIMIZER ===================== */}
          <Route path="/folder-batch" element={<LocalFolderBatchOptimizer />} />

          {/* ===================== PAGE 5: LOCAL DUPLICATE FINDER & ORGANIZER ===================== */}
          <Route path="/duplicates" element={<DuplicateFinder showToast={showToast} />} />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/image" replace />} />
        </Routes>

        {/* Subtle Telemetry Footer */}
        <div className="mt-8">
          <StatsBanner />
        </div>
      </main>

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        historyItems={historyItems}
        onRestoreItem={(item) => {
          if (item.type === 'video') {
            navigate('/video');
            showToast(`Selected ${item.name} from history`, 'info');
          } else {
            restoreImageFromHistory(item, true);
          }
          setIsHistoryOpen(false);
        }}
        onDeleteItem={handleDeleteHistory}
        onClearAll={handleClearHistory}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'info' })}
      />
    </div>
  );
}
