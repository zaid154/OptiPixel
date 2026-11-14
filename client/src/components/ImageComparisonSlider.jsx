import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Sparkles } from 'lucide-react';

export default function ImageComparisonSlider({
  originalUrl,
  compressedUrl,
  originalSize,
  compressedSize,
  percentageSaved,
  enhance = false,
  upscale2x = false
}) {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [aspectRatio, setAspectRatio] = useState(null);
  const containerRef = useRef(null);

  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes)) return '0 B';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const handleImageLoad = (e) => {
    if (e.target.naturalWidth && e.target.naturalHeight) {
      const ratio = e.target.naturalWidth / e.target.naturalHeight;
      setAspectRatio(ratio);
    }
  };

  const handleMove = (clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percent);
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const onTouchMove = (e) => {
    if (!isDragging || !e.touches[0]) return;
    handleMove(e.touches[0].clientX);
  };

  useEffect(() => {
    const stopDrag = () => setIsDragging(false);
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('touchend', stopDrag);
    return () => {
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('touchend', stopDrag);
    };
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* Top Banner Stats */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Interactive Split Inspection
          </span>
          {percentageSaved > 0 ? (
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              -{percentageSaved}% Saved
            </span>
          ) : (
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              {upscale2x ? '2x HD Resolution (+Pixels)' : 'High-Fidelity Output'}
            </span>
          )}
          {enhance && (
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
              Enhance Mode
            </span>
          )}
        </div>

        {/* Zoom Toggles */}
        <div className="flex items-center gap-1 bg-slate-900 border border-white/[0.08] rounded-lg p-0.5 text-xs">
          <button
            onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
            className="p-1 hover:text-white text-slate-400 transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="px-2 font-mono text-[11px] text-slate-300">{zoom}x</span>
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.5))}
            className="p-1 hover:text-white text-slate-400 transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Centered Canvas Wrapper to shrink-wrap any image aspect ratio (portrait or landscape) */}
      <div className="flex justify-center items-center w-full bg-slate-950/40 rounded-2xl p-2 border border-white/[0.08] shadow-2xl">
        <div
          ref={containerRef}
          onMouseMove={onMouseMove}
          onTouchMove={onTouchMove}
          onMouseDown={() => setIsDragging(true)}
          onTouchStart={() => setIsDragging(true)}
          style={{
            aspectRatio: aspectRatio ? `${aspectRatio}` : 'auto',
            maxHeight: '520px',
            maxWidth: '100%'
          }}
          className="relative h-[440px] sm:h-[500px] rounded-xl overflow-hidden cursor-ew-resize select-none border border-white/10 shadow-lg group"
        >
          {/* Compressed Image (Background / Right Layer) */}
          <div
            className="absolute inset-0 flex items-center justify-center overflow-hidden"
            style={{ transform: `scale(${zoom})`, transformOrigin: `${sliderPos}% 50%` }}
          >
            <img
              src={compressedUrl}
              alt="Optimized"
              onLoad={handleImageLoad}
              className="w-full h-full object-cover pointer-events-none"
            />
          </div>

          {/* Original Image (Clipped / Left Layer) */}
          <div
            className="absolute inset-0 flex items-center justify-center overflow-hidden"
            style={{
              clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`,
              transform: `scale(${zoom})`,
              transformOrigin: `${sliderPos}% 50%`
            }}
          >
            <img
              src={originalUrl}
              alt="Original"
              onLoad={handleImageLoad}
              className="w-full h-full object-cover pointer-events-none"
            />
          </div>

          {/* Vertical Divider Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_12px_rgba(255,255,255,0.7)] pointer-events-none"
            style={{ left: `${sliderPos}%` }}
          >
            {/* Circular Drag Handle */}
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center shadow-lg text-white">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M8 9l-3 3 3 3m8-6l3 3-3 3"
                />
              </svg>
            </div>
          </div>

          {/* Left Badge: Original */}
          <div className="absolute top-3 left-3 pointer-events-none">
            <div className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-xs font-medium text-slate-200 flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-slate-400">Original</span>
              <span className="font-semibold text-xs">{formatBytes(originalSize)}</span>
            </div>
          </div>

          {/* Right Badge: Optimized / Enhanced */}
          <div className="absolute top-3 right-3 pointer-events-none">
            <div className={`px-2.5 py-1 rounded-lg backdrop-blur-md border text-xs font-medium flex flex-col items-end ${
              enhance
                ? 'bg-emerald-950/90 border-emerald-400/40 text-emerald-200 shadow-md'
                : 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200'
            }`}>
              <span className="text-[9px] uppercase tracking-wider text-emerald-400 flex items-center gap-1 font-semibold">
                {enhance ? '✨ Enhanced' : 'Optimized'} {upscale2x ? '(2x HD)' : ''}
              </span>
              <span className="font-semibold text-emerald-300 text-xs">{formatBytes(compressedSize)}</span>
            </div>
          </div>

          {/* Drag Hint */}
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-slate-400 border border-white/5 opacity-70 group-hover:opacity-100 transition pointer-events-none">
            Drag slider left or right
          </div>
        </div>
      </div>
    </div>
  );
}
