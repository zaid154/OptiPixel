import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export default function Toast({ message, type = 'info', onClose, duration = 4000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const bgStyles = {
    error: 'bg-rose-950/90 border-rose-500/30 text-rose-200',
    success: 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200',
    info: 'bg-slate-900/90 border-white/10 text-slate-200'
  };

  const icons = {
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-400 shrink-0" />
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full px-4 animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className={`p-4 rounded-xl border backdrop-blur-xl shadow-2xl flex items-center justify-between gap-3 ${bgStyles[type] || bgStyles.info}`}>
        <div className="flex items-center gap-3">
          {icons[type] || icons.info}
          <p className="text-xs font-medium leading-relaxed">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
