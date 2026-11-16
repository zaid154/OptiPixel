import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, FileText, ChevronLeft, ChevronRight, Loader2, FolderTree, Download } from 'lucide-react';

export default function BatchFileDrilldownModal({ batch, onClose }) {
  const [activeTab, setActiveTab] = useState('folders'); // 'folders' | 'files'
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [files, setFiles] = useState(batch?.files || []);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const batchId = batch?.batchId || batch?.id;

  useEffect(() => {
    if (batchId && (!files.length || files.length < (batch.stats?.totalFiles || 0))) {
      setLoading(true);
      fetch(`/api/history/batch/${batchId}/files`)
        .then((r) => r.json())
        .then((data) => {
          if (data.files?.length) setFiles(data.files);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [batchId]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, activeTab]);

  const formatBytes = (bytes) => {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const folderSummary = useMemo(() => {
    const map = new Map();
    for (const f of files) {
      const folder = f.folder || (f.relativePath ? f.relativePath.split(/[\/\\]/).slice(0, -1).join('/') : '') || 'Root';
      const orig = f.originalSize ?? f.size ?? 0;
      const comp = f.compressedSize ?? f.outputSize ?? orig;
      const saved = Math.max(0, orig - comp);

      if (!map.has(folder)) map.set(folder, { folder, count: 0, origBytes: 0, compBytes: 0, savedBytes: 0 });
      const st = map.get(folder);
      st.count++;
      st.origBytes += orig;
      st.compBytes += comp;
      st.savedBytes += saved;
    }
    return Array.from(map.values())
      .map((f) => ({
        ...f,
        savedPercent: f.origBytes > 0 ? Math.round((f.savedBytes / f.origBytes) * 100) : 0
      }))
      .sort((a, b) => b.savedBytes - a.savedBytes);
  }, [files]);

  const filteredFolders = useMemo(() => {
    return folderSummary.filter((f) => f.folder.toLowerCase().includes(query.toLowerCase()));
  }, [folderSummary, query]);

  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      const pathStr = f.relativePath || f.path || '';
      const matchesQuery = pathStr.toLowerCase().includes(query.toLowerCase());
      const isPristine = f.status === 'preserved_optimal' || f.bytesSaved === 0;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'preserved_optimal' ? isPristine : f.status === statusFilter);
      return matchesQuery && matchesStatus;
    });
  }, [files, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredFiles.length / PAGE_SIZE));
  const paginatedFiles = filteredFiles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (!batch) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Bar */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div>
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Optimization Audit Log ({files.length.toLocaleString()} Files Processed)</span>
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />}
            </h3>
            <p className="text-[11px] text-zinc-400 font-mono truncate max-w-xl mt-0.5">
              {batch.sourceDir} → {batch.destDir}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {batchId && (
              <a
                href={`/api/history/batch/${batchId}/export`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg border border-zinc-700 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </a>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab & Search Bar */}
        <div className="p-3 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-zinc-900/60 text-xs">
          <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setActiveTab('folders')}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition ${
                activeTab === 'folders' ? 'bg-zinc-800 text-emerald-400 shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Folders Breakdown ({folderSummary.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition ${
                activeTab === 'files' ? 'bg-zinc-800 text-sky-400 shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>All Files ({files.length.toLocaleString()})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={activeTab === 'folders' ? 'Search folder name...' : 'Search file name or path...'}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            {activeTab === 'files' && (
              <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 text-[11px] shrink-0">
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
            )}
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          {activeTab === 'folders' ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-[11px] font-mono text-zinc-400">
                  <th className="py-2.5 px-3">Subfolder Directory</th>
                  <th className="py-2.5 px-3 text-right">Files Count</th>
                  <th className="py-2.5 px-3 text-right">Original Size</th>
                  <th className="py-2.5 px-3 text-right">Optimized Size</th>
                  <th className="py-2.5 px-3 text-right">Space Saved</th>
                  <th className="py-2.5 px-3 text-right">% Reduced</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                {filteredFolders.map((f, i) => (
                  <tr key={i} className="hover:bg-zinc-800/30">
                    <td className="py-2 px-3 text-zinc-200 font-semibold truncate max-w-sm" title={f.folder}>
                      📁 {f.folder}
                    </td>
                    <td className="py-2 px-3 text-right text-zinc-400">{f.count.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-zinc-400">{formatBytes(f.origBytes)}</td>
                    <td className="py-2 px-3 text-right text-zinc-300 font-semibold">{formatBytes(f.compBytes)}</td>
                    <td className="py-2 px-3 text-right text-emerald-400 font-bold">{formatBytes(f.savedBytes)}</td>
                    <td className="py-2 px-3 text-right text-emerald-400 font-semibold">
                      {f.savedPercent > 0 ? `-${f.savedPercent}%` : '0%'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-[11px] font-mono text-zinc-400">
                  <th className="py-2.5 px-3">File Location & Name</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Original Size</th>
                  <th className="py-2.5 px-3 text-right">Optimized Size</th>
                  <th className="py-2.5 px-3 text-right">Space Saved</th>
                  <th className="py-2.5 px-3 text-right">% Saved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                {paginatedFiles.map((f, i) => {
                  const orig = f.originalSize ?? f.size ?? 0;
                  const comp = f.compressedSize ?? f.outputSize ?? orig;
                  const saved = Math.max(0, orig - comp);
                  const pct = f.savedPercent ?? (orig > 0 ? Math.round((saved / orig) * 100) : 0);
                  const isPristine = f.status === 'preserved_optimal' || saved === 0;
                  return (
                    <tr key={i} className="hover:bg-zinc-800/30">
                      <td className="py-2 px-3 text-zinc-300 truncate max-w-md" title={f.relativePath || f.path}>
                        {f.relativePath || f.path}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          !isPristine ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        }`}>
                          {isPristine ? 'Pristine' : 'Optimized'}
                        </span>
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
          )}
        </div>

        {/* Pagination Footer */}
        {activeTab === 'files' && (
          <div className="p-2.5 border-t border-zinc-800 flex items-center justify-between bg-zinc-950 text-xs font-mono text-zinc-400">
            <span>
              Showing {filteredFiles.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, filteredFiles.length)} of {filteredFiles.length.toLocaleString()} files
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed border border-zinc-800"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px]">Page {page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed border border-zinc-800"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
