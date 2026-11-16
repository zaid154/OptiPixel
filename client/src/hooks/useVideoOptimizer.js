import { useState, useEffect, useRef } from 'react';
import { saveToHistory, getAllHistory } from '../utils/historyDB';

export function useVideoOptimizer({ showToast, onHistoryUpdated }) {
  const [videoFile, setVideoFile] = useState(null);
  const [videoOriginalUrl, setVideoOriginalUrl] = useState('');
  const [videoCompressedUrl, setVideoCompressedUrl] = useState('');
  const [videoJobId, setVideoJobId] = useState(null);
  const [videoMetadata, setVideoMetadata] = useState(null);

  const [videoMode, setVideoMode] = useState('preset');
  const [videoPreset, setVideoPreset] = useState('balanced');
  const [videoTargetMB, setVideoTargetMB] = useState(25);
  const [videoCrf, setVideoCrf] = useState(20);
  const [videoCodec, setVideoCodec] = useState('libx264');
  const [videoResolution, setVideoResolution] = useState('original');
  const [videoMute, setVideoMute] = useState(false);

  const [videoUploading, setVideoUploading] = useState(false);
  const [videoProcessing, setVideoProcessing] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoFps, setVideoFps] = useState(0);
  const [videoSpeed, setVideoSpeed] = useState('1x');
  const [videoTimeRemaining, setVideoTimeRemaining] = useState(0);
  const [videoResult, setVideoResult] = useState(null);
  const [videoTheaterMode, setVideoTheaterMode] = useState(false);

  const lastProcessedVideoSettings = useRef('');
  const videoDebounceTimer = useRef(null);
  const videoEventSourceRef = useRef(null);

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
      setVideoOriginalUrl(`/api/video/stream/${data.jobId}?type=original`);

      try {
        sessionStorage.setItem('optipixel_active_video_id', data.jobId);
        sessionStorage.setItem('optipixel_active_video_meta', JSON.stringify(data));
      } catch (e) {}

      lastProcessedVideoSettings.current = `${data.jobId}_${videoMode}_${videoPreset}_${videoTargetMB}_${videoCrf}_${videoCodec}_${videoResolution}_${videoMute}`;
      startVideoCompression(data.jobId);
    } catch (err) {
      console.error(err);
      if (showToast) showToast(err.message || 'Failed to inspect video.', 'error');
      setVideoFile(null);
    } finally {
      setVideoUploading(false);
    }
  };

  const startVideoCompression = async (overrideJobId = null) => {
    const activeId = overrideJobId || videoJobId;
    if (!activeId) return;

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
            if (showToast) showToast(`Optimization complete (-${data.result?.percentageSaved}%)`, 'success');

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
              if (onHistoryUpdated) onHistoryUpdated();
            });
          } else if (data.status === 'failed') {
            eventSource.close();
            videoEventSourceRef.current = null;
            setVideoProcessing(false);
            if (showToast) showToast(data.error || 'Video encoding failed.', 'error');
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
              if (showToast) showToast(`Optimization complete (-${check.result?.percentageSaved}%)`, 'success');
            } else if (check.status === 'failed') {
              clearInterval(pollInterval);
              setVideoProcessing(false);
              if (showToast) showToast('Encoding failed on server.', 'error');
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
      if (showToast) showToast(err.message || 'Error running compression.', 'error');
    }
  };

  useEffect(() => {
    if (!videoJobId) return;
    if (videoProcessing) return;

    const currentSettingsKey = `${videoJobId}_${videoMode}_${videoPreset}_${videoTargetMB}_${videoCrf}_${videoCodec}_${videoResolution}_${videoMute}`;
    if (lastProcessedVideoSettings.current === currentSettingsKey && videoCompressedUrl) return;

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
    if (showToast) showToast('Video download started!', 'success');
  };

  const handleVideoReset = () => {
    if (videoEventSourceRef.current) {
      videoEventSourceRef.current.close();
      videoEventSourceRef.current = null;
    }
    if (videoDebounceTimer.current) clearTimeout(videoDebounceTimer.current);
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

  return {
    videoFile,
    videoOriginalUrl,
    videoCompressedUrl,
    videoJobId,
    videoMetadata,
    videoResult,
    videoMode, setVideoMode,
    videoPreset, setVideoPreset,
    videoTargetMB, setVideoTargetMB,
    videoCrf, setVideoCrf,
    videoCodec, setVideoCodec,
    videoResolution, setVideoResolution,
    videoMute, setVideoMute,
    videoUploading,
    videoProcessing,
    videoProgress,
    videoFps,
    videoSpeed,
    videoTimeRemaining,
    videoTheaterMode, setVideoTheaterMode,
    handleVideoSelected,
    startVideoCompression,
    handleVideoDownload,
    handleVideoReset,
    setVideoOriginalUrl,
    setVideoCompressedUrl,
    setVideoJobId,
    setVideoMetadata,
    setVideoResult
  };
}
