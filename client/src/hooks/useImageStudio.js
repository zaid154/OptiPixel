import { useState, useEffect, useRef } from 'react';
import { saveToHistory, getAllHistory, getActiveSessionId, setActiveSessionId } from '../utils/historyDB';

export function useImageStudio({ showToast, onHistoryUpdated }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [originalUrl, setOriginalUrl] = useState('');
  const [compressedUrl, setCompressedUrl] = useState('');
  const [compressedBlob, setCompressedBlob] = useState(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [percentageSaved, setPercentageSaved] = useState(0);

  const [sessionImageId, setSessionImageId] = useState(null);
  const [mode, setMode] = useState('quality');
  const [format, setFormat] = useState('webp');
  const [quality, setQuality] = useState(88);
  const [targetKB, setTargetKB] = useState(500);
  const [isProcessing, setIsProcessing] = useState(false);

  const [enhance, setEnhance] = useState(false);
  const [sharpen, setSharpen] = useState('medium');
  const [hdrContrast, setHdrContrast] = useState(true);
  const [vibrance, setVibrance] = useState(true);
  const [autoLevels, setAutoLevels] = useState(false);
  const [upscale2x, setUpscale2x] = useState(false);

  const abortControllerRef = useRef(null);
  const debounceTimer = useRef(null);

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
    if (abortControllerRef.current) abortControllerRef.current.abort();
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
      if (newSessionId) setSessionImageId(newSessionId);

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
        if (onHistoryUpdated) onHistoryUpdated();
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error(err);
        if (showToast) showToast('Compression error. Please retry.', 'error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!selectedFile) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => handleCompressImage(false), 400);
    return () => clearTimeout(debounceTimer.current);
  }, [selectedFile, mode, format, quality, targetKB, enhance, sharpen, hdrContrast, vibrance, autoLevels, upscale2x]);

  const handleImageDownload = () => {
    if (!compressedBlob) return;
    const ext = format.toLowerCase().replace('jpeg', 'jpg');
    const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
    const filename = `${baseName}_optimized.${ext}`;
    const url = URL.createObjectURL(compressedBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    if (showToast) showToast('Download started', 'success');
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
  };

  const restoreImageFromHistory = (item, notify = true) => {
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

    if (notify && showToast) showToast(`Restored ${item.name}`, 'info');
  };

  return {
    selectedFile,
    originalUrl,
    compressedUrl,
    compressedBlob,
    originalSize,
    compressedSize,
    percentageSaved,
    mode, setMode,
    format, setFormat,
    quality, setQuality,
    targetKB, setTargetKB,
    isProcessing,
    enhance, setEnhance,
    sharpen, setSharpen,
    hdrContrast, setHdrContrast,
    vibrance, setVibrance,
    autoLevels, setAutoLevels,
    upscale2x, setUpscale2x,
    handleSingleImage,
    handleImageDownload,
    handleImageReset,
    restoreImageFromHistory
  };
}
