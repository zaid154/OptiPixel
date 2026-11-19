import React, { useState } from 'react';
import { Pause, Play, XCircle, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function BatchActionControls({
  isRunning,
  isCompleted = false,
  onPause,
  onResume,
  onCancel,
  onViewSummary
}) {
  const [isPausing, setIsPausing] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [actionError, setActionError] = useState('');

  const handlePause = async () => {
    setIsPausing(true);
    setActionError('');
    try {
      await onPause();
    } catch (err) {
      setActionError(err.message || 'Pause failed');
    } finally {
      setIsPausing(false);
    }
  };

  const handleResume = async () => {
    setIsResuming(true);
    setActionError('');
    try {
      await onResume();
    } catch (err) {
      setActionError(err.message || 'Resume failed');
    } finally {
      setIsResuming(false);
    }
  };

  const handleCancel = async () => {
    setIsStopping(true);
    setActionError('');
    try {
      await onCancel();
    } catch (err) {
      setActionError(err.message || 'Stop failed');
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <div className="flex items-center gap-2 self-end lg:self-auto">
        {isCompleted ? (
          <button
            type="button"
            onClick={onViewSummary}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>View Summary</span>
          </button>
        ) : isRunning ? (
          <button
            type="button"
            onClick={handlePause}
            disabled={isPausing}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 hover:border-slate-300 flex items-center gap-1.5 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
          >
            {isPausing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                <span>Pausing...</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 text-slate-500" />
                <span>Pause</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleResume}
            disabled={isResuming}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-xs cursor-pointer"
          >
            {isResuming ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Resuming...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume</span>
              </>
            )}
          </button>
        )}

        {!isCompleted && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={isStopping}
            className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 flex items-center gap-1.5 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
          >
            {isStopping ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-600" />
                <span>Stopping...</span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Stop</span>
              </>
            )}
          </button>
        )}
      </div>

      {actionError && (
        <span className="text-[10px] text-rose-600 font-medium flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {actionError}
        </span>
      )}
    </div>
  );
}
