import React, { useEffect, useState, useMemo } from 'react';
import {
  X, RotateCcw, CheckCircle, Clock, Archive, Layers, Trash2,
  HardDrive, ChevronDown, ChevronUp, Search, Film, Image as ImageIcon,
  ArrowRight, ArrowUpRight, FolderPlus, Loader2
} from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

const ACTION_CONFIG = {
  DELETE: { label: 'Quarantined', bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: Trash2 },
  MOVE_UPGRADE: { label: 'Upgraded & Moved', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: ArrowUpRight },
  RESCUE_MOVE: { label: 'Rescued to Event', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: FolderPlus },
};

function ConsolidationCard({ item, onRollback, isRollingBack }) {
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');

  const operations = item.operations || [];
  const summary = item.summary || {};
  const isRolledBack = item.status === 'rolled_back';

  const filteredOps = useMemo(() => {
    return operations.filter((op) => {
      if (filterAction !== 'ALL' && op.action !== filterAction) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const src = (op.sourcePath || '').toLowerCase();
      const dest = (op.targetPath || op.quarantinePath || '').toLowerCase();
      return src.includes(q) || dest.includes(q);
    });
  }, [operations, filterAction, searchQuery]);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs shadow-2xs">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-900">{item.transactionId}</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                isRolledBack
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {isRolledBack ? 'Rolled Back' : 'Completed'}
            </span>
          </div>
          <p className="text-[10.5px] text-slate-500 font-mono mt-0.5 truncate max-w-sm">
            {item.masterFolder}
          </p>
        </div>

        <span className="text-[10.5px] text-slate-400 font-mono shrink-0">
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Summary Stat Pills */}
      <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
        <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
          Kept: {summary.keptCount || 0}
        </span>
        <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
          Quarantined: {summary.deletedCount || operations.length} ({formatBytes(summary.freedBytes)})
        </span>
        {summary.upgradedCount > 0 && (
          <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-semibold">
            Upgraded: {summary.upgradedCount}
          </span>
        )}
      </div>

      {/* Accordion Toggle */}
      <div className="pt-1 flex items-center justify-between border-t border-slate-200/80">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-emerald-700 transition cursor-pointer"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{expanded ? 'Hide File Breakdown' : `View File Breakdown (${operations.length} files)`}</span>
        </button>

        {!isRolledBack ? (
          <button
            type="button"
            disabled={isRollingBack}
            onClick={() => onRollback(item.transactionId)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 font-bold text-[11px] shadow-2xs transition cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{isRollingBack ? 'Restoring...' : 'Rollback Consolidation'}</span>
          </button>
        ) : (
          <div className="flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Fully Restored</span>
          </div>
        )}
      </div>

      {/* Expanded File-by-File Breakdown */}
      {expanded && (
        <div className="pt-2 border-t border-slate-200 space-y-2 animate-in fade-in duration-150">
          {/* Search bar inside transaction */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search file name or path..."
                className="w-full pl-7 pr-2.5 py-1 text-[11px] rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-400 font-mono"
              />
            </div>
            {operations.some((o) => o.action === 'MOVE_UPGRADE') && (
              <button
                type="button"
                onClick={() => setFilterAction(filterAction === 'MOVE_UPGRADE' ? 'ALL' : 'MOVE_UPGRADE')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition cursor-pointer ${
                  filterAction === 'MOVE_UPGRADE' ? 'bg-amber-600 text-white' : 'bg-white border border-slate-200 text-amber-700'
                }`}
              >
                Upgrades
              </button>
            )}
          </div>

          {/* Files List */}
          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {filteredOps.length === 0 ? (
              <div className="text-center py-4 text-[11px] text-slate-400">No matching files found.</div>
            ) : (
              filteredOps.map((op, i) => {
                const fileName = (op.sourcePath || '').split(/[/\\]/).pop();
                const isVideo = /\.(mp4|mov|avi|mkv|webm)$/i.test(fileName);
                const cfg = ACTION_CONFIG[op.action] || ACTION_CONFIG.DELETE;
                const dest = op.targetPath || op.quarantinePath || 'Quarantine';

                return (
                  <div key={i} className="bg-white border border-slate-200 rounded-lg p-2 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        {isVideo ? <Film className="w-3 h-3 text-slate-400 shrink-0" /> : <ImageIcon className="w-3 h-3 text-slate-400 shrink-0" />}
                        <span className="font-mono font-bold text-slate-900 truncate" title={fileName}>
                          {fileName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 font-mono">
                        <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase border ${cfg.bg}`}>
                          {cfg.label}
                        </span>
                        <span className="text-slate-500 text-[10px]">{formatBytes(op.originalSize)}</span>
                      </div>
                    </div>

                    <div className="text-[10px] font-mono text-slate-500 space-y-0.5 bg-slate-50 p-1 rounded border border-slate-100">
                      <div className="truncate"><strong className="text-slate-400">FROM:</strong> {op.sourcePath}</div>
                      <div className="truncate"><strong className="text-slate-400">TO:</strong> {dest}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DeletionBatchCard({ batchId, items, onRestore, isRestoring }) {
  const [expanded, setExpanded] = useState(false);
  const isRestored = items.every((i) => i.restored);
  const isQuarantine = items[0]?.actionType === 'quarantine';

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs shadow-2xs">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-slate-800 font-bold">Batch: {batchId}</span>
        <span className="text-[10px] text-slate-500 font-mono">
          {new Date(items[0].deletedAt).toLocaleTimeString()}
        </span>
      </div>

      <div className="text-slate-600 text-[11px] font-mono">
        {items.length} Files • Action: <span className="uppercase text-slate-800 font-bold">{items[0]?.actionType}</span>
      </div>

      {/* Accordion toggle */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-emerald-700 transition cursor-pointer"
      >
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        <span>{expanded ? 'Hide Files' : `View Files (${items.length})`}</span>
      </button>

      {expanded && (
        <div className="max-h-48 overflow-y-auto space-y-1 pt-1.5 border-t border-slate-200">
          {items.map((file, idx) => (
            <div key={idx} className="bg-white p-1.5 rounded border border-slate-200 font-mono text-[10px] space-y-0.5">
              <div className="font-bold text-slate-800 truncate">{file.originalPath.split(/[/\\]/).pop()}</div>
              <div className="text-slate-400 truncate">FROM: {file.originalPath}</div>
              {file.quarantinePath && <div className="text-slate-400 truncate">TO: {file.quarantinePath}</div>}
            </div>
          ))}
        </div>
      )}

      {isQuarantine && (
        <div className="pt-1">
          {isRestored ? (
            <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-bold">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Fully Restored</span>
            </div>
          ) : (
            <button
              onClick={() => onRestore(batchId)}
              disabled={isRestoring}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isRestoring ? 'Restoring...' : 'Restore All Files in Batch'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function RestoreHistoryDrawer({ isOpen, onClose, onShowToast }) {
  const [activeTab, setActiveTab] = useState('consolidations'); // 'consolidations' | 'deletions'
  const [consolidations, setConsolidations] = useState([]);
  const [deletions, setDeletions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rollingBackTxnId, setRollingBackTxnId] = useState(null);
  const [restoringBatchId, setRestoringBatchId] = useState(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/duplicates/history');
      const data = await res.json();
      setConsolidations(data.consolidations || []);
      setDeletions(data.deletions || data.history || []);
    } catch {
      onShowToast?.('Failed to load history', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchHistory();
  }, [isOpen]);

  const handleRollbackConsolidation = async (txnId) => {
    if (!txnId) return;
    setRollingBackTxnId(txnId);
    try {
      const res = await fetch('/api/duplicates/consolidate/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txnId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      onShowToast?.(`Rollback successful! Restored ${data.restoredCount} files.`, 'success');
      fetchHistory();
    } catch (err) {
      onShowToast?.(err.message, 'error');
    } finally {
      setRollingBackTxnId(null);
    }
  };

  const handleRestoreBatch = async (batchId) => {
    setRestoringBatchId(batchId);
    try {
      const res = await fetch('/api/duplicates/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId }),
      });
      const data = await res.json();
      if (data.success) {
        onShowToast?.(`Restored ${data.outcome.count} files successfully!`, 'success');
        fetchHistory();
      } else {
        onShowToast?.(data.error || 'Restore failed', 'error');
      }
    } catch (err) {
      onShowToast?.(err.message, 'error');
    } finally {
      setRestoringBatchId(null);
    }
  };

  if (!isOpen) return null;

  // Group deletions by batchId
  const deletionBatches = deletions.reduce((acc, item) => {
    if (!acc[item.batchId]) acc[item.batchId] = [];
    acc[item.batchId].push(item);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white border-l border-slate-200 h-full p-5 flex flex-col shadow-2xl text-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Consolidation & Deletion History</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 pt-3 pb-2 shrink-0 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab('consolidations')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'consolidations'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Consolidations ({consolidations.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('deletions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'deletions'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Manual Batches ({Object.keys(deletionBatches).length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 custom-scrollbar">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-xs">Loading audit logs...</span>
            </div>
          )}

          {!isLoading && activeTab === 'consolidations' && (
            consolidations.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-12">
                No past consolidation transactions found.
              </div>
            ) : (
              consolidations.map((item) => (
                <ConsolidationCard
                  key={item.transactionId}
                  item={item}
                  onRollback={handleRollbackConsolidation}
                  isRollingBack={rollingBackTxnId === item.transactionId}
                />
              ))
            )
          )}

          {!isLoading && activeTab === 'deletions' && (
            Object.keys(deletionBatches).length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-12">
                No past deletion batches found.
              </div>
            ) : (
              Object.entries(deletionBatches).map(([batchId, items]) => (
                <DeletionBatchCard
                  key={batchId}
                  batchId={batchId}
                  items={items}
                  onRestore={handleRestoreBatch}
                  isRestoring={restoringBatchId === batchId}
                />
              ))
            )
          )}
        </div>

      </div>
    </div>
  );
}
