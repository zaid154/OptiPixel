import React from 'react';
import ImageStrategySettings from './imageControl/ImageStrategySettings';
import ImageEnhancerSettings from './imageControl/ImageEnhancerSettings';
import ImageActionFooter from './imageControl/ImageActionFooter';

export default function ControlPanel({
  mode,
  setMode,
  format,
  setFormat,
  quality,
  setQuality,
  targetKB,
  setTargetKB,
  isProcessing,
  onDownload,
  onReset,
  compressedSize,
  percentageSaved,
  enhance,
  setEnhance,
  sharpen,
  setSharpen,
  hdrContrast,
  setHdrContrast,
  vibrance,
  setVibrance,
  autoLevels,
  setAutoLevels,
  upscale2x,
  setUpscale2x
}) {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col gap-4 shadow-xs select-none">
      <ImageStrategySettings
        mode={mode}
        setMode={setMode}
        format={format}
        setFormat={setFormat}
        quality={quality}
        setQuality={setQuality}
        targetKB={targetKB}
        setTargetKB={setTargetKB}
        enhance={enhance}
      />

      <ImageEnhancerSettings
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
        quality={quality}
        setQuality={setQuality}
      />

      <ImageActionFooter
        isProcessing={isProcessing}
        compressedSize={compressedSize}
        percentageSaved={percentageSaved}
        onDownload={onDownload}
        onReset={onReset}
      />
    </div>
  );
}
