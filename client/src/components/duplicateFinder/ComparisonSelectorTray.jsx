import React from 'react';

export default function ComparisonSelectorTray({ files, activeFile, onSelect }) {
  if (!files || files.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1 px-1 custom-scrollbar text-xs">
      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0">
        Switch Duplicate:
      </span>
      {files.map((file, idx) => {
        const isSelected = activeFile?.filePath === file.filePath;
        const thumbUrl = `/api/duplicates/thumbnail?path=${encodeURIComponent(file.filePath)}`;
        const fileName = file.filePath ? file.filePath.split(/[/\\]/).pop() : `Copy ${idx + 1}`;

        return (
          <button
            key={file.filePath || idx}
            onClick={() => onSelect(file)}
            className={`flex items-center gap-2 px-2 py-1 rounded-lg border text-left shrink-0 transition ${
              isSelected
                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
          >
            <div className="w-6 h-6 rounded bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
              <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="max-w-[120px] truncate">
              <div className="truncate font-mono text-[11px]">{fileName}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
