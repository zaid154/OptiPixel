import React from 'react';
import { NavLink } from 'react-router-dom';
import { FolderArchive, Film, History, SlidersHorizontal, Image as ImageIcon, FolderTree, CopyCheck, HardDrive, ShieldAlert } from 'lucide-react';

export default function Navbar({
  historyCount = 0,
  onOpenHistory
}) {
  const getNavClass = ({ isActive }) =>
    `flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition ${
      isActive
        ? 'bg-emerald-600 text-white shadow-xs font-semibold'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
    }`;

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-50 select-none shadow-xs">
      <div className="max-w-[1680px] w-full mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
        {/* Brand */}
        <NavLink to="/image" className="flex items-center gap-2.5 cursor-pointer shrink-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-slate-900">OptiPixel</span>
            <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">v1.2</span>
          </div>
        </NavLink>

        {/* Dedicated Page Router Navigation in Center with Sleek Single-Line Pills */}
        <div className="flex-1 flex justify-center min-w-0 overflow-x-auto scrollbar-none py-1">
          <nav className="inline-flex items-center p-1 bg-slate-100/90 border border-slate-200 rounded-xl shadow-inner gap-0.5 shrink-0">
            {/* Group 1: Media Compression Tools */}
            <NavLink
              to="/image"
              className={getNavClass}
              title="Single Photo Compressor (Lossless & High Quality size reduction)"
            >
              <ImageIcon className="w-3.5 h-3.5 shrink-0" />
              <span>Compress Photo</span>
            </NavLink>

            <NavLink
              to="/video"
              className={getNavClass}
              title="Single Video Compressor (Smart CRF & GPU Accelerated)"
            >
              <Film className="w-3.5 h-3.5 shrink-0" />
              <span>Compress Video</span>
            </NavLink>

            <NavLink
              to="/batch"
              className={getNavClass}
              title="Upload multiple photos & download a compressed .ZIP archive"
            >
              <FolderArchive className="w-3.5 h-3.5 shrink-0" />
              <span>Batch (.zip)</span>
            </NavLink>

            <NavLink
              to="/folder-batch"
              className={getNavClass}
              title="Direct PC Folder Optimizer (Compress full local folders on disk)"
            >
              <FolderTree className="w-3.5 h-3.5 shrink-0" />
              <span>Folder Batch</span>
            </NavLink>

            {/* Subtle Visual Divider */}
            <div className="h-4 w-px bg-slate-300 mx-1 shrink-0" />

            {/* Group 2: Library Organization & Cleanup Tools */}
            <NavLink
              to="/duplicates"
              className={getNavClass}
              title="Scan library to find and safely remove duplicate photos & videos"
            >
              <CopyCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Duplicate Finder</span>
            </NavLink>

            <NavLink
              to="/misplaced"
              className={getNavClass}
              title="Detect stray photos in wrong folders and organize into correct event albums"
            >
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>Organize Events</span>
            </NavLink>

            <NavLink
              to="/audit"
              className={getNavClass}
              title="Quarantine & Rollback Hub (View deleted copies, audit report, and 1-click restore)"
            >
              <HardDrive className="w-3.5 h-3.5 shrink-0" />
              <span>Restore Hub</span>
            </NavLink>
          </nav>
        </div>

        {/* Right Section: History */}
        <div className="flex items-center gap-2 shrink-0">
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
