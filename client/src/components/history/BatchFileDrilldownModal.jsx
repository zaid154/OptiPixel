import React, { useState, useEffect } from 'react';
import { X, Search, FileText, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

export default function BatchFileDrilldownModal({ batch, onClose }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [files, setFiles] = useState(batch?.files || []);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  useEffect(() => {
    if (batch?.id && (!files.length || files.length < (batch.stats?.totalFiles || 0))) {
      setLoading(true);
      fetch(`/api/history/batch/${batch.id}/files`)
        .then((r) => r.json())
        .then((data) => {
          if (data.files?.length) setFiles(data.files);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [batch?.id]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter]);

  if (!batch) return null;

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const filtered = files.filter((f) => {
    const matchesQuery = (f.relativePath || f.path || '').toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div>
            <h3 className="text-xs font-bold text-zinc-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Batch File Audit Drilldown ({files.length} Files Logged)</span>
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />}
            </h3>
            <p className="text-[11px] text-zinc-400 font-mono truncate max-w-lg mt-0.5">
              {batch.sourceDir} → {batch.destDir}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        {/* Search & Filters */}
        <div className="p-3 border-b border-zinc-800 flex items-center justify-between gap-3 bg-zinc-900/60 text-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search file name or relative folder path..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 text-[11px]">
            {['all', 'optimized', 'preserved_optimal'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2 py-0.5 rounded capitalize ${statusFilter === st ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-400'}`}
              >
                {st === 'preserved_optimal' ? 'Pristine' : st}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs">No matching files found in this batch audit log.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-[11px] font-mono text-zinc-400">
                  <th className="py-2 px-3">File Location & Name</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Original Size</th>
                  <th className="py-2 px-3">Optimized Size</th>
                  <th className="py-2 px-3">Savings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                {paginated.map((f, i) => (
                  <tr key={i} className="hover:bg-zinc-800/30">
                    <td className="py-2 px-3 text-zinc-300 truncate max-w-xs" title={f.relativePath || f.path}>
                      {f.relativePath || f.path}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        f.status === 'optimized' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                      }`}>
                        {f.status === 'preserved_optimal' ? 'Pristine' : f.status || 'Optimized'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-zinc-400">{formatBytes(f.originalSize)}</td>
                    <td className="py-2 px-3 text-zinc-200 font-semibold">{formatBytes(f.compressedSize)}</td>
                    <td className="py-2 px-3 text-emerald-400 font-bold">{f.savedPercent ? `-${f.savedPercent}%` : '0%'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-2.5 border-t border-zinc-800 flex items-center justify-between bg-zinc-950 text-xs font-mono text-zinc-400">
          <span>
            Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()} files
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed border border-zinc-800"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px]">Page {page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed border border-zinc-800"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}