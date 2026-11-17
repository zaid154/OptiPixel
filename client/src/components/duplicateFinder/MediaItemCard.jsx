import React, { useState } from 'react';
import { CheckCircle2, Trash2, Eye, HardDrive, Sparkles, Copy, Check, FileText, FolderTree } from 'lucide-react';

export default function MediaItemCard({ file, isLastKeep, subfolders = [], onToggle, onRouteFile, onInspect }) {
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const isDelete = file.markedForDelete;
  const isImage = file.mediaType === 'image';
  const thumbUrl = `/api/duplicates/thumbnail?path=${encodeURIComponent(file.filePath)}&v=2`;
  const isBest = file.isBestShot || (!file.markedForDelete && (file.visualScore || 0) >= 70);

  const parts = file.filePath ? file.filePath.split(/[/\\]/) : [];
  const fileName = parts.length > 0 ? parts[parts.length - 1] : 'File';
  const ext = fileName.includes('.') ? fileName.split('.').pop().toUpperCase() : '';
  const folders = parts.slice(0, -1);
  const dirPrefix = folders.length > 1 ? folders.slice(0, -1).join('\\') : '';
  const lastFolder = folders.length > 0 ? folders[folders.length - 1] : '';

  const handleCopyPath = (e) => {
    e.stopPropagation();
    if (file.filePath) {
      navigator.clipboard.writeText(file.filePath);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <div className={`group relative rounded-xl border p-2.5 transition flex flex-col justify-between select-none shadow-xs bg-white ${
      isDelete ? 'border-rose-300 bg-rose-50/40 hover:border-rose-400' : 'border-emerald-400 bg-emerald-50/30 hover:border-emerald-500 shadow-2xs'
    }`}>
      {/* Thumbnail Container (100% uncropped with ambient backdrop, tall view) */}
      <div 
        onClick={() => onInspect(file)}
        title="Click to open side-by-side comparison"
        className="relative h-[240px] w-full rounded-lg bg-slate-900 overflow-hidden border border-slate-200/90 cursor-pointer group/thumb flex items-center justify-center"
      >
        <img src={thumbUrl} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover blur-md opacity-35 scale-110 pointer-events-none" />
        {!loaded && (
          <div className="absolute inset-0 bg-slate-800/80 animate-pulse flex items-center justify-center pointer-events-none">
            <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
          </div>
        )}
        <img
          src={thumbUrl}
          alt="Preview"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={`relative z-1 max-h-full max-w-full object-contain transition duration-200 group-hover/thumb:scale-105 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <div className="absolute top-2 left-2 flex items-center gap-1 z-10" onClick={(e) => e.stopPropagation()}>
          <button
            disabled={!isDelete && isLastKeep}
            onClick={() => (!isDelete && isLastKeep ? null : onToggle(file.filePath))}
            title={!isDelete && isLastKeep ? 'At least 1 copy must be kept in this group' : 'Toggle Keep/Delete'}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-xs transition ${
              isDelete ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            } ${!isDelete && isLastKeep ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {isDelete ? <Trash2 className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
            <span>{isDelete ? 'Delete' : 'Keep'}</span>
          </button>
          {isBest && !isDelete && !file.priorityAction && (
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-0.5 shadow-xs">
              <Sparkles className="w-2.5 h-2.5 fill-current" /> Best Visual
            </span>
          )}
          {file.priorityAction === 'MOVE_UPGRADE' && (
            <span className="px-1.5 py-0.5 rounded-md bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-0.5 shadow-xs">
              Upgrade Move
            </span>
          )}
          {file.priorityAction === 'RESCUE_MOVE' && (
            <span className="px-1.5 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-0.5 shadow-xs">
              Rescue Move
            </span>
          )}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onInspect(file); }}
          title="Inspect side-by-side"
          className="absolute top-2 right-2 p-1.5 rounded-md bg-white/95 hover:bg-white text-slate-700 hover:text-emerald-700 border border-slate-200 shadow-xs transition z-10 cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>

        {file.visualScore > 0 && (
          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-white/90 text-[10px] font-mono text-slate-800 border border-slate-200 shadow-2xs flex items-center gap-1 z-10">
            <span className={file.visualScore >= 80 ? 'text-emerald-700 font-bold' : file.visualScore >= 50 ? 'text-amber-700 font-bold' : 'text-rose-700 font-bold'}>
              {file.visualScore} Q
            </span>
            {file.clarity && <span className="text-slate-500 text-[9px]">({file.clarity})</span>}
          </div>
        )}

        <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-white/90 text-[10px] font-mono text-slate-700 border border-slate-200 shadow-2xs font-semibold z-10">
          {file.resolution?.width > 0 ? `${file.resolution.width}×${file.resolution.height}` : isImage ? 'Image' : 'Video'}
        </div>
      </div>

      {/* Metadata & Fixed Compact Path Section */}
      <div className="mt-2 space-y-1.5 text-xs">
        <div className="flex items-center justify-between font-mono text-[11px]">
          <span className="text-slate-700 font-semibold flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatBytes(file.size)}</span>
            {ext && (
              <span className="px-1 py-0.2 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-bold uppercase">
                {ext}
              </span>
            )}
          </span>
          <div className="flex items-center gap-1.5">
            {subfolders && subfolders.length > 0 && onRouteFile && (
              <select
                onChange={(e) => e.target.value && onRouteFile(file.filePath, e.target.value)}
                defaultValue=""
                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600 hover:border-emerald-400 cursor-pointer max-w-[110px] truncate"
                title="Move this file to an organized event folder"
              >
                <option value="" disabled>📁 Move to...</option>
                {subfolders.map((sf) => (
                  <option key={sf} value={sf}>
                    {sf.split(/[/\\]/).pop()}
                  </option>
                ))}
              </select>
            )}
            {file.matchConfidence && (
              <span className="text-emerald-700 font-bold">{file.matchConfidence}% Match</span>
            )}
          </div>
        </div>

        {/* Fixed Space Path Bar (Height: 44px, Small Font: 9.5px, 1-Click Copy) */}
        <div
          onClick={handleCopyPath}
          title={`Click to copy full path:\n${file.filePath}`}
          className="h-[44px] px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-400 transition cursor-pointer flex items-center justify-between gap-2 shadow-2xs group/path"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <FileText className="w-3 h-3 text-emerald-600 shrink-0" />
              <span className="font-bold text-xs text-slate-800 truncate" title={fileName}>
                {fileName}
              </span>
            </div>
            <div className="font-mono text-[9.5px] text-slate-500 truncate select-all flex items-center gap-1">
              <FolderTree className="w-2.5 h-2.5 text-slate-400 shrink-0" />
              <span className="truncate">{folders.length > 0 ? `${folders.join('\\')}\\` : ''}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyPath}
            className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold flex items-center gap-1 shrink-0 transition ${
              copied ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-300 shadow-2xs'
            }`}
          >
            {copied ? <Check className="w-2.5 h-2.5 text-white" /> : <Copy className="w-2.5 h-2.5 text-slate-400" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
