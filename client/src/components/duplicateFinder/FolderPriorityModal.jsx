import React, { useState, useMemo } from 'react';
import { Folder, Sparkles, ShieldCheck, ArrowRight, X, ListFilter, Layers, Search, CheckCircle2 } from 'lucide-react';

export default function FolderPriorityModal({
  isOpen,
  onClose,
  defaultFolder = '',
  subfolders = [],
  targetGroupsCount = 0,
  onPreview,
  onPreviewAutoAll,
  onApplySelection,
}) {
  const [folderPath, setFolderPath] = useState(defaultFolder);
  const [searchQuery, setSearchQuery] = useState('');
  const [useFilteredOnly, setUseFilteredOnly] = useState(true);
  const [options, setOptions] = useState({
    upgradeQuality: true,
    rescueMissing: true,
    cleanExternalDuplicates: true,
  });

  const filteredSubfolders = useMemo(() => {
    if (!searchQuery.trim()) return subfolders;
    const q = searchQuery.toLowerCase();
    return subfolders.filter((sf) => sf.toLowerCase().includes(q));
  }, [subfolders, searchQuery]);

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
              <p className="text-xs text-slate-500">Consolidate copies into single or all event folders</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* 1-Click Auto All Events Card */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/90 flex items-center justify-between gap-3 shadow-2xs">
            <div>
              <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                <span>Auto-Consolidate All Events (1-Click)</span>
              </div>
              <p className="text-[11px] text-emerald-700/90 mt-0.5 leading-snug">
                Auto-routes scattered WhatsApp/transit copies to their respective event folders.
              </p>
            </div>
            <button
              onClick={() => onPreviewAutoAll(useFilteredOnly)}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 shadow-xs transition"
            >
              Run All
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider absolute">
              Or Choose Single Event
            </span>
          </div>

          {/* Target Folder Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Specific Event Target Folder
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

            {/* Event Subfolder Searchable List */}
            {subfolders.length > 0 && (
              <div className="mt-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                  <span>Discovered Event Subfolders ({filteredSubfolders.length}):</span>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-emerald-600 hover:underline cursor-pointer"
                    >
                      Clear Search
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search event folder (e.g. FEA, College, Mehndi)..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 rounded-lg border border-slate-200 p-1 bg-slate-50/50">
                  {filteredSubfolders.map((sf) => {
                    const isSelected = folderPath.toLowerCase() === sf.toLowerCase();
                    const segments = sf.split(/[/\\]/);
                    const label = segments.slice(-2).join(' / ');
                    return (
                      <button
                        key={sf}
                        type="button"
                        onClick={() => setFolderPath(sf)}
                        className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-mono flex items-center justify-between transition cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span className="truncate flex items-center gap-1.5" title={sf}>
                          <Folder className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />
                          <span className="truncate">{label}</span>
                        </span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                  {filteredSubfolders.length === 0 && (
                    <div className="p-3 text-center text-xs text-slate-400">
                      No matching event folder found
                    </div>
                  )}
                </div>
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
              <span>Visible view only ({targetGroupsCount} groups)</span>
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
                  If another folder holds a higher-res copy, move & replace master copy.
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
