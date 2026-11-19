import React, { useState, useEffect } from 'react';
import { FolderOpen, Folder, Play, Image as ImageIcon, Film, Clock, AlertTriangle, CheckCircle2, FileText } from 'lucide-react';
import ConfigSpeedProfiles from './ConfigSpeedProfiles';
import ConfigPhotoVideoSettings from './ConfigPhotoVideoSettings';
import ConfigPdfSettings from './ConfigPdfSettings';
import ConfigQualityGuard from './ConfigQualityGuard';

export default function Step2DestinationConfig({
  scanResult,
  destPath,
  setDestPath,
  onBrowseDest,
  videoMode,
  setVideoMode,
  setMinVideoSizeMB,
  setVideoCrf,
  imageFormat,
  setImageFormat,
  imageQuality,
  setImageQuality,
  resolutionCap,
  setResolutionCap,
  videoPreset,
  setVideoPreset,
  smartQualityGuard,
  setSmartQualityGuard,
  minImageSizeKB,
  setMinImageSizeKB,
  minVideoSizeMB,
  batchError,
  optimizePdf,
  setOptimizePdf,
  onBack,
  onStart
}) {
  const [destStatus, setDestStatus] = useState(null);
  const [isResumeSelected, setIsResumeSelected] = useState(true);

  useEffect(() => {
    if (!destPath || !destPath.trim()) {
      setDestStatus(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/batch-folder/check-dest?path=${encodeURIComponent(destPath.trim())}`);
        const data = await res.json();
        setDestStatus(data);
      } catch {
        setDestStatus(null);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [destPath]);
  return (
    <div className="space-y-5">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">Total Files</span>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">{scanResult.stats.totalFiles.toLocaleString()}</div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{scanResult.stats.totalSizeGB} GB total</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] text-blue-600 font-semibold uppercase tracking-wider flex items-center gap-1">
            <ImageIcon className="w-3.5 h-3.5" /> Photos
          </span>
          <div className="text-xl font-bold text-blue-700 mt-1 font-mono">{scanResult.stats.images?.count?.toLocaleString() || 0}</div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{scanResult.stats.images?.sizeGB || 0} GB</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] text-amber-600 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Film className="w-3.5 h-3.5" /> Videos
          </span>
          <div className="text-xl font-bold text-amber-700 mt-1 font-mono">{scanResult.stats.videos?.count?.toLocaleString() || 0}</div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{scanResult.stats.videos?.sizeGB || 0} GB</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] text-rose-600 font-semibold uppercase tracking-wider flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" /> PDFs & Docs
          </span>
          <div className="text-xl font-bold text-rose-700 mt-1 font-mono">
            {((scanResult.stats.pdfs?.count || 0) + (scanResult.stats.others?.count || 0)).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {scanResult.stats.pdfs?.count ? `${scanResult.stats.pdfs.count} PDFs` : `${scanResult.stats.others?.count || 0} docs`}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[11px] text-emerald-600 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Estimated Time
          </span>
          <div className="text-xl font-bold text-emerald-700 mt-1 font-mono">~{scanResult.stats.estimatedFormatted}</div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{scanResult.stats.subfolderCount} sub-folders</span>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-emerald-600" /> Destination Folder (Where to save optimized files)
            </label>
            {scanResult?.folderPath && (
              <button
                type="button"
                onClick={() => setDestPath(`${scanResult.folderPath}_Optimized`)}
                className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                title="Reset destination to default [SourceFolder]_Optimized"
              >
                ↺ Reset Default ({scanResult.folderPath.split(/[\\/]/).filter(Boolean).pop()}_Optimized)
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={destPath}
              onChange={(e) => setDestPath(e.target.value)}
              placeholder="e.g. D:\Photos2024_Optimized"
              className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-mono focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-2xs"
            />
            <button
              type="button"
              onClick={onBrowseDest}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 hover:border-slate-300 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <Folder className="w-4 h-4 text-slate-500" />
              <span>Browse</span>
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <p>Recreates exact folder hierarchy. Default is auto-paired as <code className="text-emerald-700 font-mono font-semibold">[Source]_Optimized</code>.</p>
            <span className="text-slate-400 font-medium">Any custom path allowed</span>
          </div>

          {/* Folder Existence Alert & Action Banner */}
          {destStatus?.exists && !destStatus?.isEmpty && (
            <div className="p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-xl space-y-2 animate-in fade-in duration-150 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-xs font-bold text-amber-900">
                    Destination Folder Already Exists ({destStatus.itemCount} items found)
                  </span>
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100/90 px-2 py-0.5 rounded-md">
                  Action Required
                </span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Is folder me pehle se files maujood hain. Aap purane folder me continue karna chahte hain ya naya alag version folder banana chahte hain?
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsResumeSelected(true)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                    isResumeSelected
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                      : 'bg-white border-amber-300 text-amber-900 hover:bg-amber-100'
                  }`}
                >
                  <span>Skip Existing (Merge)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsResumeSelected(false);
                    setDestPath(destStatus.suggestedNewPath);
                  }}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <span>Create New Folder {destStatus.suggestedSuffix}</span>
                </button>
              </div>
              {isResumeSelected ? (
                <div className="text-[11px] text-emerald-700 font-semibold pt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Smart Resume Active: Jo files pehle se optimized hain unhe skip kiya jayega.</span>
                </div>
              ) : (
                <div className="text-[10px] text-amber-700 font-medium pt-0.5">
                  Tip: Agar purani files alag surakshit rakhni hain toh 'Naya Folder Banayein' select karein.
                </div>
              )}
            </div>
          )}

          {destStatus && !destStatus.exists && (
            <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1.5 pt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Clean target: Naya fresh folder banaya jayega.</span>
            </div>
          )}
        </div>

        {/* Speed & Mode Profiles */}
        <ConfigSpeedProfiles videoMode={videoMode} setVideoMode={setVideoMode} setMinVideoSizeMB={setMinVideoSizeMB} setVideoCrf={setVideoCrf} />

        {/* Photo & Video Configuration */}
        <ConfigPhotoVideoSettings
          imageFormat={imageFormat} setImageFormat={setImageFormat} imageQuality={imageQuality} setImageQuality={setImageQuality}
          resolutionCap={resolutionCap} setResolutionCap={setResolutionCap}
          videoPreset={videoPreset} setVideoPreset={setVideoPreset} setVideoCrf={setVideoCrf}
        />

        {/* PDF & Document Optimization Engine */}
        <ConfigPdfSettings optimizePdf={optimizePdf} setOptimizePdf={setOptimizePdf} />

        {/* Quality Guard */}
        <ConfigQualityGuard
          smartQualityGuard={smartQualityGuard} setSmartQualityGuard={setSmartQualityGuard}
          minImageSizeKB={minImageSizeKB} setMinImageSizeKB={setMinImageSizeKB}
          minVideoSizeMB={minVideoSizeMB} setMinVideoSizeMB={setMinVideoSizeMB}
        />

        {batchError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" /><span>{batchError}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
          <button
            type="button" onClick={onBack}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
          >
            Back to Scan
          </button>
          <button
            type="button" onClick={onStart}
            className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition cursor-pointer shadow-xs"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Batch Optimization</span>
          </button>
        </div>
      </div>
    </div>
  );
}
