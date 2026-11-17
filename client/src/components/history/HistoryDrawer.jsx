import React, { useState, useEffect } from 'react';
import { X, History, Trash2, FolderTree, CopyCheck, Image as ImageIcon } from 'lucide-react';
import FolderBatchHistoryCard from './FolderBatchHistoryCard';
import DuplicateBatchHistoryCard from './DuplicateBatchHistoryCard';
import ConsolidationHistoryCard from './ConsolidationHistoryCard';
import SingleStudioHistoryCard from './SingleStudioHistoryCard';
import BatchFileDrilldownModal from './BatchFileDrilldownModal';
import { getAllBatchHistory, deleteBatchFromHistory } from './historyStorage';

export default function HistoryDrawer({
  isOpen,
  onClose,
  historyItems = [],
  onRestoreItem,
  onDeleteItem,
  onClearAll,
  onOpenAuditHub
}) {
  const [activeTab, setActiveTab] = useState('batches'); // 'batches' | 'duplicates' | 'studio'
  const [batchList, setBatchList] = useState([]);
  const [dupBatches, setDupBatches] = useState({});
  const [consolidations, setConsolidations] = useState([]);
  const [rollingBackTxnId, setRollingBackTxnId] = useState(null);
  const [drilldownBatch, setDrilldownBatch] = useState(null);

  const loadData = async () => {
    const batches = await getAllBatchHistory();
    setBatchList(batches);

    try {
      const res = await fetch('/api/duplicates/history');
      const data = await res.json();
      setConsolidations(data.consolidations || []);
      const grouped = (data.deletions || data.history || []).reduce((acc, item) => {
        if (!acc[item.batchId]) acc[item.batchId] = [];
        acc[item.batchId].push(item);
        return acc;
      }, {});
      setDupBatches(grouped);
    } catch {}
  };

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  const handleDeleteBatch = async (id) => {
    await deleteBatchFromHistory(id);
    setBatchList((prev) => prev.filter((b) => b.id !== id));
  };

  const handleRestoreDuplicates = async (batchId) => {
    await fetch('/api/duplicates/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchId })
    });
    loadData();
  };

  const handleRollbackConsolidation = async (txnId) => {
    setRollingBackTxnId(txnId);
    try {
      await fetch('/api/duplicates/consolidate/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txnId }),
      });
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setRollingBackTxnId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose}></div>

      <div className="relative w-full max-w-xl bg-zinc-950 border-l border-zinc-800 h-full flex flex-col shadow-2xl z-10">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-100 text-sm">Enterprise Session History</h3>
              <p className="text-[11px] text-zinc-400">Complete audit log of local batches & cleanups</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        {/* 3 Tabs */}
        <div className="grid grid-cols-3 p-2 bg-zinc-900/40 border-b border-zinc-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('batches')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'batches' ? 'bg-zinc-800 text-emerald-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Batches ({batchList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('duplicates')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'duplicates' ? 'bg-zinc-800 text-sky-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CopyCheck className="w-3.5 h-3.5" />
            <span>Duplicates ({consolidations.length + Object.keys(dupBatches).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('studio')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'studio' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Studio ({historyItems.length})</span>
          </button>
        </div>

        {/* Tab Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
          {activeTab === 'batches' && (
            batchList.length === 0 ? (
              <div className="text-center py-16 text-zinc-500 text-xs">No local folder optimization batches found yet.</div>
            ) : (
              batchList.map((batch) => (
                <FolderBatchHistoryCard
                  key={batch.id}
                  batch={batch}
                  onInspectFiles={(b) => setDrilldownBatch(b)}
                  onDelete={handleDeleteBatch}
                />
              ))
            )
          )}

          {activeTab === 'duplicates' && (
            consolidations.length === 0 && Object.keys(dupBatches).length === 0 ? (
              <div className="text-center py-16 text-zinc-500 text-xs">No duplicate cleanup sessions found.</div>
            ) : (
              <div className="space-y-3.5">
                {/* Multi-Event Consolidation Sessions */}
                {consolidations.map((item) => (
                  <ConsolidationHistoryCard
                    key={item.transactionId}
                    item={item}
                    onOpenAuditHub={onOpenAuditHub}
                    onRollback={handleRollbackConsolidation}
                    isRollingBack={rollingBackTxnId === item.transactionId}
                  />
                ))}

                {/* Manual Cleanup Batches */}
                {Object.entries(dupBatches).map(([batchId, items]) => (
                  <DuplicateBatchHistoryCard
                    key={batchId}
                    batchId={batchId}
                    items={items}
                    onRestore={handleRestoreDuplicates}
                  />
                ))}
              </div>
            )
          )}

          {activeTab === 'studio' && (
            historyItems.length === 0 ? (
              <div className="text-center py-16 text-zinc-500 text-xs">No single studio items saved.</div>
            ) : (
              historyItems.map((item) => (
                <SingleStudioHistoryCard
                  key={item.id}
                  item={item}
                  onRestore={onRestoreItem}
                  onDelete={onDeleteItem}
                />
              ))
            )
          )}
        </div>
      </div>

      {drilldownBatch && (
        <BatchFileDrilldownModal
          batch={drilldownBatch}
          onClose={() => setDrilldownBatch(null)}
        />
      )}
    </div>
  );
}
