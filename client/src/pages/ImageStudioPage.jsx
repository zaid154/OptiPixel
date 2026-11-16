import React from 'react';
import ImageHeroLayout from '../components/ImageHeroLayout';
import ImageComparisonSlider from '../components/ImageComparisonSlider';
import ControlPanel from '../components/ControlPanel';

export default function ImageStudioPage({ imageStudio }) {
  const {
    selectedFile,
    originalUrl,
    compressedUrl,
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
    handleImageReset
  } = imageStudio;

  return (
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
  );
}
