import React from 'react';
import PixelDiffViewer from './PixelDiffViewer';

export default function InspectorDualCanvas({
  isVideo,
  viewMode,
  fileA,
  fileB,
  zoom,
  pan,
  rotation = 0,
  isPanning,
  setIsPanning,
  setPan,
  vidRefA,
  vidRefB,
  audioMode,
  onTimeUpdate,
  setDuration,
  onTogglePlay
}) {
  const streamUrlA = `/api/duplicates/stream?path=${encodeURIComponent(fileA.filePath)}`;
  const streamUrlB = `/api/duplicates/stream?path=${encodeURIComponent(fileB.filePath)}`;

  if (!isVideo && viewMode !== 'side') {
    return <PixelDiffViewer pathA={fileA.filePath} pathB={fileB.filePath} mode={viewMode} />;
  }

  return (
    <div className="grid grid-cols-2 gap-3 w-full h-full">
      {[fileA, fileB].map((item, idx) => (
        <div
          key={item.filePath || idx}
          onMouseDown={() => !isVideo && setIsPanning(true)}
          onMouseUp={() => !isVideo && setIsPanning(false)}
          onMouseMove={(e) => !isVideo && isPanning && setPan((p) => ({ x: p.x + e.movementX, y: p.y + e.movementY }))}
          className="relative h-[420px] sm:h-[460px] lg:h-[490px] rounded-xl bg-slate-950 border border-slate-200 overflow-hidden flex flex-col justify-between shadow-sm cursor-grab active:cursor-grabbing"
        >
          <div 
            onClick={isVideo ? onTogglePlay : undefined}
            title={isVideo ? 'Click canvas to toggle Play / Pause' : undefined}
            className="relative flex-1 flex items-center justify-center overflow-hidden bg-slate-950 select-none"
          >
            {!isVideo ? (
              <img
                src={idx === 0 ? streamUrlA : streamUrlB}
                alt="Inspection"
                style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px) rotate(${rotation}deg)` }}
                className="max-h-full max-w-full object-contain pointer-events-none transition-transform duration-100"
              />
            ) : (
              <video
                ref={idx === 0 ? vidRefA : vidRefB}
                src={idx === 0 ? streamUrlA : streamUrlB}
                controls={false}
                muted={idx === 0 ? audioMode !== 'left' : audioMode !== 'right'}
                onTimeUpdate={idx === 0 ? onTimeUpdate : undefined}
                onLoadedMetadata={(e) => idx === 0 && setDuration(e.target.duration)}
                style={{ transform: `rotate(${rotation}deg)` }}
                className="max-h-full max-w-full object-contain pointer-events-none transition-transform duration-150"
              />
            )}
            <div className="absolute top-2 left-2 px-2.5 py-1 rounded-md bg-white/95 backdrop-blur-xs text-[10.5px] font-mono font-bold text-slate-800 border border-slate-200 shadow-sm z-10">
              {idx === 0 ? 'Primary / Master Copy' : 'Compared Duplicate'}
            </div>
          </div>
          <div className="p-2.5 bg-white border-t border-slate-200 text-[11px] font-mono flex items-center justify-between text-slate-600">
            <span className="truncate max-w-[280px] font-semibold text-slate-800" title={item.filePath}>{item.filePath.split(/[/\\]/).pop()}</span>
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{item.resolution?.width ? `${item.resolution.width}×${item.resolution.height}` : ''}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
