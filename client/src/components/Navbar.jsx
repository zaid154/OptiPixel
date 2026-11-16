import React from 'react';
import { NavLink } from 'react-router-dom';
import { FolderArchive, Film, History, SlidersHorizontal, Image as ImageIcon, FolderTree, CopyCheck } from 'lucide-react';

export default function Navbar({
  historyCount = 0,
  onOpenHistory
}) {
  const getNavClass = ({ isActive }) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
      isActive
        ? 'bg-emerald-600 text-white shadow-sm font-semibold'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
    }`;

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-50 select-none shadow-xs">
      <div className="max-w-[1680px] w-full mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand */}
        <NavLink to="/image" className="flex items-center gap-2.5 cursor-pointer">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-slate-900">OptiPixel</span>
            <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">v1.2</span>
          </div>
        </NavLink>

        {/* Dedicated Page Router Navigation in Center */}
        <nav className="inline-flex p-1 bg-slate-100/90 border border-slate-200 rounded-lg shadow-inner">
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
            <FolderTree className="w-3.5 h-3.5" />
            <span>Folder Batch</span>
          </NavLink>

          <NavLink to="/duplicates" className={getNavClass}>
            <CopyCheck className="w-3.5 h-3.5" />
            <span>Duplicate Finder</span>
          </NavLink>
        </nav>

        {/* Right Section: History */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-xs text-slate-700 hover:text-slate-900 transition cursor-pointer shadow-2xs"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline font-medium">History</span>
            {historyCount > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-mono font-semibold text-[10px] border border-emerald-200">
                {historyCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
