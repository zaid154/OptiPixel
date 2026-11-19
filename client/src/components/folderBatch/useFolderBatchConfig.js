import { useState } from 'react';

export function useFolderBatchConfig() {
  const [imageFormat, setImageFormat] = useState('original');
  const [imageQuality, setImageQuality] = useState(96);
  const [resolutionCap, setResolutionCap] = useState('original'); // 'original' | '4k' | '2k'
  const [preserveExif, setPreserveExif] = useState(true);
  const [videoPreset, setVideoPreset] = useState('balanced');
  const [videoCrf, setVideoCrf] = useState(23);
  const [copyNonMedia, setCopyNonMedia] = useState(true);
  const [skipExisting, setSkipExisting] = useState(true);
  const [videoMode, setVideoMode] = useState('smart');
  const [smartQualityGuard, setSmartQualityGuard] = useState(true);
  const [minImageSizeKB, setMinImageSizeKB] = useState(500);
  const [minVideoSizeMB, setMinVideoSizeMB] = useState(15);
  const [optimizePdf, setOptimizePdf] = useState(true);

  const getSettingsPayload = () => ({
    imageFormat, imageQuality, resolutionCap, preserveExif, videoPreset, videoCrf,
    copyNonMedia, skipExisting, videoMode, smartQualityGuard,
    minImageSizeKB, minVideoSizeMB, optimizePdf
  });

  return {
    imageFormat, setImageFormat, imageQuality, setImageQuality,
    resolutionCap, setResolutionCap,
    preserveExif, setPreserveExif, videoPreset, setVideoPreset,
    videoCrf, setVideoCrf, copyNonMedia, setCopyNonMedia,
    skipExisting, setSkipExisting, videoMode, setVideoMode,
    smartQualityGuard, setSmartQualityGuard, minImageSizeKB, setMinImageSizeKB,
    minVideoSizeMB, setMinVideoSizeMB, optimizePdf, setOptimizePdf, getSettingsPayload
  };
}
