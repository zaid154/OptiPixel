import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function StopConfirmModal({ isOpen, onClose, onConfirm, percent = 0 }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 text-slate-800">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Stop Duplicate Scan?</h3>
              <p className="text-xs text-slate-500 mt-0.5">Scan is currently {percent}% complete</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
          Stopping now will immediately halt file analysis and hashing. Discovered duplicate groups so far will be saved. Are you sure you want to stop?
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            Continue Scanning
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition shadow-xs flex items-center gap-1.5"
          >
            Yes, Stop Scan
          </button>
        </div>
      </div>
    </div>
  );
}
