import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, CheckCircle2, FolderTree, AlertTriangle } from 'lucide-react';
import DropZone from '../components/DropZone';

export default function BatchArchivePage({ showToast }) {
  const navigate = useNavigate();
  const [batchFiles, setBatchFiles] = useState([]);
  const [batchFormat, setBatchFormat] = useState('webp');
  const [batchQuality, setBatchQuality] = useState(88);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchDone, setBatchDone] = useState(false);

  const handleFilesSelected = (files) => {
    if (!files || files.length === 0) return;
    if (files.length > 100) {
      setBatchFiles(files.slice(0, 100));
      if (showToast) {
        showToast('First 100 photos staged. For unlimited local folders (10,000+ files), use Folder Batch!', 'warning');
      }
    } else {
      setBatchFiles(files);
    }
  };

  const handleBatchCompress = async () => {
    if (batchFiles.length === 0) return;
    setBatchProcessing(true);
    setBatchDone(false);

    try {
      const formData = new FormData();
      batchFiles.forEach((file) => formData.append('images', file));
      formData.append('format', batchFormat);
      formData.append('quality', batchQuality);

      const res = await fetch('/api/compress/batch', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        let errMsg = 'Batch compression failed';
        try {
          const errData = await res.json();
          if (errData && errData.error) errMsg = errData.error;
        } catch {}
        throw new Error(errMsg);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `optipixel_batch_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);

      setBatchDone(true);
      if (showToast) showToast('Batch archive downloaded', 'success');
    } catch (err) {
      console.error(err);
      if (showToast) showToast(err.message || 'Batch compression failed.', 'error');
    } finally {
      setBatchProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl w-full mx-auto flex flex-col gap-4 animate-in fade-in duration-150 mt-2">
      {/* Enterprise Pro-Tip Card for Large Libraries */}
      <div className="p-3 px-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-emerald-900">
          <FolderTree className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Have full folders with thousands of photos & videos? Use <strong>Folder Batch</strong> for zero browser memory limits.</span>
        </div>
        <button
          type="button"
          onClick={() => navigate('/folder-batch')}
          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline shrink-0 cursor-pointer ml-3"
        >
          Open Folder Batch &rarr;
        </button>
      </div>

      <DropZone onFilesSelected={handleFilesSelected} isBatch={true} />

      {batchFiles.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col gap-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                {batchFiles.length} files staged for batch archive
              </h3>
              <p className="text-xs font-mono text-slate-500 mt-0.5">
                Total Size: {(batchFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBatchFiles([])}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1.5 font-semibold">
                Target Format
              </label>
              <select
                value={batchFormat}
                onChange={(e) => setBatchFormat(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 uppercase outline-none focus:border-emerald-500 font-semibold"
              >
                <option value="webp">WebP (Recommended)</option>
                <option value="jpeg">JPEG (Universal)</option>
                <option value="png">PNG (Lossless)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] uppercase font-mono text-slate-500 font-semibold">
                  Quality
                </label>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {batchQuality}%
                </span>
              </div>
              <input
                type="range"
                min="40"
                max="100"
                value={batchQuality}
                onChange={(e) => setBatchQuality(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 mt-2"
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto flex flex-col gap-1 pr-1 border-t border-slate-100 pt-3 custom-scrollbar">
            {batchFiles.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-50 border border-slate-200/80"
              >
                <span className="truncate max-w-[320px] text-slate-700 font-mono text-[11px] font-medium">
                  {f.name}
                </span>
                <span className="font-mono text-slate-500 text-[11px] font-semibold">
                  {(f.size / 1024).toFixed(1)} KB
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleBatchCompress}
            disabled={batchProcessing}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
          >
            {batchProcessing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Compressing & Archiving...</span>
              </>
            ) : batchDone ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Downloaded Archive (.zip)</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Compress All & Download (.zip)</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
