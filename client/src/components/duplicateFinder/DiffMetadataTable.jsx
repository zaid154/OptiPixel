import React from 'react';

export default function DiffMetadataTable({ fileA, fileB }) {
  if (!fileA || !fileB) return null;

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const rows = [
    {
      label: 'Visual Score & Clarity',
      valA: fileA.visualScore ? `${fileA.visualScore}/100 (${fileA.clarity || 'Normal'}, ${fileA.sharpness || 0} Sharpness)` : 'N/A',
      valB: fileB.visualScore ? `${fileB.visualScore}/100 (${fileB.clarity || 'Normal'}, ${fileB.sharpness || 0} Sharpness)` : 'N/A',
      isDiff: (fileA.visualScore || 0) !== (fileB.visualScore || 0)
    },
    {
      label: 'Resolution',
      valA: fileA.resolution?.width ? `${fileA.resolution.width} × ${fileA.resolution.height}` : 'N/A',
      valB: fileB.resolution?.width ? `${fileB.resolution.width} × ${fileB.resolution.height}` : 'N/A',
      isDiff: (fileA.resolution?.width || 0) !== (fileB.resolution?.width || 0)
    },
    {
      label: 'File Size',
      valA: formatBytes(fileA.size),
      valB: formatBytes(fileB.size),
      isDiff: fileA.size !== fileB.size
    },
    {
      label: 'Directory Path',
      valA: fileA.filePath,
      valB: fileB.filePath,
      isDiff: fileA.filePath !== fileB.filePath
    },
    {
      label: 'Action Marked',
      valA: fileA.markedForDelete ? 'Marked for Deletion' : 'Keep (Original)',
      valB: fileB.markedForDelete ? 'Marked for Deletion' : 'Keep (Original)',
      isDiff: fileA.markedForDelete !== fileB.markedForDelete
    }
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-2.5 text-xs shadow-2xs">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500 font-mono text-[11px] bg-slate-50">
            <th className="py-2 px-3 w-1/4 font-semibold">Property</th>
            <th className="py-2 px-3 w-3/8 text-emerald-700 font-bold">Master / Primary Copy</th>
            <th className="py-2 px-3 w-3/8 text-slate-700 font-bold">Compared Copy</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-mono">
          {rows.map((row, idx) => (
            <tr key={idx} className={row.isDiff ? 'bg-emerald-50/40' : 'hover:bg-slate-50/60'}>
              <td className="py-2 px-3 text-slate-600 font-medium">{row.label}</td>
              <td className={`py-2 px-3 break-all ${row.isDiff ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                {row.valA}
              </td>
              <td className={`py-2 px-3 break-all ${row.isDiff ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                {row.valB}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
