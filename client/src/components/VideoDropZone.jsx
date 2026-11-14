import React, { useState, useRef } from 'react';
import { Film } from 'lucide-react';

export default function VideoDropZone({ onVideoSelected, onError }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const validateAndSelect = (file) => {
    if (!file) return;

    const allowedExtensions = /\.(mp4|mkv|mov|webm|avi|ts|3gp|flv|wmv|m4v)$/i;
    if (!allowedExtensions.test(file.name) && !file.type.startsWith('video/')) {
      onError?.('Please select a valid video file (MP4, MKV, MOV, WEBM, TS, AVI).');
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      onError?.('File exceeds the 500 MB limit. Please select a smaller video.');
      return;
    }

    onVideoSelected(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelect(e.target.files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`relative w-full border border-dashed rounded-xl p-10 sm:p-14 text-center cursor-pointer transition-all duration-150 select-none ${
        isDragOver
          ? 'border-zinc-400 bg-zinc-900/90 shadow-sm'
          : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/60'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/x-matroska,video/quicktime,video/webm,video/x-msvideo,video/mp2t"
        onChange={handleFileInput}
        className="hidden"
      />

      <div className="flex flex-col items-center gap-2.5 max-w-sm mx-auto">
        <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
          <Film className="w-5 h-5 text-zinc-300" />
        </div>

        <div className="mt-1">
          <h3 className="text-sm font-medium text-zinc-200">
            Drop a video here, or browse
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Supports MP4, MOV, MKV, WEBM, TS up to 500 MB
          </p>
        </div>

        <div className="mt-2 text-[11px] text-zinc-500 font-mono">
          H.264 / HEVC video optimization
        </div>
      </div>
    </div>
  );
}
