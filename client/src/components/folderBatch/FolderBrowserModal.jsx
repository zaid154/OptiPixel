import React from 'react';
import { Folder, HardDrive, ArrowRight, RefreshCw, ChevronRight, X } from 'lucide-react';

export default function FolderBrowserModal({
  isOpen,
  onClose,
  browserMode,
  browserCurrentPath,
  browserEntries,
  browserLoading,
  loadBrowsePath,
  onSelectFolder
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Folder className="w-4 h-4 text-emerald-600" />
              Select {browserMode === 'source' ? 'Source' : 'Destination'} Folder
            </h3>
            <div className="text-[11px] font-mono text-slate-500 truncate max-w-md mt-0.5">
              {browserCurrentPath || 'Select a drive to start'}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg text-sm cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Entries List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {browserCurrentPath && (
            <button
              type="button"
              onClick={() => {
                const parent = browserCurrentPath.split(/[\\/]/).slice(0, -1).join('\\');
                loadBrowsePath(parent || '');
              }}
              className="w-full p-2 rounded-lg hover:bg-slate-100 text-left text-xs text-slate-600 flex items-center gap-2 cursor-pointer transition font-mono font-medium"
            >
              <ArrowRight className="w-3.5 h-3.5 rotate-180 text-slate-400" />
              <span>.. (Up one level)</span>
            </button>
          )}

          {browserLoading ? (
            <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Loading directory...</span>
            </div>
          ) : browserEntries.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No accessible sub-folders found in this directory.
            </div>
          ) : (
            browserEntries.map((entry) => (
              <button
                key={entry.path}
                type="button"
                onClick={() => loadBrowsePath(entry.path)}
                className="w-full p-2.5 rounded-lg hover:bg-emerald-50/60 text-left text-xs text-slate-700 hover:text-emerald-900 flex items-center justify-between cursor-pointer transition"
              >
                <div className="flex items-center gap-2.5 truncate">
                  {entry.isDrive ? (
                    <HardDrive className="w-4 h-4 text-blue-600 shrink-0" />
                  ) : (
                    <Folder className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <span className="truncate font-medium">{entry.name}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 truncate max-w-xs font-mono">
            {browserCurrentPath}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSelectFolder}
              disabled={!browserCurrentPath}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition cursor-pointer shadow-xs"
            >
              Select This Folder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
