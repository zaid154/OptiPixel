import React from 'react';

export default function DrilldownFilesTable({ paginatedFiles, formatBytes }) {
  return (
    <table className="w-full text-left text-xs border-collapse">
      <thead>
        <tr className="border-b border-zinc-800 text-[11px] font-mono text-zinc-400">
          <th className="py-2 px-3">File Location & Name</th>
          <th className="py-2 px-3">Status</th>
          <th className="py-2 px-3 text-right">Original Size</th>
          <th className="py-2 px-3 text-right">Optimized Size</th>
          <th className="py-2 px-3 text-right">Space Saved</th>
          <th className="py-2 px-3 text-right">% Saved</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
        {paginatedFiles.map((f, i) => {
          const orig = f.originalSize ?? f.size ?? 0;
          const comp = f.compressedSize ?? f.outputSize ?? orig;
          const saved = Math.max(0, orig - comp);
          const pct = f.savedPercent ?? (orig > 0 ? Math.round((saved / orig) * 100) : 0);
          const isFailed = f.status === 'failed';
          const isCompressed = !isFailed && orig > comp;

          return (
            <tr key={i} className="hover:bg-zinc-800/30">
              <td className="py-2 px-3 text-zinc-300 truncate max-w-md" title={f.relativePath || f.path}>
                {f.relativePath || f.path}
              </td>
              <td className="py-2 px-3 whitespace-nowrap">
                {isFailed ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    ⚠️ Failed
                  </span>
                ) : isCompressed ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ⚡ Compressed (-{pct}%)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    🛡️ Copied As-Is
                  </span>
                )}
              </td>
              <td className="py-2 px-3 text-right text-zinc-400">{formatBytes(orig)}</td>
              <td className="py-2 px-3 text-right text-zinc-200 font-semibold">{formatBytes(comp)}</td>
              <td className="py-2 px-3 text-right text-emerald-400 font-bold">{formatBytes(saved)}</td>
              <td className="py-2 px-3 text-right text-emerald-400 font-bold">{pct ? `-${pct}%` : '0%'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
