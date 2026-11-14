import React from 'react';
import { NavLink } from 'react-router-dom';
import { FolderArchive, Film, History, SlidersHorizontal, Image as ImageIcon, FolderTree } from 'lucide-react';

export default function Navbar({
  historyCount = 0,
  onOpenHistory
}) {
  const getNavClass = ({ isActive }) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
      isActive
        ? 'bg-zinc-800 text-zinc-100 shadow-sm font-semibold'
        : 'text-zinc-400 hover:text-zinc-200'
    }`;

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-50 select-none">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand */}
        <NavLink to="/image" className="flex items-center gap-2.5 cursor-pointer">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700/60 flex items-center justify-center text-zinc-100 shadow-sm">
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-tight text-zinc-100">OptiPixel</span>
            <span className="text-[11px] font-mono text-zinc-500">v1.2</span>
          </div>
        </NavLink>

        {/* Dedicated Page Router Navigation in Center */}
        <nav className="inline-flex p-0.5 bg-zinc-900/90 border border-zinc-800 rounded-lg shadow-inner">
          <NavLink to="/image" className={getNavClass}>
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Image</span>
          </NavLink>

          <NavLink to="/batch" className={getNavClass}>
            <FolderArchive className="w-3.5 h-3.5" />
            <span>Batch (.zip)</span>
          </NavLink>

          <NavLink to="/video" className={getNavClass}>
            <Film className="w-3.5 h-3.5" />
            <span>Video</span>
          </NavLink>

          <NavLink to="/folder-batch" className={getNavClass}>
            <FolderTree className="w-3.5 h-3.5 text-emerald-400" />
            <span>Folder Batch</span>
            <span className="hidden lg:inline text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-semibold">11k+</span>
          </NavLink>
        </nav>

        {/* Right Section: History */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 text-xs text-zinc-300 hover:text-zinc-100 transition cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">History</span>
            {historyCount > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-emerald-400 font-mono font-medium text-[10px] border border-zinc-700">
                {historyCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
