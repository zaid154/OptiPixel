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
      className={`relative w-full border border-dashed rounded-xl p-10 sm:p-14 text-center cursor-pointer transition-all duration-150 select-none ${
        isDragOver
          ? 'border-zinc-400 bg-zinc-900/90 shadow-sm'
          : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/60'
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

      <div className="flex flex-col items-center gap-2.5 max-w-sm mx-auto">
        <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
          {isBatch ? (
            <FolderArchive className="w-5 h-5 text-zinc-300" />
          ) : (
            <UploadCloud className="w-5 h-5 text-zinc-300" />
          )}
        </div>

        <div className="mt-1">
          <h3 className="text-sm font-medium text-zinc-200">
            {isBatch ? 'Drop multiple photos for batch archive' : 'Drop an image here, or browse'}
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Supports JPEG, PNG, WebP, AVIF, TIFF up to 50 MB
          </p>
        </div>

        {!isBatch && (
          <div className="mt-2 text-[11px] text-zinc-600 font-mono">
            or press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px]">V</kbd> to paste
          </div>
        )}
      </div>
    </div>
  );
}
