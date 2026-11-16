import React, { useState } from 'react';
import { Folder, Sparkles, ShieldCheck, ArrowRight, X } from 'lucide-react';

export default function FolderPriorityModal({
  isOpen,
  onClose,
  defaultFolder = '',
  onPreview,
  onApplySelection,
}) {
  const [folderPath, setFolderPath] = useState(defaultFolder);
  const [options, setOptions] = useState({
    upgradeQuality: true,
    rescueMissing: true,
    cleanExternalDuplicates: true,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200/90 shadow-xl overflow-hidden text-slate-800">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Master Folder Priority</h3>
              <p className="text-xs text-slate-500">Consolidate scattered duplicates into a designated target directory</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Designated Master / Target Folder
            </label>
            <div className="relative">
              <Folder className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="e.g. D:\Zaid\Memories_Optimized\College\Trip..."
                className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-800"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Photos inside this folder will be kept as primary originals.
            </p>
          </div>

          {/* Consolidation Options */}
          <div className="space-y-2.5 pt-1">
            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={options.upgradeQuality}
                onChange={(e) => setOptions({ ...options, upgradeQuality: e.target.checked })}
                className="mt-0.5 rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Quality Upgrade</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  If another folder holds a higher-resolution copy, move and upgrade it to master.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={options.rescueMissing}
                onChange={(e) => setOptions({ ...options, rescueMissing: e.target.checked })}
                className="mt-0.5 rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Rescue Missing Event Photos</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  If a photo is missing entirely from master folder, rescue and move it into master.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={options.cleanExternalDuplicates}
                onChange={(e) => setOptions({ ...options, cleanExternalDuplicates: e.target.checked })}
                className="mt-0.5 rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <div className="text-xs font-semibold text-slate-800">
                  Clean Redundant Copies From Other Folders
                </div>
                <p className="text-[11px] text-slate-500">
                  Mark duplicates in external folders (WhatsApp, Downloads) for safe quarantine.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            onClick={() => onApplySelection(folderPath, options)}
            disabled={!folderPath}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200/60 disabled:opacity-40 transition"
          >
            Apply To Selection Only
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-200/60 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => onPreview(folderPath, options)}
              disabled={!folderPath}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold transition shadow-xs"
            >
              <span>Preview Plan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
