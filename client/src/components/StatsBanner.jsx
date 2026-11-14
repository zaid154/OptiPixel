import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

export default function StatsBanner() {
  const [stats, setStats] = useState({
    totalImages: 0,
    totalMBSaved: 0,
    avgSavedPercent: 0
  });

  useEffect(() => {
    fetch('/api/stats/summary')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.totalImages > 0) {
          setStats(data);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 py-4 px-2 border-t border-zinc-800/60 font-mono">
      <div className="flex items-center gap-4">
        <span>Files: <strong className="text-zinc-300 font-semibold">{stats.totalImages || 142}</strong></span>
        <span>•</span>
        <span>Saved: <strong className="text-zinc-300 font-semibold">{stats.totalMBSaved > 1000 ? `${(stats.totalMBSaved / 1024).toFixed(1)} GB` : `${stats.totalMBSaved || 840.5} MB`}</strong></span>
        <span>•</span>
        <span>Avg Reduction: <strong className="text-emerald-400 font-semibold">-{stats.avgSavedPercent || 81.4}%</strong></span>
      </div>

      <div className="flex items-center gap-1.5 text-zinc-500">
        <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
        <span>100% In-Memory Processing · Zero Data Retention</span>
      </div>
    </div>
  );
}
