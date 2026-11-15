import React from 'react';
import PixelDiffViewer from './PixelDiffViewer';

export default function InspectorDualCanvas({
  isVideo,
  viewMode,
  fileA,
  fileB,
  zoom,
  pan,
  isPanning,
  setIsPanning,
  setPan,
  vidRefA,
  vidRefB,
  audioMode,
  onTimeUpdate,
  setDuration
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
          className="relative aspect-video rounded-xl bg-white border border-slate-200 overflow-hidden flex flex-col justify-between shadow-2xs cursor-grab active:cursor-grabbing"
        >
          <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-slate-900">
            {!isVideo ? (
              <img
                src={idx === 0 ? streamUrlA : streamUrlB}
                alt="Inspection"
                style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` }}
                className="max-h-full max-w-full object-contain pointer-events-none transition-transform duration-75"
              />
            ) : (
              <video
                ref={idx === 0 ? vidRefA : vidRefB}
                src={idx === 0 ? streamUrlA : streamUrlB}
                controls={false}
                muted={idx === 0 ? audioMode !== 'left' : audioMode !== 'right'}
                onTimeUpdate={idx === 0 ? onTimeUpdate : undefined}
                onLoadedMetadata={(e) => idx === 0 && setDuration(e.target.duration)}
                className="w-full h-full object-contain"
              />
            )}
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-white/95 text-[10px] font-mono font-bold text-slate-800 border border-slate-200 shadow-xs">
              {idx === 0 ? 'Primary / Master Copy' : 'Compared Duplicate'}
            </div>
          </div>
          <div className="p-2 bg-white border-t border-slate-200 text-[11px] font-mono flex items-center justify-between text-slate-600">
            <span className="truncate max-w-[280px]" title={item.filePath}>{item.filePath.split(/[/\\]/).pop()}</span>
            <span className="font-bold text-slate-800">{item.resolution?.width ? `${item.resolution.width}×${item.resolution.height}` : ''}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
