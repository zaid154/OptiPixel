import React, { useState, useRef, useEffect } from 'react';
import ComparisonHeaderBar from './ComparisonHeaderBar';

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
      setAspectRatio(e.target.naturalWidth / e.target.naturalHeight);
    }
  };

  const handleMove = (clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos(Math.max(0, Math.min(100, (x / rect.width) * 100)));
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
      <ComparisonHeaderBar
        percentageSaved={percentageSaved}
        enhance={enhance}
        upscale2x={upscale2x}
        zoom={zoom}
        setZoom={setZoom}
      />

      <div className="flex justify-center items-center w-full bg-slate-100 rounded-2xl p-2 border border-slate-200 shadow-xs">
        <div
          ref={containerRef}
          onMouseMove={(e) => isDragging && handleMove(e.clientX)}
          onTouchMove={(e) => isDragging && e.touches[0] && handleMove(e.touches[0].clientX)}
          onMouseDown={() => setIsDragging(true)}
          onTouchStart={() => setIsDragging(true)}
          style={{
            aspectRatio: aspectRatio ? `${aspectRatio}` : 'auto',
            maxHeight: '520px',
            maxWidth: '100%'
          }}
          className="relative h-[440px] sm:h-[500px] rounded-xl overflow-hidden cursor-ew-resize select-none border border-slate-300 shadow-sm group bg-white"
        >
          {/* Compressed Image (Background / Right Layer) */}
          <div
            className="absolute inset-0 flex items-center justify-center overflow-hidden"
            style={{ transform: `scale(${zoom})`, transformOrigin: `${sliderPos}% 50%` }}
          >
            <img src={compressedUrl} alt="Optimized" onLoad={handleImageLoad} className="w-full h-full object-cover pointer-events-none" />
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
            <img src={originalUrl} alt="Original" onLoad={handleImageLoad} className="w-full h-full object-cover pointer-events-none" />
          </div>

          {/* Vertical Divider Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)] pointer-events-none"
            style={{ left: `${sliderPos}%` }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white border-2 border-emerald-600 flex items-center justify-center shadow-lg text-emerald-600 font-black text-xs">
              ↔
            </div>
          </div>

          {/* Left Badge: Original */}
          <div className="absolute top-3 left-3 pointer-events-none">
            <div className="px-2.5 py-1 rounded-lg bg-white/95 border border-slate-200 text-xs font-medium text-slate-800 flex flex-col shadow-xs">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Original</span>
              <span className="font-bold text-xs">{formatBytes(originalSize)}</span>
            </div>
          </div>

          {/* Right Badge: Optimized */}
          <div className="absolute top-3 right-3 pointer-events-none">
            <div className="px-2.5 py-1 rounded-lg bg-emerald-600 border border-emerald-500 text-white text-xs font-medium flex flex-col items-end shadow-xs">
              <span className="text-[9px] uppercase tracking-wider text-emerald-100 flex items-center gap-1 font-bold">
                {enhance ? '✨ Enhanced' : 'Optimized'} {upscale2x ? '(2x HD)' : ''}
              </span>
              <span className="font-bold text-xs">{formatBytes(compressedSize)}</span>
            </div>
          </div>

          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-white/90 text-[10px] text-slate-500 border border-slate-200 opacity-80 group-hover:opacity-100 transition pointer-events-none shadow-2xs font-medium">
            Drag slider left or right to inspect
          </div>
        </div>
      </div>
    </div>
  );
}
