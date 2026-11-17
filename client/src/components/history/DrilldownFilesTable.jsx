import React from 'react';

export default function DrilldownFilesTable({ paginatedFiles, formatBytes, sourceDir = '', destDir = '' }) {
  return (
    <table className="w-full text-left text-xs border-collapse">
      <thead>
        <tr className="border-b border-zinc-800 text-[11px] font-mono text-zinc-400">
          <th className="py-2 px-3">File & Full Disk Paths</th>
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

          const rel = f.relativePath || f.path || '';
          const fileName = rel.split(/[\/\\]/).pop() || rel;
          const fullSrc = f.sourcePath || (sourceDir ? `${sourceDir.replace(/[\\\/]$/, '')}\\${rel}` : rel);
          const fullDest = f.destinationPath || (destDir ? `${destDir.replace(/[\\\/]$/, '')}\\${rel}` : '');

          return (
            <tr key={i} className="hover:bg-zinc-800/40 transition">
              <td className="py-2 px-3 max-w-md">
                <div className="font-semibold text-zinc-100 truncate text-xs" title={fileName}>
                  {fileName}
                </div>
                <div className="text-[10px] text-zinc-400 truncate mt-0.5 flex items-center gap-1" title={fullSrc}>
                  <span className="text-amber-400/90 font-sans font-bold shrink-0">From:</span>
                  <span className="truncate font-mono">{fullSrc}</span>
                </div>
                {fullDest && (
                  <div className="text-[10px] text-zinc-400 truncate mt-0.5 flex items-center gap-1" title={fullDest}>
                    <span className="text-emerald-400 font-sans font-bold shrink-0">Saved:</span>
                    <span className="truncate font-mono text-emerald-300/80">{fullDest}</span>
                  </div>
                )}
              </td>
              <td className="py-2 px-3 whitespace-nowrap">
                {isFailed ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    Failed
                  </span>
                ) : isCompressed ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Compressed (-{pct}%)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    Copied
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
