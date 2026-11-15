import React, { useState, useRef } from 'react';
import { UploadCloud, FolderArchive } from 'lucide-react';

export default function DropZone({ onFilesSelected, isBatch = false }) {
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

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
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
        multiple={isBatch}
        accept="image/jpeg,image/png,image/webp,image/avif,image/tiff"
        onChange={handleFileInput}
        className="hidden"
      />

      <div className="flex flex-col items-center gap-3 max-w-sm mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs group-hover:scale-105 transition">
          {isBatch ? (
            <FolderArchive className="w-7 h-7 text-emerald-600" />
          ) : (
            <UploadCloud className="w-7 h-7 text-emerald-600" />
          )}
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-800">
            {isBatch ? 'Drop multiple photos for batch archive' : 'Drop an image here, or browse'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Supports JPEG, PNG, WebP, AVIF, TIFF up to 50 MB
          </p>
        </div>

        <button
          type="button"
          className="mt-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition inline-flex items-center gap-1.5"
        >
          {isBatch ? 'Select Batch Images' : 'Choose Image'}
        </button>

        {!isBatch && (
          <div className="mt-1 text-[11px] text-slate-500 font-mono">
            or press <kbd className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-slate-700 text-[10px] font-bold shadow-2xs">Ctrl</kbd> + <kbd className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-slate-700 text-[10px] font-bold shadow-2xs">V</kbd> to paste
          </div>
        )}

        <div className="flex items-center gap-1.5 pt-1">
          {['JPEG', 'PNG', 'WEBP', 'AVIF'].map((fmt) => (
            <span key={fmt} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[10px] border border-slate-200/80 font-medium">
              {fmt}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
