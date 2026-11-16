import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import StatsBanner from './components/StatsBanner';
import Toast from './components/Toast';
import HistoryDrawer from './components/history/HistoryDrawer';
import ImageStudioPage from './pages/ImageStudioPage';
import BatchArchivePage from './pages/BatchArchivePage';
import VideoOptimizerPage from './pages/VideoOptimizerPage';
import FolderBatchPage from './pages/FolderBatchPage';
import DuplicateFinderPage from './pages/DuplicateFinderPage';
import { useImageStudio } from './hooks/useImageStudio';
import { useVideoOptimizer } from './hooks/useVideoOptimizer';
import { getAllHistory, deleteHistoryItem, clearAllHistory, getActiveSessionId } from './utils/historyDB';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [historyItems, setHistoryItems] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const showToast = (message, type = 'info') => setToast({ message, type });

  const refreshHistory = () => getAllHistory().then(setHistoryItems);

  const imageStudio = useImageStudio({ showToast, onHistoryUpdated: refreshHistory });
  const videoOptimizer = useVideoOptimizer({ showToast, onHistoryUpdated: refreshHistory });

  useEffect(() => {
    refreshHistory().then((items) => {
      if ((location.pathname === '/' || location.pathname.startsWith('/image')) && !imageStudio.selectedFile) {
        const activeId = getActiveSessionId();
        if (activeId && items.length > 0) {
          const item = items.find((i) => i.id === activeId && i.type === 'image');
          if (item?.originalBlob && item?.compressedBlob) {
            imageStudio.restoreImageFromHistory(item, false);
            showToast(`Restored image session (${item.name})`, 'info');
          }
        }
      }
    });

    if (location.pathname.startsWith('/video')) {
      const savedVideoId = sessionStorage.getItem('optipixel_active_video_id');
      const savedMeta = sessionStorage.getItem('optipixel_active_video_meta');
      const savedResult = sessionStorage.getItem('optipixel_active_video_result');

      if (savedVideoId && savedMeta) {
        fetch(`/api/video/status/${savedVideoId}`)
          .then((res) => (res.ok ? res.json() : Promise.reject()))
          .then((statusData) => {
            const parsedMeta = JSON.parse(savedMeta);
            videoOptimizer.setVideoJobId(savedVideoId);
            videoOptimizer.setVideoMetadata(parsedMeta);
            videoOptimizer.setVideoOriginalUrl(`/api/video/stream/${savedVideoId}?type=original`);
            if (statusData.status === 'completed' || savedResult) {
              const parsedRes = savedResult ? JSON.parse(savedResult) : statusData.result;
              videoOptimizer.setVideoResult(parsedRes);
              videoOptimizer.setVideoCompressedUrl(`/api/video/stream/${savedVideoId}?type=compressed`);
            }
          })
          .catch(() => {
            sessionStorage.removeItem('optipixel_active_video_id');
            sessionStorage.removeItem('optipixel_active_video_meta');
            sessionStorage.removeItem('optipixel_active_video_result');
          });
      }
    }

    const handlePaste = (e) => {
      if (e.clipboardData?.files?.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
          navigate('/image');
          imageStudio.handleSingleImage([file]);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleDeleteHistory = async (id) => {
    await deleteHistoryItem(id);
    refreshHistory();
  };

  const handleClearHistory = async () => {
    await clearAllHistory();
    setHistoryItems([]);
    showToast('History cleared', 'info');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-900 antialiased">
      <Navbar historyCount={historyItems.length} onOpenHistory={() => setIsHistoryOpen(true)} />

      <main className="flex-1 max-w-[1680px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col gap-5">
        <Routes>
          <Route path="/" element={<Navigate to="/image" replace />} />
          <Route path="/image" element={<ImageStudioPage imageStudio={imageStudio} />} />
          <Route path="/batch" element={<BatchArchivePage showToast={showToast} />} />
          <Route path="/video" element={<VideoOptimizerPage videoOptimizer={videoOptimizer} showToast={showToast} />} />
          <Route path="/folder-batch" element={<FolderBatchPage />} />
          <Route path="/duplicates" element={<DuplicateFinderPage showToast={showToast} />} />
          <Route path="*" element={<Navigate to="/image" replace />} />
        </Routes>

        <div className="mt-8">
          <StatsBanner />
        </div>
      </main>

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        historyItems={historyItems}
        onRestoreItem={(item) => {
          if (item.type === 'video') {
            navigate('/video');
            showToast(`Selected ${item.name} from history`, 'info');
          } else {
            imageStudio.restoreImageFromHistory(item, true);
            navigate('/image');
          }
          setIsHistoryOpen(false);
        }}
        onDeleteItem={handleDeleteHistory}
        onClearAll={handleClearHistory}
      />

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
    </div>
  );
}
