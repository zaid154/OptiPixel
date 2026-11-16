import React, { useEffect } from 'react';
import { useDualVideoSync } from './video/player/useDualVideoSync';
import VideoPlayerHeader from './video/player/VideoPlayerHeader';
import VideoSplitSliderView from './video/player/VideoSplitSliderView';
import VideoSideBySideView from './video/player/VideoSideBySideView';
import VideoTransportDock from './video/player/VideoTransportDock';

export default function VideoPlayerComparison({
  originalUrl,
  compressedUrl,
  originalSizeMB,
  compressedSizeMB,
  percentageSaved,
  isProcessing,
  progress = 0,
  fps = 0,
  speed = '1x',
  timeRemainingSec = 0,
  metadata,
  thumbnailUrl,
  onStartCompress,
  isTheaterMode = false,
  onToggleTheater
}) {
  const sync = useDualVideoSync({ metadata, compressedUrl });

  const isPortrait = metadata?.height > metadata?.width;
  const isSquare = metadata?.width && metadata?.height && Math.abs(metadata.width - metadata.height) < 40;
  const aspectRatio = (metadata?.width && metadata?.height)
    ? `${metadata.width} / ${metadata.height}`
    : (isPortrait ? '9 / 16' : isSquare ? '1 / 1' : '16 / 9');

  const maxViewportHeight = sync.isFullscreen
    ? 'calc(100vh - 175px)'
    : isPortrait ? '72vh' : '56vh';

  const handleTimeUpdate = () => {
    if (sync.origVideoRef.current) {
      sync.setCurrentTime(sync.origVideoRef.current.currentTime);
      if (sync.origVideoRef.current.ended) {
        if (sync.isLooping) {
          sync.origVideoRef.current.currentTime = 0;
          if (sync.compVideoRef.current) sync.compVideoRef.current.currentTime = 0;
          sync.origVideoRef.current.play().catch(() => {});
          if (sync.compVideoRef.current) sync.compVideoRef.current.play().catch(() => {});
        } else {
          sync.setIsPlaying(false);
        }
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (sync.origVideoRef.current?.duration) {
      sync.setDuration(sync.origVideoRef.current.duration);
    }
  };

  const handleRateChange = (rate) => {
    sync.setPlaybackRate(rate);
    if (sync.origVideoRef.current) sync.origVideoRef.current.playbackRate = rate;
    if (sync.compVideoRef.current) sync.compVideoRef.current.playbackRate = rate;
  };

  const toggleMute = () => sync.setIsMuted(!sync.isMuted);
  const handleVolumeChange = (e) => sync.setVolume(parseFloat(e.target.value));

  const formatTimecode = (secs) => {
    if (isNaN(secs) || secs < 0) return '00:00.00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const formatSimpleTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); sync.togglePlay(); }
      else if (e.code === 'ArrowLeft') { e.preventDefault(); sync.skipTime(-5); }
      else if (e.code === 'ArrowRight') { e.preventDefault(); sync.skipTime(5); }
      else if (e.code === 'Comma') { e.preventDefault(); sync.stepFrame(-1); }
      else if (e.code === 'Period') { e.preventDefault(); sync.stepFrame(1); }
      else if (e.code === 'KeyM') { e.preventDefault(); toggleMute(); }
      else if (e.code === 'KeyF') { e.preventDefault(); sync.toggleFullscreen(); }
      else if (e.code === 'KeyL') { e.preventDefault(); sync.setIsLooping((p) => !p); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sync.togglePlay]);

  return (
    <div
      ref={sync.containerRef}
      className={`flex flex-col gap-3 rounded-2xl border border-zinc-800/90 bg-zinc-950 p-3 sm:p-4 shadow-2xl transition-all duration-200 select-none ${
        sync.isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none p-6 justify-between' : ''
      }`}
    >
      <VideoPlayerHeader
        metadata={metadata}
        percentageSaved={percentageSaved}
        compressedUrl={compressedUrl}
        viewMode={sync.viewMode}
        setViewMode={sync.setViewMode}
        isFullscreen={sync.isFullscreen}
        toggleFullscreen={sync.toggleFullscreen}
        isTheaterMode={isTheaterMode}
        onToggleTheater={onToggleTheater}
      />

      {sync.viewMode === 'split' && compressedUrl ? (
        <VideoSplitSliderView
          aspectRatio={aspectRatio}
          maxViewportHeight={maxViewportHeight}
          togglePlay={sync.togglePlay}
          compVideoRef={sync.compVideoRef}
          origVideoRef={sync.origVideoRef}
          compressedUrl={compressedUrl}
          originalUrl={originalUrl}
          thumbnailUrl={thumbnailUrl}
          splitPos={sync.splitPos}
          setSplitPos={sync.setSplitPos}
          isMuted={sync.isMuted}
          audioSource={sync.audioSource}
          handleTimeUpdate={handleTimeUpdate}
          handleLoadedMetadata={handleLoadedMetadata}
          setIsPlaying={sync.setIsPlaying}
          originalSizeMB={originalSizeMB}
          compressedSizeMB={compressedSizeMB}
          percentageSaved={percentageSaved}
        />
      ) : (
        <VideoSideBySideView
          aspectRatio={aspectRatio}
          maxViewportHeight={maxViewportHeight}
          isFullscreen={sync.isFullscreen}
          togglePlay={sync.togglePlay}
          origVideoRef={sync.origVideoRef}
          compVideoRef={sync.compVideoRef}
          originalUrl={originalUrl}
          compressedUrl={compressedUrl}
          thumbnailUrl={thumbnailUrl}
          isMuted={sync.isMuted}
          audioSource={sync.audioSource}
          handleTimeUpdate={handleTimeUpdate}
          handleLoadedMetadata={handleLoadedMetadata}
          isPlaying={sync.isPlaying}
          setIsPlaying={sync.setIsPlaying}
          originalSizeMB={originalSizeMB}
          compressedSizeMB={compressedSizeMB}
          percentageSaved={percentageSaved}
          metadata={metadata}
          isProcessing={isProcessing}
          progress={progress}
          timeRemainingSec={timeRemainingSec}
          fps={fps}
          speed={speed}
          onStartCompress={onStartCompress}
        />
      )}

      <VideoTransportDock
        currentTime={sync.currentTime}
        duration={sync.duration}
        handleSeek={sync.handleSeek}
        handleSeekEnd={sync.handleSeekEnd}
        skipTime={sync.skipTime}
        stepFrame={sync.stepFrame}
        togglePlay={sync.togglePlay}
        isPlaying={sync.isPlaying}
        isLooping={sync.isLooping}
        setIsLooping={sync.setIsLooping}
        compressedUrl={compressedUrl}
        audioSource={sync.audioSource}
        setAudioSource={sync.setAudioSource}
        isMuted={sync.isMuted}
        toggleMute={toggleMute}
        volume={sync.volume}
        handleVolumeChange={handleVolumeChange}
        playbackRate={sync.playbackRate}
        handleRateChange={handleRateChange}
        formatSimpleTime={formatSimpleTime}
        formatTimecode={formatTimecode}
      />
    </div>
  );
}
