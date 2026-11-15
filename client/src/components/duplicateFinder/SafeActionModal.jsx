import React, { useState } from 'react';
import { X, ShieldAlert, Archive, Trash2, AlertTriangle } from 'lucide-react';

export default function SafeActionModal({
  selectedCount,
  selectedBytes,
  onConfirm,
  onClose
}) {
  const [mode, setMode] = useState('quarantine');
  const [confirmText, setConfirmText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleExecute = async () => {
    if (mode === 'permanent' && confirmText !== 'DELETE') return;
    setIsSubmitting(true);
    await onConfirm(mode);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl text-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800">Safe Deletion Confirmation</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>

        <p className="text-xs text-slate-600">
          You are about to process <span className="text-slate-900 font-bold">{selectedCount} files</span>, freeing approximately{' '}
          <span className="text-emerald-700 font-bold">{formatBytes(selectedBytes)}</span> of disk space.
        </p>

        {/* Action Mode Radio Cards */}
        <div className="space-y-2">
          <label
            onClick={() => setMode('quarantine')}
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
              mode === 'quarantine' ? 'bg-emerald-50 border-emerald-500 shadow-2xs' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}
          >
            <Archive className="w-4 h-4 text-emerald-600 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-slate-800 block">Move to Quarantine Folder (Recommended)</span>
              <span className="text-[11px] text-slate-500">Moves copies to <code>_Duplicates_Quarantine/</code> with 1-click restore capability.</span>
            </div>
          </label>

          <label
            onClick={() => setMode('trash')}
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
              mode === 'trash' ? 'bg-emerald-50 border-emerald-500 shadow-2xs' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}
          >
            <Trash2 className="w-4 h-4 text-emerald-600 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-slate-800 block">Move to Windows Recycle Bin</span>
              <span className="text-[11px] text-slate-500">Sends duplicates to Windows OS Trash. Files can be restored manually from desktop.</span>
            </div>
          </label>

          <label
            onClick={() => setMode('permanent')}
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
              mode === 'permanent' ? 'bg-rose-50 border-rose-400 shadow-2xs' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-rose-700 block">Permanent File Deletion</span>
              <span className="text-[11px] text-slate-500">Immediately unlinks files from filesystem. Cannot be recovered.</span>
            </div>
          </label>
        </div>

        {mode === 'permanent' && (
          <div className="pt-2">
            <span className="text-[11px] text-rose-600 font-semibold block mb-1">Type <strong>DELETE</strong> below to confirm permanent deletion:</span>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full bg-white border border-rose-300 rounded-lg px-3 py-1.5 text-xs text-rose-900 font-mono focus:outline-none focus:border-rose-500"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold">Cancel</button>
          <button
            onClick={handleExecute}
            disabled={isSubmitting || (mode === 'permanent' && confirmText !== 'DELETE')}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-bold transition shadow-sm"
          >
            {isSubmitting ? 'Executing...' : 'Confirm & Proceed'}
          </button>
        </div>
      </div>
    </div>
  );
}
