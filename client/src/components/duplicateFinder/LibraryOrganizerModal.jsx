import React, { useState, useEffect } from 'react';
import { Sparkles, FolderTree, ArrowRight, X, CheckCircle2, AlertTriangle, Calendar, Layers } from 'lucide-react';

export default function LibraryOrganizerModal({ isOpen, onClose, rootPath, showToast }) {
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [plan, setPlan] = useState(null);
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    if (isOpen && rootPath) {
      loadPlan();
    }
  }, [isOpen, rootPath]);

  const loadPlan = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/duplicates/organize/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootPath })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to scan library');
      setPlan(data);
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!plan || !plan.plannedMoves || plan.plannedMoves.length === 0) return;
    setExecuting(true);
    try {
      const res = await fetch('/api/duplicates/organize/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootPath, moves: plan.plannedMoves })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Execution failed');
      showToast?.(`Successfully organized ${data.movedCount} files!`, 'success');
      onClose();
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setExecuting(false);
    }
  };

  if (!isOpen) return null;

  const filteredMoves = (plan?.plannedMoves || []).filter((m) =>
    !filterQuery.trim() ||
    m.fileName.toLowerCase().includes(filterQuery.toLowerCase()) ||
    m.targetFolder.toLowerCase().includes(filterQuery.toLowerCase()) ||
    m.reason.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Whole-Library Media Organizer</h3>
              <p className="text-xs text-slate-500">Auto-routes loose Camera & Root photos into their true events & dates</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-purple-500/30 border-t-purple-600 rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-600">Analyzing EXIF camera shoot dates & event folders...</p>
            </div>
          ) : plan ? (
            <>
              {/* Stats Overview */}
              <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500 text-[10.5px]">Total Library Media</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">{plan.totalFiles?.toLocaleString()} files</div>
                </div>
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                  <div className="text-purple-700 text-[10.5px]">Loose / Unfiled Files</div>
                  <div className="text-base font-bold text-purple-900 mt-0.5">{plan.allMovesCount} to organize</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-emerald-700 text-[10.5px]">Discovered Event Folders</div>
                  <div className="text-base font-bold text-emerald-900 mt-0.5">{plan.eventFoldersCount} events</div>
                </div>
              </div>

              {/* Search Bar */}
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter preview by file name, event, or folder..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />

              {/* Table of Planned Moves */}
              <div className="rounded-xl border border-slate-200 overflow-hidden max-h-72 overflow-y-auto shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[10.5px] sticky top-0">
                    <tr>
                      <th className="py-2 px-3">File Name</th>
                      <th className="py-2 px-3">Current Location</th>
                      <th className="py-2 px-3">True Shoot Date</th>
                      <th className="py-2 px-3 text-purple-700">Target Destination</th>
                      <th className="py-2 px-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {filteredMoves.map((m, idx) => (
                      <tr key={idx} className="hover:bg-purple-50/40">
                        <td className="py-2 px-3 font-semibold text-slate-800 truncate max-w-[160px]" title={m.fileName}>
                          {m.fileName}
                        </td>
                        <td className="py-2 px-3 text-slate-500 truncate max-w-[120px]" title={m.currentFolder}>
                          📁 {m.currentFolder}
                        </td>
                        <td className="py-2 px-3 text-slate-700">
                          {m.detectedDate}
                        </td>
                        <td className="py-2 px-3 font-bold text-purple-800 truncate max-w-[160px]" title={m.targetFolder}>
                          📁 {m.targetFolder}
                        </td>
                        <td className="py-2 px-3 text-slate-500 text-[10px]">
                          {m.reason}
                        </td>
                      </tr>
                    ))}
                    {filteredMoves.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No loose files found matching criteria. Library is already organized!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 cursor-pointer">
            Cancel
          </button>
          <button
            onClick={handleExecute}
            disabled={executing || !plan || plan.allMovesCount === 0}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <span>{executing ? 'Organizing Library...' : `Organize ${plan?.allMovesCount || 0} Files Now`}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
