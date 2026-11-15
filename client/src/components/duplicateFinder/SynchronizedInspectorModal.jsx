import React, { useState, useRef } from 'react';
import DiffMetadataTable from './DiffMetadataTable';
import VideoSyncControls from './VideoSyncControls';
import ComparisonSelectorTray from './ComparisonSelectorTray';
import InspectorDualCanvas from './InspectorDualCanvas';
import InspectorHeader from './InspectorHeader';

export default function SynchronizedInspectorModal({ group, initialFile, onClose }) {
  if (!group || !initialFile) return null;

  const fileA = group.files[0];
  const duplicateCandidates = group.files.filter((f) => f.filePath !== fileA.filePath);
  const [selectedB, setSelectedB] = useState(
    initialFile.filePath !== fileA.filePath ? initialFile : duplicateCandidates[0] || fileA
  );

  const [viewMode, setViewMode] = useState('side'); // 'side' | 'diff' | 'slider'
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // Video Sync State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioMode, setAudioMode] = useState('left');

  const vidRefA = useRef(null);
  const vidRefB = useRef(null);
  const isVideo = fileA.mediaType === 'video';

  const toggleVideoPlayback = () => {
    if (vidRefA.current && vidRefB.current) {
      if (isPlaying) { vidRefA.current.pause(); vidRefB.current.pause(); }
      else { vidRefA.current.play(); vidRefB.current.play(); }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (time) => {
    if (vidRefA.current) vidRefA.current.currentTime = time;
    if (vidRefB.current) vidRefB.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleToggleAudio = () => {
    const nextMode = audioMode === 'left' ? 'right' : audioMode === 'right' ? 'muted' : 'left';
    setAudioMode(nextMode);
    if (vidRefA.current) vidRefA.current.muted = nextMode !== 'left';
    if (vidRefB.current) vidRefB.current.muted = nextMode !== 'right';
  };

  const onTimeUpdate = (e) => {
    setCurrentTime(e.target.currentTime);
    if (e.target.duration && (!duration || isNaN(duration))) setDuration(e.target.duration);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        <InspectorHeader
          group={group}
          isVideo={isVideo}
          viewMode={viewMode}
          setViewMode={setViewMode}
          setZoom={setZoom}
          setPan={setPan}
          onClose={onClose}
        />

        {isVideo && (
          <div className="px-4 py-2 border-b border-slate-200 bg-white">
            <VideoSyncControls
              isPlaying={isPlaying}
              onTogglePlay={toggleVideoPlayback}
              currentTime={currentTime}
              duration={duration}
              onSeek={handleSeek}
              audioMode={audioMode}
              onToggleAudio={handleToggleAudio}
            />
          </div>
        )}

        {duplicateCandidates.length > 1 && (
          <div className="px-4 py-1.5 border-b border-slate-200 bg-slate-50">
            <ComparisonSelectorTray
              files={duplicateCandidates}
              activeFile={selectedB}
              onSelect={setSelectedB}
            />
          </div>
        )}

        <div className="flex-1 overflow-hidden bg-slate-100 flex items-center justify-center p-3">
          <InspectorDualCanvas
            isVideo={isVideo}
            viewMode={viewMode}
            fileA={fileA}
            fileB={selectedB}
            zoom={zoom}
            pan={pan}
            isPanning={isPanning}
            setIsPanning={setIsPanning}
            setPan={setPan}
            vidRefA={vidRefA}
            vidRefB={vidRefB}
            audioMode={audioMode}
            onTimeUpdate={onTimeUpdate}
            setDuration={setDuration}
          />
        </div>

        <div className="p-3 border-t border-slate-200 bg-white overflow-y-auto max-h-40">
          <DiffMetadataTable fileA={fileA} fileB={selectedB} />
        </div>
      </div>
    </div>
  );
}
