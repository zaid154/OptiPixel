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

    if (file.size > 10 * 1024 * 1024 * 1024) {
      onError?.('File exceeds the 10 GB limit. Please select a smaller video.');
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
      className={`relative w-full border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 select-none shadow-xs ${
        isDragOver
          ? 'border-emerald-500 bg-emerald-50/80 shadow-md scale-[1.01]'
          : 'border-slate-300 hover:border-emerald-400 bg-white hover:bg-emerald-50/30'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/x-matroska,video/quicktime,video/webm,video/x-msvideo,video/mp2t"
        onChange={handleFileInput}
        className="hidden"
      />

      <div className="flex flex-col items-center gap-3 max-w-sm mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs group-hover:scale-105 transition">
          <Film className="w-7 h-7 text-emerald-600" />
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-800">
            Drop a video here, or browse
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Supports MP4, MOV, MKV, WEBM, TS up to 10 GB
          </p>
        </div>

        <button
          type="button"
          className="mt-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition inline-flex items-center gap-1.5"
        >
          Choose Video
        </button>

        <div className="flex items-center gap-1.5 pt-1">
          {['MP4', 'MOV', 'MKV', 'WEBM'].map((fmt) => (
            <span key={fmt} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[10px] border border-slate-200/80 font-medium">
              {fmt}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
