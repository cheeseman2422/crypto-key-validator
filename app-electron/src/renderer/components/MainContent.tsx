import React, { useState } from 'react';
import { DirectInput, ArtifactList } from './index';
import { DropZone } from './DropZone';
import { Artifact } from '../hooks/useAppState';

interface MainContentProps {
  artifacts: Artifact[];
  refreshData: () => Promise<void>;
  onToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export function MainContent({ artifacts, refreshData, onToast }: MainContentProps) {
  const [activeTab, setActiveTab] = useState<'input' | 'results'>('input');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tab Navigation */}
      <div className="border-b border-crypto-light bg-crypto-gray">
        <div className="flex space-x-8 px-6 py-3">
          <button
            onClick={() => setActiveTab('input')}
            className={`pb-2 px-1 border-b-2 transition-colors ${
              activeTab === 'input'
                ? 'border-crypto-primary text-crypto-primary'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Input & Scan
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`pb-2 px-1 border-b-2 transition-colors ${
              activeTab === 'results'
                ? 'border-crypto-primary text-crypto-primary'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Results ({artifacts.length})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'input' ? (
          <div className="p-6 space-y-6 overflow-y-auto h-full">
            <DropZone onToast={onToast} />
            <DirectInput onToast={onToast} refreshData={refreshData} />
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <ArtifactList artifacts={artifacts} />
          </div>
        )}
      </div>
    </div>
  );
}
