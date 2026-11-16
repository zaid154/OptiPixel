import React, { useState } from 'react';
import { Folder, Sparkles, ShieldCheck, ArrowRight, X, ListFilter } from 'lucide-react';

export default function FolderPriorityModal({
  isOpen,
  onClose,
  defaultFolder = '',
  subfolders = [],
  targetGroupsCount = 0,
  onPreview,
  onApplySelection,
}) {
  const [folderPath, setFolderPath] = useState(defaultFolder);
  const [useFilteredOnly, setUseFilteredOnly] = useState(true);
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
              <p className="text-xs text-slate-500">Pick an event folder to consolidate copies into</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Target Folder Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Designated Master / Event Target Folder
            </label>
            <div className="relative">
              <Folder className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="e.g. D:\...\College 6th Sem\Farewell"
                className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-800"
              />
            </div>

            {/* Event Subfolder Quick Dropdown */}
            {subfolders.length > 0 && (
              <div className="mt-2.5">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Or select a discovered event subfolder:
                </span>
                <select
                  onChange={(e) => e.target.value && setFolderPath(e.target.value)}
                  value={subfolders.includes(folderPath) ? folderPath : ''}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">-- Choose Event Folder --</option>
                  {subfolders.map((sf) => (
                    <option key={sf} value={sf}>
                      📁 {sf.split(/[\\/]/).slice(-2).join(' / ')}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Scope Selection: Current Filter vs All */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <ListFilter className="w-4 h-4 text-emerald-600" />
              <span>Target Scope:</span>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={useFilteredOnly}
                onChange={(e) => setUseFilteredOnly(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Current visible view only ({targetGroupsCount} groups)</span>
            </label>
          </div>

          {/* Consolidation Options */}
          <div className="space-y-2.5">
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
                  If another folder holds a higher-res copy, move & replace the master copy.
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
                  If a photo is missing from master folder, rescue and move it in.
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
                  Mark duplicates in external folders (WhatsApp, Downloads) for quarantine.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            onClick={() => onApplySelection(folderPath, options, useFilteredOnly)}
            disabled={!folderPath}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200/60 disabled:opacity-40 transition"
          >
            Apply To Selection
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-200/60 transition">
              Cancel
            </button>
            <button
              onClick={() => onPreview(folderPath, options, useFilteredOnly)}
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
