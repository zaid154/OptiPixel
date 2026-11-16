import React from 'react';
import LocalFolderBatchOptimizer from '../components/LocalFolderBatchOptimizer';

export default function FolderBatchPage() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-150">
      <LocalFolderBatchOptimizer />
    </div>
  );
}
