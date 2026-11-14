import React from 'react';
import { Sliders, Target, FileDown, RefreshCw, Sparkles, Check } from 'lucide-react';

export default function ControlPanel({
  mode,
  setMode,
  format,
  setFormat,
  quality,
  setQuality,
  targetKB,
  setTargetKB,
  isProcessing,
  onDownload,
  onReset,
  compressedSize,
  percentageSaved,
  enhance,
  setEnhance,
  sharpen,
  setSharpen,
  hdrContrast,
  setHdrContrast,
  vibrance,
  setVibrance,
  autoLevels,
  setAutoLevels,
  upscale2x,
  setUpscale2x
}) {
  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes)) return '0 B';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const targetPresets = [
    { label: '< 200 KB', kb: 200 },
    { label: '< 500 KB', kb: 500 },
    { label: '< 1 MB', kb: 1000 },
    { label: '< 2 MB', kb: 2000 }
  ];

  return (
    <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 flex flex-col gap-4 shadow-sm select-none">
      {/* Strategy Switcher */}
      <div className="grid grid-cols-2 gap-1 p-0.5 bg-zinc-950 border border-zinc-800/80 rounded-lg text-xs">
        <button
          onClick={() => setMode('quality')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md transition ${
            mode === 'quality'
              ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Quality</span>
        </button>
        <button
          onClick={() => setMode('target')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md transition ${
            mode === 'target'
              ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Target Size</span>
        </button>
      </div>

      {/* Target Size or Quality Slider */}
      {mode === 'target' ? (
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
            File Size Cap
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {targetPresets.map((preset) => (
              <button
                key={preset.kb}
                onClick={() => setTargetKB(preset.kb)}
                className={`py-2 px-2.5 rounded-lg border text-xs font-medium transition flex items-center justify-between ${
                  targetKB === preset.kb
                    ? 'border-zinc-500 bg-zinc-800 text-zinc-100'
                    : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <span>{preset.label}</span>
                {targetKB === preset.kb && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Quality
            </label>
            <span className="font-mono text-xs font-semibold text-zinc-200 bg-zinc-800/80 border border-zinc-700 px-2 py-0.5 rounded">
              {quality}%
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1 p-0.5 bg-zinc-950 border border-zinc-800/80 rounded-lg text-xs">
            <button
              onClick={() => setQuality(88)}
              className={`py-1.2 px-1 rounded-md transition text-center ${
                quality === 88
                  ? 'bg-zinc-800 text-zinc-100 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Zero Loss (88)
            </button>
            <button
              onClick={() => setQuality(80)}
              className={`py-1.2 px-1 rounded-md transition text-center ${
                quality === 80
                  ? 'bg-zinc-800 text-zinc-100 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Balanced (80)
            </button>
            <button
              onClick={() => setQuality(65)}
              className={`py-1.2 px-1 rounded-md transition text-center ${
                quality === 65
                  ? 'bg-zinc-800 text-zinc-100 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Compact (65)
            </button>
          </div>

          <input
            type="range"
            min="30"
            max="100"
            value={quality}
            onChange={(e) => setQuality(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-200"
          />

          {enhance && quality < 80 && (
            <div className="text-[10px] text-amber-300 bg-amber-950/40 border border-amber-800/50 rounded-md px-2 py-1">
              ⚠️ Quality is at {quality}%. Compact mode compresses file size, which softens details. Use <strong>Zero Loss (88-100%)</strong> for crisp enhancement.
            </div>
          )}
        </div>
      )}

      {/* Output Format */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
          Format
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {['webp', 'jpeg', 'png'].map((fmt) => (
            <button
              key={fmt}
              onClick={() => setFormat(fmt)}
              className={`py-1.5 px-2 rounded-lg border text-xs font-medium uppercase transition text-center ${
                format === fmt
                  ? 'border-zinc-500 bg-zinc-800 text-zinc-100'
                  : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      {/* Image Enhancer Studio */}
      <div className={`flex flex-col gap-2.5 p-3 rounded-lg border transition-all ${
        enhance
          ? 'bg-emerald-950/20 border-emerald-500/40 shadow-xs'
          : 'bg-zinc-950/60 border-zinc-800/80'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className={`w-3.5 h-3.5 ${enhance ? 'text-emerald-400 animate-pulse' : 'text-zinc-400'}`} />
            <div className="flex flex-col">
              <span className={`text-xs font-semibold ${enhance ? 'text-emerald-200' : 'text-zinc-200'}`}>
                Clarity & Enhancement
              </span>
              <span className="text-[10px] text-zinc-400">
                {enhance ? 'Active (Sharpen & Dynamic Range)' : 'Enhance details, HDR & 2x upscale'}
              </span>
            </div>
          </div>

          {/* Bulletproof React Switch with explicit ON / OFF text */}
          <button
            type="button"
            role="switch"
            aria-checked={enhance}
            onClick={() => {
              const next = !enhance;
              setEnhance(next);
              if (next && quality < 85) {
                setQuality(88); // Auto-bump to zero loss so low quality compression doesn't ruin the enhancement
              }
            }}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase transition border cursor-pointer ${
              enhance
                ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>{enhance ? 'ON' : 'OFF'}</span>
            <div className={`w-6 h-3.5 rounded-full p-0.5 transition-colors ${enhance ? 'bg-emerald-500' : 'bg-zinc-600'}`}>
              <div className={`w-2.5 h-2.5 rounded-full bg-white shadow-xs transition-transform ${enhance ? 'translate-x-2.5' : 'translate-x-0'}`} />
            </div>
          </button>
        </div>

        {enhance && (
          <div className="flex flex-col gap-2.5 pt-2 border-t border-emerald-500/20 animate-in fade-in duration-150">
            {/* Sharpening */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] text-zinc-300">
                <span>Micro-Sharpening</span>
                <span className="font-mono text-emerald-400 uppercase font-semibold text-[10px]">{sharpen}</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {['none', 'light', 'medium', 'ultra'].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSharpen(lvl)}
                    className={`py-1 text-[10px] font-medium uppercase rounded border transition ${
                      sharpen === lvl
                        ? 'border-emerald-500 bg-emerald-950/60 text-emerald-200 font-semibold'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Studio Toggles */}
            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setHdrContrast(!hdrContrast)}
                className={`py-1.5 px-1 rounded border text-[10px] font-medium transition text-center ${
                  hdrContrast
                    ? 'border-emerald-500 bg-emerald-950/60 text-emerald-200 font-semibold'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                }`}
                title="Adaptive Histogram Equalization for shadows and highlights"
              >
                HDR Tone {hdrContrast && '✓'}
              </button>

              <button
                type="button"
                onClick={() => setVibrance(!vibrance)}
                className={`py-1.5 px-1 rounded border text-[10px] font-medium transition text-center ${
                  vibrance
                    ? 'border-emerald-500 bg-emerald-950/60 text-emerald-200 font-semibold'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                }`}
                title="Vivid colors and saturation boost"
              >
                Color Pop {vibrance && '✓'}
              </button>

              <button
                type="button"
                onClick={() => setUpscale2x(!upscale2x)}
                className={`py-1.5 px-1 rounded border text-[10px] font-medium transition text-center ${
                  upscale2x
                    ? 'border-emerald-500 bg-emerald-950/60 text-emerald-200 font-semibold shadow-xs'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                }`}
                title="Lanczos3 2x Super-Resolution Upscaling (doubles pixel dimensions)"
              >
                2x HD {upscale2x && '✓'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Output Stats Row */}
      <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs font-mono">
        <div>
          <span className="text-[10px] uppercase text-zinc-500 block">Output Size</span>
          <span className="text-zinc-200 font-bold">
            {isProcessing ? 'Encoding...' : formatBytes(compressedSize)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase text-zinc-500 block">
            {percentageSaved > 0 ? 'Reduction' : 'Resolution'}
          </span>
          <span className={`font-bold ${percentageSaved > 0 ? 'text-emerald-400' : 'text-cyan-400'}`}>
            {isProcessing ? '--' : percentageSaved > 0 ? `-${percentageSaved}%` : (upscale2x ? '2x HD Boost' : '100% Fidelity')}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1.5 pt-1">
        <button
          onClick={onDownload}
          disabled={isProcessing || !compressedSize}
          className="w-full py-2.5 px-3 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <FileDown className="w-3.5 h-3.5" />
              Download Image
            </>
          )}
        </button>

        <button
          onClick={onReset}
          className="w-full py-1.5 px-2 rounded-md text-[11px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 transition flex items-center justify-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          Choose another image
        </button>
      </div>
    </div>
  );
}
