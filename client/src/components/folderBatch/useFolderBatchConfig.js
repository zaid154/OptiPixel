import { useState } from 'react';

export function useFolderBatchConfig() {
  const [imageFormat, setImageFormat] = useState('webp');
  const [imageQuality, setImageQuality] = useState(90);
  const [preserveExif, setPreserveExif] = useState(true);
  const [videoPreset, setVideoPreset] = useState('balanced');
  const [videoCrf, setVideoCrf] = useState(23);
  const [copyNonMedia, setCopyNonMedia] = useState(true);
  const [skipExisting, setSkipExisting] = useState(true);
  const [videoMode, setVideoMode] = useState('smart');
  const [smartQualityGuard, setSmartQualityGuard] = useState(true);
  const [minImageSizeKB, setMinImageSizeKB] = useState(500);
  const [minVideoSizeMB, setMinVideoSizeMB] = useState(15);

  const getSettingsPayload = () => ({
    imageFormat, imageQuality, preserveExif, videoPreset, videoCrf,
    copyNonMedia, skipExisting, videoMode, smartQualityGuard,
    minImageSizeKB, minVideoSizeMB
  });

  return {
    imageFormat, setImageFormat, imageQuality, setImageQuality,
    preserveExif, setPreserveExif, videoPreset, setVideoPreset,
    videoCrf, setVideoCrf, copyNonMedia, setCopyNonMedia,
    skipExisting, setSkipExisting, videoMode, setVideoMode,
    smartQualityGuard, setSmartQualityGuard, minImageSizeKB, setMinImageSizeKB,
    minVideoSizeMB, setMinVideoSizeMB, getSettingsPayload
  };
}
