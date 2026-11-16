import React from 'react';
import DuplicateFinder from '../components/duplicateFinder/DuplicateFinder';

export default function DuplicateFinderPage({ showToast }) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-150">
      <DuplicateFinder showToast={showToast} />
    </div>
  );
}
