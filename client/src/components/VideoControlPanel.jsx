import React from 'react';
import { Sparkles, Target, Zap, FileDown, RefreshCw, Film } from 'lucide-react';
import VideoPresetSelector, { friendlyPresets } from './video/control/VideoPresetSelector';
import VideoTargetSizeSlider from './video/control/VideoTargetSizeSlider';
import VideoVerificationReport from './video/control/VideoVerificationReport';
import VideoAdvancedSettings from './video/control/VideoAdvancedSettings';

export default function VideoControlPanel({
  mode,
  setMode,
  preset,
  setPreset,
  targetMB,
  setTargetMB,
  crf,
  setCrf,
  codec,
  setCodec,
  resolution,
  setResolution,
  mute,
  setMute,
  isProcessing,
  progress = 0,
  fps = 0,
  speed = '1x',
  timeRemainingSec = 0,
  originalSizeMB = 0,
  onStartCompress,
  onDownload,
  onReset,
  compressedSizeMB,
  percentageSaved,
  hasResult,
  verification
}) {
  const origMB = parseFloat(originalSizeMB) || 10;
  const currentPresetObj = friendlyPresets.find((p) => p.id === preset) || friendlyPresets[0];
  const estOutputMB = mode === 'target'
    ? Math.min(targetMB, origMB)
    : (origMB * currentPresetObj.ratio).toFixed(1);
  const estSavingsPercent = Math.max(10, Math.min(90, Math.round(((origMB - estOutputMB) / origMB) * 100)));

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex flex-col gap-3 shadow-sm select-none">
      {/* Strategy Switcher */}
      <div className="grid grid-cols-2 gap-1 p-0.5 bg-zinc-950 border border-zinc-800/80 rounded-lg text-xs">
        <button
          type="button"
          onClick={() => setMode('preset')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition font-medium ${
            mode === 'preset' ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Presets</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('target')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition font-medium ${
            mode === 'target' ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Target className="w-3.5 h-3.5 text-cyan-400" />
          <span>Target Size</span>
        </button>
      </div>

      {mode === 'preset' ? (
        <VideoPresetSelector
          preset={preset}
          setPreset={setPreset}
          origMB={origMB}
          isProcessing={isProcessing}
          hasResult={hasResult}
          onStartCompress={onStartCompress}
        />
      ) : (
        <VideoTargetSizeSlider
          targetMB={targetMB}
          setTargetMB={setTargetMB}
          origMB={origMB}
        />
      )}

      {/* Live Estimation or Real Result */}
      <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
        <div>
          <span className="text-[10px] uppercase text-zinc-500 block font-mono">
            {hasResult ? 'Final Size' : 'Original ➔ Estimated'}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {hasResult ? (
              <span className="text-zinc-100 font-bold text-sm">{compressedSizeMB} MB</span>
            ) : (
              <>
                <span className="text-zinc-400 font-semibold">{origMB.toFixed(1)} MB</span>
                <span className="text-zinc-600">➔</span>
                <span className="text-emerald-300 font-bold">~{estOutputMB} MB</span>
              </>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase text-zinc-500 block font-mono">
            {hasResult ? 'Actual Reduction' : 'Savings'}
          </span>
          <span className="text-emerald-400 font-bold text-sm">
            {hasResult ? `-${percentageSaved}%` : `~${estSavingsPercent}% Saved`}
          </span>
        </div>
      </div>

      {/* Progress Bar (While Encoding) */}
      {isProcessing && (
        <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              Hardware Accelerated
            </span>
            <span className="font-mono text-emerald-400 font-bold">{progress}%</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(5, progress)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
            <span>Speed: {speed}</span>
            <span>FPS: {fps}</span>
            {timeRemainingSec > 0 && <span>ETA: ~{timeRemainingSec}s</span>}
          </div>
        </div>
      )}

      {hasResult && <VideoVerificationReport verification={verification} />}

      {/* Actions */}
      <div className="flex flex-col gap-1.5">
        {hasResult ? (
          <button
            type="button"
            onClick={onDownload}
            className="w-full py-2.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            Download Compressed Video
          </button>
        ) : (
          <button
            type="button"
            onClick={onStartCompress}
            disabled={isProcessing}
            className="w-full py-2.5 px-3 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md cursor-pointer"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-zinc-900" />
                Encoding ({progress}%)...
              </>
            ) : (
              <>
                <Film className="w-4 h-4" />
                Compress Video Now
              </>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onReset}
          className="w-full py-1 px-2 rounded text-[11px] text-zinc-500 hover:text-zinc-300 transition flex items-center justify-center gap-1 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          Choose another video
        </button>
      </div>

      <VideoAdvancedSettings
        resolution={resolution}
        setResolution={setResolution}
        codec={codec}
        setCodec={setCodec}
        mute={mute}
        setMute={setMute}
      />
    </div>
  );
}
