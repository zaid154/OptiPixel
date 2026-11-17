import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  HardDrive, ArrowLeft, RotateCcw, CheckCircle2, Trash2, ArrowUpRight,
  FolderPlus, Search, ChevronLeft, ChevronRight, LayoutGrid, List,
  Layers, ShieldCheck, ArrowRight, Loader2, Copy, Check, ExternalLink,
  Film, Image as ImageIcon, ZoomIn, X, Folder, Eye, PanelLeftClose,
  PanelLeftOpen, GitCompare, Sparkles
} from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

const ACTION_CONFIG = {
  DELETE: {
    label: 'Quarantined',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: Trash2,
  },
  KEEP: {
    label: 'Kept in Event',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
  MOVE_UPGRADE: {
    label: 'Upgraded & Moved',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: ArrowUpRight,
  },
  RESCUE_MOVE: {
    label: 'Rescued to Event',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: FolderPlus,
  },
};

// 1-Click Copy Button
function CopyBtn({ text, label = '' }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy path to clipboard"
      className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition shrink-0 cursor-pointer inline-flex items-center gap-1 text-[11px]"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
      {copied && <span className="text-[10px] text-emerald-600 font-semibold font-sans">Copied</span>}
      {label && !copied && <span className="text-[10px] text-slate-500 font-sans">{label}</span>}
    </button>
  );
}

// Side-by-Side Pair Comparison Modal
function PairCompareModal({ file, onClose }) {
  if (!file) return null;
  const isQuarantined = file.action === 'DELETE';
  const keptPath = isQuarantined ? file.matchedOriginalPath : file.sourcePath;
  const keptEvent = isQuarantined ? file.matchedOriginalEvent : file.eventFolder;
  const quaranPath = isQuarantined
    ? (file.targetPath || file.quarantinePath)
    : (file.linkedQuarantinedCopies?.[0]?.quarantinePath || null);
  const quaranSrcPath = isQuarantined
    ? file.sourcePath
    : (file.linkedQuarantinedCopies?.[0]?.sourcePath || null);

  const fileName = file.fileName || (file.sourcePath || '').split(/[/\\]/).pop();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-5xl w-full max-h-[95vh] border border-slate-200 shadow-2xl overflow-hidden flex flex-col text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-4 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Duplicate Pair Verification & Pairing</h3>
                <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                  {file.matchType || 'Exact SHA-256 Identical'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Comparing the preserved primary original against the redundant quarantined duplicate.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Banner */}
        <div className="p-3 px-6 bg-emerald-50/70 border-b border-emerald-200/80 text-xs text-emerald-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>100% Safe Resolution:</strong> The primary original is kept untouched in its event folder (<strong>{keptEvent || 'Event'}</strong>). Redundant duplicate copy was moved to local quarantine storage to free up disk space.
          </span>
        </div>

        {/* Side-by-Side Comparison Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto custom-scrollbar flex-1">
          {/* LEFT: Preserved Primary Original */}
          <div className="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/20 flex flex-col space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs uppercase border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Primary Original (PRESERVED)</span>
              </span>
              <span className="text-xs font-mono font-semibold text-emerald-900">
                In: {keptEvent || 'Event Folder'}
              </span>
            </div>

            {/* Photo preview */}
            <div className="w-full h-56 rounded-xl bg-slate-900 overflow-hidden flex items-center justify-center border border-emerald-200">
              <img
                src={`/api/duplicates/stream?path=${encodeURIComponent(keptPath || '')}`}
                onError={(e) => {
                  e.currentTarget.src = `/api/duplicates/thumbnail?path=${encodeURIComponent(keptPath || '')}`;
                }}
                alt="Kept Original"
                className="max-h-full max-w-full object-contain"
              />
            </div>

            {/* Path & Details */}
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-bold text-slate-900">{fileName}</span>
                <span>{formatBytes(file.originalSize)}</span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-emerald-200 space-y-1">
                <div className="flex items-center justify-between">
                  <strong className="text-emerald-900 uppercase text-[10px]">Active Safe Location:</strong>
                  <CopyBtn text={keptPath || ''} label="Copy" />
                </div>
                <div className="break-all select-all text-slate-800 text-[11px] leading-relaxed">
                  {keptPath || 'Preserved in event folder'}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Quarantined Duplicate Copy */}
          <div className="p-4 rounded-2xl border-2 border-rose-400 bg-rose-50/20 flex flex-col space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-100 text-rose-800 font-bold text-xs uppercase border border-rose-300">
                <Trash2 className="w-3.5 h-3.5" />
                <span>Redundant Duplicate (QUARANTINED)</span>
              </span>
              <span className="text-xs font-mono font-semibold text-rose-900">
                Reclaimed {formatBytes(file.originalSize)}
              </span>
            </div>

            {/* Photo preview */}
            <div className="w-full h-56 rounded-xl bg-slate-900 overflow-hidden flex items-center justify-center border border-rose-200">
              <img
                src={`/api/duplicates/stream?path=${encodeURIComponent(quaranPath || file.previewPath || '')}`}
                onError={(e) => {
                  e.currentTarget.src = `/api/duplicates/thumbnail?path=${encodeURIComponent(quaranPath || file.previewPath || '')}`;
                }}
                alt="Quarantined Copy"
                className="max-h-full max-w-full object-contain"
              />
            </div>

            {/* Path & Details */}
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-white border border-rose-200 space-y-1">
                <div className="flex items-center justify-between">
                  <strong className="text-rose-900 uppercase text-[10px]">Original Location (FROM):</strong>
                  <CopyBtn text={quaranSrcPath || file.sourcePath} label="Copy" />
                </div>
                <div className="break-all select-all text-slate-800 text-[11px] leading-relaxed">
                  {quaranSrcPath || file.sourcePath}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-rose-200 space-y-1">
                <div className="flex items-center justify-between">
                  <strong className="text-rose-900 uppercase text-[10px]">Quarantined To (1-Click Undo):</strong>
                  <CopyBtn text={quaranPath || file.targetPath || file.quarantinePath || ''} label="Copy" />
                </div>
                <div className="break-all select-all text-slate-800 text-[11px] leading-relaxed">
                  {quaranPath || file.targetPath || file.quarantinePath || 'Quarantine Storage'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono">
            Transaction: {file.transactionId || 'con-1794929682731'} • Group: {file.groupId || 'exact'}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition cursor-pointer"
          >
            Close Pair
          </button>
        </div>
      </div>
    </div>
  );
}

// Full Slide-Over Detail Drawer
function FileDetailDrawer({ file, onClose, onComparePair }) {
  if (!file) return null;
  const fileName = file.fileName || (file.sourcePath || '').split(/[/\\]/).pop();
  const isVideo = file.mediaType === 'video' || /\.(mp4|mov|avi|mkv|webm)$/i.test(fileName);
  const cfg = ACTION_CONFIG[file.action] || ACTION_CONFIG.DELETE;
  const ActionIcon = cfg.icon;
  const destPath = file.targetPath || file.quarantinePath || 'Quarantine Storage';
  const previewPath = file.previewPath || file.quarantinePath || file.sourcePath;
  const fullMediaUrl = `/api/duplicates/stream?path=${encodeURIComponent(previewPath)}`;
  const thumbUrl = `/api/duplicates/thumbnail?path=${encodeURIComponent(previewPath)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white border-l border-slate-200 h-full p-6 flex flex-col shadow-2xl text-slate-800 overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2 truncate mr-3">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border text-xs font-bold uppercase ${cfg.badge}`}>
              <ActionIcon className="w-3.5 h-3.5" />
              <span>{cfg.label}</span>
            </span>
            <span className="font-mono text-sm font-bold text-slate-900 truncate" title={fileName}>
              {fileName}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media Preview Box */}
        <div className="my-4 rounded-2xl bg-slate-950 overflow-hidden flex items-center justify-center min-h-[260px] max-h-[340px] border border-slate-800 shadow-inner">
          {isVideo ? (
            <video src={fullMediaUrl} controls autoPlay className="max-h-[320px] max-w-full object-contain" />
          ) : (
            <img
              src={fullMediaUrl}
              onError={(e) => { e.currentTarget.src = thumbUrl; }}
              alt={fileName}
              className="max-h-[320px] max-w-full object-contain"
            />
          )}
        </div>

        {/* Compare Pair CTA Button */}
        {(file.matchedOriginalPath || file.linkedQuarantinedCopies?.length > 0) && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onComparePair(file);
            }}
            className="w-full mb-4 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <GitCompare className="w-4 h-4" />
            <span>Compare with Paired Original / Copy (Side-by-Side)</span>
          </button>
        )}

        {/* File Metadata Strip */}
        <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono mb-4">
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Size</span>
            <span className="font-bold text-slate-900">{formatBytes(file.originalSize)}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Type</span>
            <span className="font-bold text-slate-900 uppercase">{file.mediaType || 'Image'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Event</span>
            <span className="font-bold text-slate-900 truncate block" title={file.eventFolder}>
              {file.eventFolder || 'General'}
            </span>
          </div>
        </div>

        {/* Complete Uncut Paths */}
        <div className="space-y-3.5 text-xs font-mono">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <span>{file.action === 'KEEP' ? 'Active Preserved Location' : 'Original Location (FROM)'}</span>
              </span>
              <CopyBtn text={file.sourcePath} label="Copy" />
            </div>
            <div className="p-3 rounded-xl bg-slate-900 text-slate-100 break-all select-all font-mono text-[11.5px] leading-relaxed border border-slate-800">
              {file.sourcePath}
            </div>
          </div>

          {file.action === 'DELETE' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <span>Quarantine Location (TO)</span>
                </span>
                <CopyBtn text={destPath} label="Copy" />
              </div>
              <div className="p-3 rounded-xl bg-slate-900 text-slate-100 break-all select-all font-mono text-[11.5px] leading-relaxed border border-slate-800">
                {destPath}
              </div>
            </div>
          )}

          {/* Linked Preserved Original Box */}
          {file.matchedOriginalPath && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-950 space-y-1.5">
              <div className="flex items-center justify-between">
                <strong className="text-emerald-900 font-bold uppercase text-[10.5px] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Preserved Primary Original Location:</span>
                </strong>
                <CopyBtn text={file.matchedOriginalPath} label="Copy" />
              </div>
              <div className="break-all select-all text-slate-800 text-[11px] bg-white p-2 rounded-lg border border-emerald-100">
                {file.matchedOriginalPath}
              </div>
              <div className="text-[10.5px] text-emerald-800 font-sans font-medium">
                Preserved safely in event folder: <strong>{file.matchedOriginalEvent || 'Event Folder'}</strong>
              </div>
            </div>
          )}

          {/* Linked Quarantined Copies Box */}
          {file.linkedQuarantinedCopies?.length > 0 && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-mono text-rose-950 space-y-2">
              <strong className="text-rose-900 font-bold uppercase text-[10.5px] flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>{file.linkedQuarantinedCopies.length} Duplicate Copies Quarantined:</span>
              </strong>
              <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                {file.linkedQuarantinedCopies.map((c, i) => (
                  <div key={i} className="bg-white p-2 rounded-lg border border-rose-100 text-[10.5px] space-y-0.5">
                    <div className="font-bold text-slate-900 truncate">{c.fileName} ({formatBytes(c.size)})</div>
                    <div className="text-slate-500 break-all select-all">FROM: {c.sourcePath}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Safe Quarantine: 100% Reversible</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}

// Clean Table Row
function TableRowItem({ op, onInspect, onComparePair }) {
  const fileName = op.fileName || (op.sourcePath || '').split(/[/\\]/).pop();
  const isVideo = op.mediaType === 'video' || /\.(mp4|mov|avi|mkv|webm)$/i.test(fileName);
  const isKept = op.action === 'KEEP';
  const cfg = ACTION_CONFIG[op.action] || ACTION_CONFIG.DELETE;
  const ActionIcon = cfg.icon;
  const destPath = op.targetPath || op.quarantinePath || 'Quarantine Storage';
  const previewPath = op.previewPath || op.quarantinePath || op.sourcePath;
  const thumbUrl = `/api/duplicates/thumbnail?path=${encodeURIComponent(previewPath)}&w=140&h=140`;

  return (
    <tr
      onClick={() => onInspect(op)}
      className="hover:bg-slate-50/90 transition border-b border-slate-100 text-xs cursor-pointer group"
    >
      {/* Thumbnail */}
      <td className="p-2.5 pl-3 w-14 shrink-0">
        <div className="relative w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center group-hover:border-emerald-400 transition">
          <img
            src={thumbUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          {isVideo && (
            <div className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/80 text-[7.5px] text-white font-mono font-bold">
              MP4
            </div>
          )}
          <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
            <Eye className="w-3.5 h-3.5" />
          </div>
        </div>
      </td>

      {/* File Name & Size */}
      <td className="p-2.5 w-40 shrink-0">
        <div className="font-mono font-bold text-slate-900 truncate text-[12px]" title={fileName}>
          {fileName}
        </div>
        <div className="text-[10.5px] text-slate-500 font-mono mt-0.5">
          {formatBytes(op.originalSize)}
        </div>
      </td>

      {/* Event Folder */}
      <td className="p-2.5 w-32 shrink-0">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-semibold text-[11px] max-w-[130px]">
          <Folder className="w-3 h-3 text-slate-500 shrink-0" />
          <span className="truncate" title={op.eventFolder || 'General'}>{op.eventFolder || 'General'}</span>
        </span>
      </td>

      {/* Action */}
      <td className="p-2.5 w-28 shrink-0">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10.5px] font-bold uppercase ${cfg.badge}`}>
          <ActionIcon className="w-3 h-3" />
          <span>{cfg.label}</span>
        </span>
      </td>

      {/* ORIGINAL LOCATION (FROM) & Linked Pair Info */}
      <td className="p-2.5 min-w-[220px]">
        <div className="flex items-start justify-between gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 group-hover:border-slate-300 transition">
          <div className="flex-1 min-w-0">
            <span className="font-mono text-[10.5px] text-slate-800 break-all select-all leading-normal block">
              {op.sourcePath}
            </span>

            {/* If Quarantined, show which Primary Original was preserved */}
            {!isKept && op.matchedOriginalPath && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onComparePair(op);
                }}
                className="mt-1 flex items-center gap-1 text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                title="Click to compare pair side-by-side"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="font-sans font-bold text-emerald-950 shrink-0">Preserved in {op.matchedOriginalEvent}:</span>
                <span className="truncate flex-1">{op.matchedOriginalPath.split(/[/\\]/).pop()}</span>
                <GitCompare className="w-3 h-3 text-emerald-600 shrink-0" />
              </div>
            )}
          </div>
          <CopyBtn text={op.sourcePath} />
        </div>
      </td>

      {/* QUARANTINE LOCATION (TO) */}
      <td className="p-2.5 min-w-[220px] pr-3">
        {isKept ? (
          <div className="flex items-center justify-between gap-1.5 bg-emerald-50/80 px-2.5 py-1.5 rounded-xl border border-emerald-200 text-[10.5px] font-mono text-emerald-900">
            <div className="flex items-center gap-1.5 truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="font-sans font-bold text-emerald-950">Active Original Preserved</span>
              {op.linkedQuarantinedCopies?.length > 0 && (
                <span className="text-[9.5px] text-emerald-800 bg-white/60 px-1 py-0.5 rounded font-mono">
                  ({op.linkedQuarantinedCopies.length} dup removed)
                </span>
              )}
            </div>
            {op.linkedQuarantinedCopies?.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onComparePair(op);
                }}
                className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer shrink-0"
              >
                Compare
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-start justify-between gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 group-hover:border-slate-300 transition">
            <span className="font-mono text-[10.5px] text-slate-800 break-all select-all leading-normal flex-1">
              {destPath}
            </span>
            <CopyBtn text={destPath} />
          </div>
        )}
      </td>
    </tr>
  );
}

// Clean Grid Card
function GridCardItem({ op, onInspect, onComparePair }) {
  const [loaded, setLoaded] = useState(false);
  const [thumbError, setThumbError] = useState(false);

  const fileName = op.fileName || (op.sourcePath || '').split(/[/\\]/).pop();
  const isVideo = op.mediaType === 'video' || /\.(mp4|mov|avi|mkv|webm)$/i.test(fileName);
  const isKept = op.action === 'KEEP';
  const cfg = ACTION_CONFIG[op.action] || ACTION_CONFIG.DELETE;
  const ActionIcon = cfg.icon;
  const destPath = op.targetPath || op.quarantinePath || 'Quarantine Storage';
  const previewPath = op.previewPath || op.quarantinePath || op.sourcePath;
  const thumbUrl = `/api/duplicates/thumbnail?path=${encodeURIComponent(previewPath)}&w=340&h=240`;

  return (
    <div
      onClick={() => onInspect(op)}
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col group cursor-pointer"
    >
      {/* Thumbnail with overlay */}
      <div className="relative w-full h-44 bg-slate-100 border-b border-slate-200 overflow-hidden flex items-center justify-center">
        {!loaded && !thumbError && (
          <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse" />
        )}

        {!thumbError ? (
          <img
            src={thumbUrl}
            alt={fileName}
            className={`w-full h-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setLoaded(true)}
            onError={() => {
              setLoaded(true);
              setThumbError(true);
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 gap-1.5 p-4 text-center">
            {isVideo ? <Film className="w-10 h-10 text-slate-400" /> : <ImageIcon className="w-10 h-10 text-slate-400" />}
            <span className="text-[11px] font-mono font-bold text-slate-500 uppercase">{isVideo ? 'Video' : 'Image'}</span>
          </div>
        )}

        {/* Hover zoom pill */}
        <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-semibold backdrop-blur-2xs">
          <Eye className="w-4 h-4" />
          <span>View Details & Paths</span>
        </div>

        {/* Video badge */}
        {isVideo && (
          <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/80 text-white text-[10px] font-mono font-bold">
            VIDEO
          </span>
        )}

        {/* Action badge */}
        <span className={`absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold uppercase shadow-2xs ${cfg.badge}`}>
          <ActionIcon className="w-3.5 h-3.5" />
          <span>{cfg.label}</span>
        </span>
      </div>

      {/* Card Info */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono font-bold text-xs text-slate-900 truncate" title={fileName}>
              {fileName}
            </span>
            <span className="font-mono text-[11px] text-slate-500 font-semibold shrink-0">
              {formatBytes(op.originalSize)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
            <Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate font-semibold text-slate-800">{op.eventFolder || 'General'}</span>
          </div>
        </div>

        {/* Paths section */}
        <div className="space-y-2 text-[11px] font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="flex items-start justify-between gap-2 text-slate-700">
            <div className="break-all select-all flex-1 leading-relaxed">
              <strong className="text-slate-400 uppercase text-[9.5px] mr-1 block">
                {isKept ? 'ACTIVE LOCATION:' : 'FROM:'}
              </strong>
              <span>{op.sourcePath}</span>
            </div>
            <CopyBtn text={op.sourcePath} />
          </div>

          {!isKept && (
            <div className="border-t border-slate-200/80 pt-2 flex items-start justify-between gap-2 text-slate-700">
              <div className="break-all select-all flex-1 leading-relaxed">
                <strong className="text-slate-400 uppercase text-[9.5px] mr-1 block">QUARANTINE DESTINATION (TO):</strong>
                <span>{destPath}</span>
              </div>
              <CopyBtn text={destPath} />
            </div>
          )}

          {/* Linked Pair Preview */}
          {!isKept && op.matchedOriginalPath && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onComparePair(op);
              }}
              className="mt-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[10.5px] font-mono flex items-center justify-between gap-1.5 hover:bg-emerald-100 transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5 truncate">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-sans font-bold text-emerald-950">Safe in {op.matchedOriginalEvent}:</span>
                <span className="truncate">{op.matchedOriginalPath.split(/[/\\]/).pop()}</span>
              </div>
              <GitCompare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            </div>
          )}

          {isKept && op.linkedQuarantinedCopies?.length > 0 && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onComparePair(op);
              }}
              className="mt-2 p-2 rounded-lg bg-emerald-100/60 border border-emerald-200 text-emerald-950 text-[10.5px] font-mono flex items-center justify-between hover:bg-emerald-100 transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="font-sans font-bold">Preserved • {op.linkedQuarantinedCopies.length} dup quarantined</span>
              </div>
              <GitCompare className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// MAIN PAGE
export default function ConsolidationAuditPage({ showToast }) {
  const { transactionId: routeTxnId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState('ALL');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [folderSearch, setFolderSearch] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [inspectFile, setInspectFile] = useState(null);
  const [pairCompareFile, setPairCompareFile] = useState(null);
  const [isRollingBack, setIsRollingBack] = useState(false);

  // Fetch data
  const fetchAudit = async (targetTxnId) => {
    setLoading(true);
    try {
      const url = targetTxnId
        ? `/api/duplicates/history/audit/${targetTxnId}`
        : '/api/duplicates/history/audit';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Transaction log not found');
      const json = await res.json();
      setData(json);
      setCurrentPage(1);
    } catch (err) {
      showToast?.(err.message || 'Failed to load audit report', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit(routeTxnId);
  }, [routeTxnId]);

  // 1-Click Rollback
  const handleRollback = async () => {
    if (!data?.transactionId) return;
    const ok = window.confirm(
      `Rollback Consolidation Session ${data.transactionId}?\n\nAll ${data.summary?.deletedCount || 0} quarantined files will be safely moved back to their original locations.`
    );
    if (!ok) return;

    setIsRollingBack(true);
    try {
      const res = await fetch('/api/duplicates/consolidate/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: data.transactionId }),
      });
      const resData = await res.json();
      if (!res.ok || !resData.success) throw new Error(resData.error || 'Rollback failed');
      showToast?.(`Successfully restored all files in session ${data.transactionId}!`, 'success');
      fetchAudit(data.transactionId);
    } catch (err) {
      showToast?.(err.message || 'Failed to rollback consolidation', 'error');
    } finally {
      setIsRollingBack(false);
    }
  };

  const operations = data?.operations || [];
  const events = data?.events || [];
  const summary = data?.summary || {};
  const isRolledBack = data?.status === 'rolled_back';

  // Filter event folders for sidebar search
  const filteredEvents = useMemo(() => {
    if (!folderSearch.trim()) return events;
    const q = folderSearch.toLowerCase();
    return events.filter((ev) => ev.eventName.toLowerCase().includes(q));
  }, [events, folderSearch]);

  // Filter operations based on selected event, action, search query
  const filteredOperations = useMemo(() => {
    return operations.filter((op) => {
      if (selectedEvent !== 'ALL' && op.eventFolder !== selectedEvent) return false;
      if (selectedAction !== 'ALL' && op.action !== selectedAction) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const fn = (op.fileName || '').toLowerCase();
      const src = (op.sourcePath || '').toLowerCase();
      const dest = (op.targetPath || op.quarantinePath || '').toLowerCase();
      const ev = (op.eventFolder || '').toLowerCase();
      const matched = (op.matchedOriginalPath || '').toLowerCase();
      return fn.includes(q) || src.includes(q) || dest.includes(q) || ev.includes(q) || matched.includes(q);
    });
  }, [operations, selectedEvent, selectedAction, searchQuery]);

  // Pagination
  const effectivePageSize = pageSize === 'ALL' ? Math.max(1, filteredOperations.length) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredOperations.length / effectivePageSize));
  const paginatedOperations = useMemo(() => {
    if (pageSize === 'ALL') return filteredOperations;
    const start = (currentPage - 1) * effectivePageSize;
    return filteredOperations.slice(start, start + effectivePageSize);
  }, [filteredOperations, currentPage, effectivePageSize, pageSize]);

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-200">
      {/* Top Banner Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/duplicates')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Duplicate Finder</span>
          </button>

          <div className="h-4 w-px bg-slate-200" />

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Session:</span>
            {data?.allTransactions?.length > 1 ? (
              <select
                value={data?.transactionId || ''}
                onChange={(e) => navigate(`/audit/${e.target.value}`)}
                className="font-mono text-xs px-2.5 py-1 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
              >
                {data.allTransactions.map((t) => (
                  <option key={t.transactionId} value={t.transactionId}>
                    {t.transactionId} ({new Date(t.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                {data?.transactionId || 'Loading...'}
              </span>
            )}

            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${
                isRolledBack ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {isRolledBack ? 'Rolled Back' : 'Active / Completed'}
            </span>
          </div>
        </div>

        {/* Right Action: Rollback */}
        <div className="flex items-center gap-2.5">
          {!isRolledBack && data?.transactionId && (
            <button
              type="button"
              disabled={isRollingBack}
              onClick={handleRollback}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isRollingBack ? 'Restoring All Files...' : 'Rollback Consolidation'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Title Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Consolidation & Cleanup Audit Hub
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Target Library: <strong className="text-slate-800">{data?.masterFolder || 'All Discovered Events'}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Compact KPI Stats Strip */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Preserved</span>
            <span className="text-base font-bold font-mono text-emerald-700">{summary.keptCount || 0}</span>
            <span className="text-[10px] text-slate-500 ml-1">originals in events</span>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Quarantined</span>
            <span className="text-base font-bold font-mono text-rose-700">{summary.deletedCount || 0}</span>
            <span className="text-[10px] text-slate-500 ml-1">({formatBytes(summary.freedBytes)})</span>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Audited</span>
            <span className="text-base font-bold font-mono text-slate-900">{operations.length}</span>
            <span className="text-[10px] text-slate-500 ml-1">files in session</span>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Events</span>
            <span className="text-base font-bold font-mono text-indigo-700">{events.length}</span>
            <span className="text-[10px] text-slate-500 ml-1">folders</span>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex items-start gap-5">
        {/* Collapsible Left Event Folders Sidebar */}
        {isSidebarOpen && (
          <div className="w-64 shrink-0 bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-col gap-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-emerald-600" />
                <span>Event Folders</span>
              </span>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                title="Collapse sidebar to expand table"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {/* Folder Search */}
            <div className="relative">
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={folderSearch}
                onChange={(e) => setFolderSearch(e.target.value)}
                placeholder="Search folders..."
                className="w-full pl-7 pr-2.5 py-1 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono transition"
              />
            </div>

            {/* Folder List */}
            <div className="max-h-[560px] overflow-y-auto space-y-1 custom-scrollbar pr-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedEvent('ALL');
                  setCurrentPage(1);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                  selectedEvent === 'ALL'
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span>All Event Folders</span>
                <span className={`px-2 py-0.5 rounded-md font-mono text-[10.5px] ${
                  selectedEvent === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {operations.length}
                </span>
              </button>

              {filteredEvents.map((ev) => (
                <button
                  key={ev.eventName}
                  type="button"
                  onClick={() => {
                    setSelectedEvent(ev.eventName);
                    setCurrentPage(1);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium transition cursor-pointer text-left ${
                    selectedEvent === ev.eventName
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-100'
                  }`}
                >
                  <div className="truncate mr-2">
                    <span className="font-medium truncate block" title={ev.eventName}>
                      {ev.eventName}
                    </span>
                    <span className="text-[9.5px] font-mono text-slate-400">
                      {ev.keptCount || 0} kept • {ev.deletedCount || 0} quaran
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] shrink-0 font-bold ${
                    selectedEvent === ev.eventName ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {ev.totalFiles}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Right Main Table/Grid Panel */}
        <div className="flex-1 min-w-0 flex flex-col gap-3.5">
          {/* Controls Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 px-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[260px]">
              {!isSidebarOpen && (
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer shadow-2xs"
                >
                  <PanelLeftOpen className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Folders</span>
                </button>
              )}

              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search file name, event, or full path..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono transition"
                />
              </div>
            </div>

            {/* Action Filters: ALL, KEEP (Preserved), DELETE (Quarantined) */}
            <div className="flex items-center gap-1.5">
              {[
                { key: 'ALL', label: 'All Files', count: operations.length },
                { key: 'KEEP', label: 'Kept in Events', count: operations.filter((o) => o.action === 'KEEP').length },
                { key: 'DELETE', label: 'Quarantined', count: operations.filter((o) => o.action === 'DELETE').length },
              ].map((act) => (
                <button
                  key={act.key}
                  type="button"
                  onClick={() => {
                    setSelectedAction(act.key);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    selectedAction === act.key
                      ? act.key === 'KEEP'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : act.key === 'DELETE'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {act.label} ({act.count})
                </button>
              ))}
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Table View (Clean Columns)"
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'table' ? 'bg-white shadow-2xs text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Grid Cards View"
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white shadow-2xs text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Table / Grid Content */}
          {loading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-20 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <span className="text-xs text-slate-500 font-mono">Loading audit media logs...</span>
            </div>
          ) : filteredOperations.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-20 text-center flex flex-col items-center justify-center gap-2">
              <FolderPlus className="w-8 h-8 text-slate-300" />
              <h3 className="text-sm font-bold text-slate-800">No matching files found</h3>
              <p className="text-xs text-slate-500">Try adjusting your filters or search query.</p>
            </div>
          ) : viewMode === 'table' ? (
            /* TABLE VIEW */
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-full lg:min-w-[960px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-bold text-slate-600 uppercase tracking-wider select-none">
                      <th className="p-2.5 pl-3 w-14">Preview</th>
                      <th className="p-2.5 w-40">File Name & Size</th>
                      <th className="p-2.5 w-32">Event Folder</th>
                      <th className="p-2.5 w-28">Action</th>
                      <th className="p-2.5 min-w-[220px]">Original Location (FROM)</th>
                      <th className="p-2.5 min-w-[220px] pr-3">Quarantine / Safe Location (TO)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOperations.map((op, idx) => (
                      <TableRowItem
                        key={`${op.sourcePath}-${idx}`}
                        op={op}
                        onInspect={setInspectFile}
                        onComparePair={setPairCompareFile}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* GRID VIEW */
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {paginatedOperations.map((op, idx) => (
                <GridCardItem
                  key={`${op.sourcePath}-${idx}`}
                  op={op}
                  onInspect={setInspectFile}
                  onComparePair={setPairCompareFile}
                />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && filteredOperations.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-3 px-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-500">
                  Showing {paginatedOperations.length} of {filteredOperations.length} files
                </span>

                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span>Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="font-mono text-xs px-2 py-0.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="ALL">All ({filteredOperations.length})</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="text-xs font-mono text-slate-700 font-bold">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detail Inspector Slide-Over Drawer */}
      {inspectFile && (
        <FileDetailDrawer
          file={inspectFile}
          onClose={() => setInspectFile(null)}
          onComparePair={setPairCompareFile}
        />
      )}

      {/* Side-by-Side Pair Comparison Modal */}
      {pairCompareFile && (
        <PairCompareModal
          file={pairCompareFile}
          onClose={() => setPairCompareFile(null)}
        />
      )}
    </div>
  );
}
