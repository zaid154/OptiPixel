import { useRef, useState, useEffect, useCallback } from 'react';

export function useDualVideoSync({ metadata, compressedUrl }) {
  const containerRef = useRef(null);
  const origVideoRef = useRef(null);
  const compVideoRef = useRef(null);
  const isSeekingRef = useRef(false);
  const seekTimeoutRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(metadata?.duration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [audioSource, setAudioSource] = useState('optimized');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState('side_by_side');
  const [splitPos, setSplitPos] = useState(50);

  const videoFps = metadata?.fps || 30;

  useEffect(() => {
    if (metadata?.duration && (!duration || duration === 0)) {
      setDuration(metadata.duration);
    }
  }, [metadata?.duration]);

  useEffect(() => {
    if (origVideoRef.current) {
      origVideoRef.current.volume = volume;
      origVideoRef.current.muted = isMuted || (compressedUrl ? audioSource === 'optimized' : false);
    }
    if (compVideoRef.current) {
      compVideoRef.current.volume = volume;
      compVideoRef.current.muted = isMuted || (compressedUrl ? audioSource === 'original' : false);
    }
  }, [volume, isMuted, audioSource, compressedUrl]);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const intervalId = setInterval(() => {
      const orig = origVideoRef.current;
      const comp = compVideoRef.current;
      if (!orig || !comp || orig.paused || comp.paused || isSeekingRef.current) return;

      const drift = orig.currentTime - comp.currentTime;
      if (Math.abs(drift) > 0.75) {
        comp.currentTime = orig.currentTime;
        comp.playbackRate = orig.playbackRate;
      } else if (drift > 0.07) {
        comp.playbackRate = orig.playbackRate * 1.07;
      } else if (drift < -0.07) {
        comp.playbackRate = orig.playbackRate * 0.93;
      } else if (comp.playbackRate !== orig.playbackRate) {
        comp.playbackRate = orig.playbackRate;
      }
    }, 250);
    return () => clearInterval(intervalId);
  }, [isPlaying]);

  const togglePlay = useCallback(async () => {
    const orig = origVideoRef.current;
    const comp = compVideoRef.current;
    if (!orig) return;

    if (isPlaying || (!orig.paused && (!comp || !comp.paused))) {
      orig.pause();
      if (comp) comp.pause();
      setIsPlaying(false);
    } else {
      if (comp) {
        comp.currentTime = orig.currentTime;
        comp.playbackRate = playbackRate;
      }
      orig.playbackRate = playbackRate;
      try {
        if (comp) {
          await Promise.all([orig.play(), comp.play()]);
        } else {
          await orig.play();
        }
        setIsPlaying(true);
      } catch (err) {
        console.warn('Playback error handled:', err);
      }
    }
  }, [isPlaying, playbackRate]);

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    isSeekingRef.current = true;
    if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
    seekTimeoutRef.current = setTimeout(() => {
      if (origVideoRef.current) origVideoRef.current.currentTime = time;
      if (compVideoRef.current) compVideoRef.current.currentTime = time;
      isSeekingRef.current = false;
    }, 35);
  };

  const handleSeekEnd = () => {
    isSeekingRef.current = false;
    if (origVideoRef.current) origVideoRef.current.currentTime = currentTime;
    if (compVideoRef.current) compVideoRef.current.currentTime = currentTime;
  };

  const skipTime = (seconds) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    setCurrentTime(newTime);
    if (origVideoRef.current) origVideoRef.current.currentTime = newTime;
    if (compVideoRef.current) compVideoRef.current.currentTime = newTime;
  };

  const stepFrame = (direction) => {
    if (isPlaying) {
      if (origVideoRef.current) origVideoRef.current.pause();
      if (compVideoRef.current) compVideoRef.current.pause();
      setIsPlaying(false);
    }
    const frameDelta = direction / videoFps;
    const target = Math.max(0, Math.min(duration, currentTime + frameDelta));
    setCurrentTime(target);
    if (origVideoRef.current) origVideoRef.current.currentTime = target;
    if (compVideoRef.current) compVideoRef.current.currentTime = target;
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return {
    containerRef,
    origVideoRef,
    compVideoRef,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    playbackRate,
    setPlaybackRate,
    isLooping,
    setIsLooping,
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    audioSource,
    setAudioSource,
    isFullscreen,
    toggleFullscreen,
    viewMode,
    setViewMode,
    splitPos,
    setSplitPos,
    togglePlay,
    handleSeek,
    handleSeekEnd,
    skipTime,
    stepFrame
  };
}
