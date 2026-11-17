import React from 'react';
import PixelDiffViewer from './PixelDiffViewer';
import { FolderTree } from 'lucide-react';

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
  onTogglePlay,
  rootPath = '',
  subfolders = [],
  onToggleAction,
  onRouteEvent
}) {
  const streamUrlA = `/api/duplicates/stream?path=${encodeURIComponent(fileA.filePath)}`;
  const streamUrlB = `/api/duplicates/stream?path=${encodeURIComponent(fileB.filePath)}`;

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getRelativeFolder = (fp) => {
    if (!fp) return '';
    const norm = fp.replace(/\\/g, '/');
    const normRoot = (rootPath || '').replace(/\\/g, '/');
    const rel = norm.startsWith(normRoot) ? norm.slice(normRoot.length).replace(/^\/+/, '') : norm;
    const parts = rel.split('/');
    parts.pop();
    return parts.length > 0 ? parts.join('\\') + '\\' : 'Root Directory\\';
  };

  if (!isVideo && viewMode !== 'side') {
    return <PixelDiffViewer pathA={fileA.filePath} pathB={fileB.filePath} mode={viewMode} />;
  }

  return (
    <div className="grid grid-cols-2 gap-3 w-full h-full">
      {[fileA, fileB].map((item, idx) => {
        const parts = item.filePath ? item.filePath.split(/[/\\]/) : [];
        const fileName = parts.pop() || 'File';
        const ext = fileName.includes('.') ? fileName.split('.').pop().toUpperCase() : 'IMG';
        const folderPath = getRelativeFolder(item.filePath);

        return (
          <div
            key={item.filePath || idx}
            onMouseDown={() => !isVideo && setIsPanning(true)}
            onMouseUp={() => !isVideo && setIsPanning(false)}
            onMouseMove={(e) => !isVideo && isPanning && setPan((p) => ({ x: p.x + e.movementX, y: p.y + e.movementY }))}
            className="relative h-[430px] sm:h-[470px] lg:h-[500px] rounded-xl bg-slate-950 border border-slate-200 overflow-hidden flex flex-col justify-between shadow-sm cursor-grab active:cursor-grabbing"
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

            <div className="p-3 bg-white border-t border-slate-200 text-xs font-mono flex flex-col gap-1.5 select-none">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate max-w-[240px] font-bold text-slate-800 text-[12px]" title={item.filePath}>
                  {fileName}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {ext}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {item.resolution?.width ? `${item.resolution.width}×${item.resolution.height}` : isVideo ? 'Video' : 'Image'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    {formatBytes(item.size)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 text-[10.5px]">
                <div className="flex items-center gap-1 min-w-0 text-slate-500 truncate" title={item.filePath}>
                  <FolderTree className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{folderPath}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onToggleAction && (
                    <button
                      type="button"
                      onClick={() => onToggleAction(item.filePath)}
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] cursor-pointer transition ${
                        item.markedForDelete
                          ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                          : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      }`}
                    >
                      {item.markedForDelete ? '● Delete' : '● Keep'}
                    </button>
                  )}

                  {subfolders && subfolders.length > 0 && onRouteEvent && (
                    <select
                      onChange={(e) => e.target.value && onRouteEvent(item.filePath, e.target.value)}
                      defaultValue=""
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600 hover:border-emerald-400 cursor-pointer max-w-[120px] truncate"
                    >
                      <option value="" disabled>Move to...</option>
                      {subfolders.map((sf) => (
                        <option key={sf} value={sf}>
                          {sf.split(/[/\\]/).pop()}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
