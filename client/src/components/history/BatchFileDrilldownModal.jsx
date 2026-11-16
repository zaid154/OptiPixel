import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, FileText, ChevronLeft, ChevronRight, Loader2, FolderTree, Download, Folder } from 'lucide-react';
import DrilldownFolderTable from './DrilldownFolderTable';
import DrilldownFilesTable from './DrilldownFilesTable';

export default function BatchFileDrilldownModal({ batch, onClose }) {
  const [activeTab, setActiveTab] = useState('folders');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedFolder, setSelectedFolder] = useState(null);
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
  }, [query, statusFilter, activeTab, selectedFolder]);

  const formatBytes = (bytes) => {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const rootFolderName = useMemo(() => {
    return (batch?.sourceDir || '').split(/[\/\\]/).filter(Boolean).pop() || 'Root';
  }, [batch?.sourceDir]);

  const getFolderDisplay = (raw) => {
    if (!raw || raw === '.' || raw === 'Root' || raw.toLowerCase() === rootFolderName.toLowerCase()) {
      return `${rootFolderName} (Root Directory)`;
    }
    return raw.replace(/[\\\/]/g, ' / ');
  };

  const folderSummary = useMemo(() => {
    const map = new Map();
    for (const f of files) {
      let raw = f.folder || (f.relativePath ? f.relativePath.split(/[\/\\]/).slice(0, -1).join('/') : '') || '.';
      if (!raw || raw === '.' || raw === 'Root' || raw.toLowerCase() === rootFolderName.toLowerCase()) raw = '.';
      const orig = f.originalSize ?? f.size ?? 0;
      const comp = f.compressedSize ?? f.outputSize ?? orig;
      const saved = Math.max(0, orig - comp);
      const isFailed = f.status === 'failed';
      const isCompressed = !isFailed && orig > comp;

      if (!map.has(raw)) {
        map.set(raw, {
          rawFolder: raw,
          displayName: getFolderDisplay(raw),
          count: 0,
          compressedCount: 0,
          copiedCount: 0,
          failedCount: 0,
          origBytes: 0,
          compBytes: 0,
          savedBytes: 0
        });
      }
      const st = map.get(raw);
      st.count++;
      if (isFailed) st.failedCount++;
      else if (isCompressed) st.compressedCount++;
      else st.copiedCount++;
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
  }, [files, rootFolderName]);

  const filteredFolders = useMemo(() => {
    return folderSummary.filter((f) => f.displayName.toLowerCase().includes(query.toLowerCase()));
  }, [folderSummary, query]);

  const { folderFiles, filteredFiles, compressedTotal, copiedTotal, failedTotal } = useMemo(() => {
    const inFolder = files.filter((f) => {
      if (!selectedFolder) return true;
      let raw = f.folder || (f.relativePath ? f.relativePath.split(/[\/\\]/).slice(0, -1).join('/') : '') || '.';
      if (!raw || raw === '.' || raw === 'Root' || raw.toLowerCase() === rootFolderName.toLowerCase()) raw = '.';
      return raw === selectedFolder;
    });

    let compCount = 0, copCount = 0, failCount = 0;
    for (const f of inFolder) {
      const orig = f.originalSize ?? f.size ?? 0;
      const comp = f.compressedSize ?? f.outputSize ?? orig;
      if (f.status === 'failed') failCount++;
      else if (orig > comp) compCount++;
      else copCount++;
    }

    const filtered = inFolder.filter((f) => {
      const pathStr = f.relativePath || f.path || '';
      const matchesQuery = pathStr.toLowerCase().includes(query.toLowerCase());
      const orig = f.originalSize ?? f.size ?? 0;
      const comp = f.compressedSize ?? f.outputSize ?? orig;
      const isFailed = f.status === 'failed';
      const isCompressed = !isFailed && orig > comp;
      const isCopied = !isFailed && orig <= comp;

      let matchesStatus = true;
      if (statusFilter === 'compressed') matchesStatus = isCompressed;
      else if (statusFilter === 'copied') matchesStatus = isCopied;
      else if (statusFilter === 'failed') matchesStatus = isFailed;

      return matchesQuery && matchesStatus;
    });

    return { folderFiles: inFolder, filteredFiles: filtered, compressedTotal: compCount, copiedTotal: copCount, failedTotal: failCount };
  }, [files, selectedFolder, query, statusFilter, rootFolderName]);

  const totalPages = Math.max(1, Math.ceil(filteredFiles.length / PAGE_SIZE));
  const paginatedFiles = filteredFiles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (!batch) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
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
                href={`/api/history/batch/${batchId}/export`} target="_blank" rel="noreferrer"
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg border border-zinc-700 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /><span>Export CSV</span>
              </a>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab & Filter Bar */}
        <div className="p-3 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-zinc-900/60 text-xs">
          <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setActiveTab('folders')}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'folders' ? 'bg-zinc-800 text-emerald-400 shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Folders ({folderSummary.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'files' ? 'bg-zinc-800 text-sky-400 shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>All Files ({files.length.toLocaleString()})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-xl justify-end">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder={activeTab === 'folders' ? 'Search folder...' : 'Search file name...'}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            {activeTab === 'files' && (
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-[11px] shrink-0">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2 py-0.5 rounded font-semibold transition cursor-pointer ${statusFilter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  All ({folderFiles.length})
                </button>
                <button
                  onClick={() => setStatusFilter('compressed')}
                  className={`px-2 py-0.5 rounded font-semibold transition cursor-pointer ${statusFilter === 'compressed' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50' : 'text-emerald-500/80 hover:text-emerald-400'}`}
                >
                  ⚡ Compressed ({compressedTotal})
                </button>
                <button
                  onClick={() => setStatusFilter('copied')}
                  className={`px-2 py-0.5 rounded font-semibold transition cursor-pointer ${statusFilter === 'copied' ? 'bg-sky-950/80 text-sky-300 border border-sky-700/50' : 'text-sky-500/80 hover:text-sky-400'}`}
                >
                  🛡️ Copied As-Is ({copiedTotal})
                </button>
                {failedTotal > 0 && (
                  <button
                    onClick={() => setStatusFilter('failed')}
                    className={`px-2 py-0.5 rounded font-semibold transition cursor-pointer ${statusFilter === 'failed' ? 'bg-rose-950/80 text-rose-300 border border-rose-700/50' : 'text-rose-400 hover:text-rose-300'}`}
                  >
                    ⚠️ Failed ({failedTotal})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Selected Folder Banner */}
        {activeTab === 'files' && selectedFolder && (
          <div className="px-4 py-2 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Folder className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-zinc-400">Viewing Folder:</span>
              <span className="text-zinc-100 font-bold">{getFolderDisplay(selectedFolder)}</span>
              <span className="text-[11px] text-zinc-500">({folderFiles.length} files)</span>
            </div>
            <button
              onClick={() => setSelectedFolder(null)}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold underline cursor-pointer"
            >
              Show All Folders
            </button>
          </div>
        )}

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          {activeTab === 'folders' ? (
            <DrilldownFolderTable
              filteredFolders={filteredFolders}
              onSelectFolder={(folderKey) => { setSelectedFolder(folderKey); setActiveTab('files'); }}
              formatBytes={formatBytes}
            />
          ) : (
            <DrilldownFilesTable paginatedFiles={paginatedFiles} formatBytes={formatBytes} />
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
                className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed border border-zinc-800 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px]">Page {page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed border border-zinc-800 cursor-pointer"
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