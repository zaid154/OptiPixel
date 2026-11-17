import React from 'react';
import VideoHeroLayout from '../components/VideoHeroLayout';
import VideoPlayerComparison from '../components/VideoPlayerComparison';
import VideoControlPanel from '../components/VideoControlPanel';

export default function VideoOptimizerPage({ videoOptimizer, showToast }) {
  const {
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
    handleVideoReset
  } = videoOptimizer;

  const hasVideo = !!videoFile || !!videoJobId;

  return (
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
              setMode={setMode => setVideoMode(setMode)}
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
              jobId={videoJobId}
              verification={videoResult?.verification}
            />
          </div>
        </div>
      )}
    </div>
  );
}
