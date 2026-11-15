import React, { useEffect, useState } from 'react';
import { X, RotateCcw, CheckCircle, Clock, Archive } from 'lucide-react';

export default function RestoreHistoryDrawer({ isOpen, onClose, onShowToast }) {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/duplicates/history');
      const data = await res.json();
      setHistory(data.history || []);
    } catch {
      onShowToast?.('Failed to load history', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchHistory();
  }, [isOpen]);

  const handleRestore = async (batchId) => {
    try {
      const res = await fetch('/api/duplicates/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId })
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
    }
  };

  if (!isOpen) return null;

  const batches = history.reduce((acc, item) => {
    if (!acc[item.batchId]) acc[item.batchId] = [];
    acc[item.batchId].push(item);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white border-l border-slate-200 h-full p-5 flex flex-col shadow-2xl text-slate-800">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800">Deletion & Quarantine History</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3 custom-scrollbar">
          {Object.keys(batches).length === 0 ? (
            <div className="text-center text-slate-400 text-xs py-10">No past deletion batches found.</div>
          ) : (
            Object.entries(batches).map(([batchId, items]) => {
              const isRestored = items.every((i) => i.restored);
              const isQuarantine = items[0]?.actionType === 'quarantine';

              return (
                <div key={batchId} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-slate-800 font-bold">Batch: {batchId}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(items[0].deletedAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="text-slate-600 text-[11px] font-mono">
                    {items.length} Files • Action: <span className="uppercase text-slate-800 font-bold">{items[0]?.actionType}</span>
                  </div>

                  {isQuarantine && (
                    <div className="pt-1">
                      {isRestored ? (
                        <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-bold">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Fully Restored</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleRestore(batchId)}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore All Files in Batch</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
