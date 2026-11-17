import React, { useState, useRef } from 'react';
import DiffMetadataTable from './DiffMetadataTable';
import VideoSyncControls from './VideoSyncControls';
import ComparisonSelectorTray from './ComparisonSelectorTray';
import InspectorDualCanvas from './InspectorDualCanvas';
import InspectorHeader from './InspectorHeader';

export default function SynchronizedInspectorModal({
  group,
  initialFile,
  onClose,
  rootPath = '',
  subfolders = [],
  onToggleFile,
  onRouteFile
}) {
  if (!group || !initialFile) return null;

  const fileA = group.files[0];
  const duplicateCandidates = group.files.filter((f) => f.filePath !== fileA.filePath);
  const [selectedB, setSelectedB] = useState(
    initialFile.filePath !== fileA.filePath ? initialFile : duplicateCandidates[0] || fileA
  );

  const [viewMode, setViewMode] = useState('side');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioMode, setAudioMode] = useState('left');

  const vidRefA = useRef(null);
  const vidRefB = useRef(null);
  const isVideo = fileA.mediaType === 'video';

  const toggleVideoPlayback = () => {
    if (!vidRefA.current || !vidRefB.current) return;
    if (isPlaying) {
      vidRefA.current.pause(); vidRefB.current.pause(); setIsPlaying(false);
    } else {
      vidRefB.current.currentTime = vidRefA.current.currentTime;
      Promise.all([vidRefA.current.play(), vidRefB.current.play()])
        .then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleSeek = (time) => {
    setCurrentTime(time);
    if (vidRefA.current) vidRefA.current.currentTime = time;
    if (vidRefB.current) vidRefB.current.currentTime = time;
  };

  const handleToggleAudio = () => {
    const nextMode = audioMode === 'left' ? 'right' : audioMode === 'right' ? 'muted' : 'left';
    setAudioMode(nextMode);
    if (vidRefA.current) vidRefA.current.muted = nextMode !== 'left';
    if (vidRefB.current) vidRefB.current.muted = nextMode !== 'right';
  };

  const onTimeUpdate = (e) => {
    const t = e.target.currentTime;
    setCurrentTime(t);
    if (e.target.duration && (!duration || isNaN(duration))) setDuration(e.target.duration);
    if (vidRefB.current && isPlaying && Math.abs(vidRefB.current.currentTime - t) > 0.3) {
      vidRefB.current.currentTime = t;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden shadow-2xl">
        <InspectorHeader
          group={group}
          isVideo={isVideo}
          viewMode={viewMode}
          setViewMode={setViewMode}
          setZoom={setZoom}
          setPan={setPan}
          rotation={rotation}
          setRotation={setRotation}
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

        <div className="flex-1 overflow-hidden bg-slate-900/95 flex items-center justify-center p-3">
          <InspectorDualCanvas
            isVideo={isVideo}
            viewMode={viewMode}
            fileA={fileA}
            fileB={selectedB}
            zoom={zoom}
            pan={pan}
            rotation={rotation}
            isPanning={isPanning}
            setIsPanning={setIsPanning}
            setPan={setPan}
            vidRefA={vidRefA}
            vidRefB={vidRefB}
            audioMode={audioMode}
            onTimeUpdate={onTimeUpdate}
            setDuration={setDuration}
            onTogglePlay={toggleVideoPlayback}
            rootPath={rootPath}
            subfolders={subfolders}
            onToggleAction={onToggleFile}
            onRouteEvent={onRouteFile}
          />
        </div>

        {/* Collapsible Metadata Comparison Bar */}
        <div className="border-t border-slate-200 bg-white">
          <div className="px-4 py-2 flex items-center justify-between text-xs bg-slate-50">
            <div className="flex items-center gap-3 font-mono text-[11px] text-slate-700">
              <span><b>Res:</b> {fileA.resolution?.width ? `${fileA.resolution.width}×${fileA.resolution.height}` : 'N/A'} vs {selectedB.resolution?.width ? `${selectedB.resolution.width}×${selectedB.resolution.height}` : 'N/A'}</span>
              <span className="text-slate-300">•</span>
              <span><b>Match:</b> {group.matchType === 'exact_sha256' ? '100% Exact' : `${group.confidence}% Visual`}</span>
            </div>
            <button
              onClick={() => setShowTable(!showTable)}
              className="px-2.5 py-1 rounded bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 text-[11px] font-semibold transition cursor-pointer"
            >
              {showTable ? 'Hide Properties ▴' : 'Compare Properties Table ▾'}
            </button>
          </div>
          {showTable && (
            <div className="p-3 border-t border-slate-200 max-h-48 overflow-y-auto">
              <DiffMetadataTable fileA={fileA} fileB={selectedB} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
