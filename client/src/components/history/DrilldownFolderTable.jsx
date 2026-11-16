import React from 'react';
import { Folder, ArrowRight } from 'lucide-react';

export default function DrilldownFolderTable({ filteredFolders, onSelectFolder, formatBytes }) {
  return (
    <table className="w-full text-left text-xs border-collapse">
      <thead>
        <tr className="border-b border-zinc-800 text-[11px] font-mono text-zinc-400">
          <th className="py-2 px-3">Subfolder Directory</th>
          <th className="py-2 px-3 text-right">Total</th>
          <th className="py-2 px-3 text-right">⚡ Compressed</th>
          <th className="py-2 px-3 text-right">🛡️ Copied As-Is</th>
          <th className="py-2 px-3 text-right">Original</th>
          <th className="py-2 px-3 text-right">Optimized</th>
          <th className="py-2 px-3 text-right">Saved</th>
          <th className="py-2 px-3 text-right">% Reduced</th>
          <th className="py-2 px-3 text-right">Action</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
        {filteredFolders.map((f, i) => (
          <tr
            key={i}
            onClick={() => onSelectFolder(f.rawFolder)}
            className="hover:bg-zinc-800/50 cursor-pointer transition group"
          >
            <td className="py-2.5 px-3 text-zinc-200 font-semibold truncate max-w-sm" title={f.displayName}>
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="group-hover:text-emerald-400 transition">{f.displayName}</span>
              </div>
            </td>
            <td className="py-2.5 px-3 text-right text-zinc-300 font-bold">{f.count.toLocaleString()}</td>
            <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">{f.compressedCount}</td>
            <td className="py-2.5 px-3 text-right text-sky-400 font-semibold">{f.copiedCount}</td>
            <td className="py-2.5 px-3 text-right text-zinc-400">{formatBytes(f.origBytes)}</td>
            <td className="py-2.5 px-3 text-right text-zinc-300 font-semibold">{formatBytes(f.compBytes)}</td>
            <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">{formatBytes(f.savedBytes)}</td>
            <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">{f.savedPercent > 0 ? `-${f.savedPercent}%` : '0%'}</td>
            <td className="py-2.5 px-3 text-right">
              <span className="text-[11px] font-bold text-emerald-400 group-hover:underline flex items-center justify-end gap-1">
                Open Files <ArrowRight className="w-3 h-3" />
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
