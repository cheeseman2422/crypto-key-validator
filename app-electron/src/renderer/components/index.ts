// Simple implementations for remaining components

import React, { useState } from 'react';
import { Artifact } from '../hooks/useAppState';

// DirectInput Component
export function DirectInput({ onToast, refreshData }: {
  onToast: (type: string, message: string) => void;
  refreshData: () => Promise<void>;
}) {
  const [input, setInput] = useState('');

  const handleSubmit = async () => {
    if (!input.trim()) {
      onToast('warning', 'Please enter some data to validate');
      return;
    }

    try {
      onToast('info', 'Processing input...');
      await window.cryptoValidator.processDirectInput(input);
      await refreshData();
      setInput('');
    } catch (error: any) {
      onToast('error', `Processing failed: ${error.message}`);
    }
  };

  return React.createElement('div', { className: 'card p-6' }, [
    React.createElement('h3', { className: 'text-lg font-semibold text-crypto-primary mb-4', key: 'title' }, 'Direct Input'),
    React.createElement('textarea', {
      key: 'textarea',
      value: input,
      onChange: (e: any) => setInput(e.target.value),
      className: 'w-full h-32 bg-crypto-dark border border-crypto-light rounded-lg p-4 text-mono text-sm resize-vertical',
      placeholder: 'Paste private keys, seed phrases, or addresses here...'
    }),
    React.createElement('button', {
      key: 'button', 
      onClick: handleSubmit,
      className: 'mt-4 btn-primary'
    }, 'Validate Input')
  ]);
}

// ArtifactList Component
export function ArtifactList({ artifacts }: { artifacts: Artifact[] }) {
  if (artifacts.length === 0) {
    return React.createElement('div', { className: 'p-8 text-center text-gray-400' },
      React.createElement('p', {}, 'No results yet. Scan files or paste data to get started.')
    );
  }

  return React.createElement('div', { className: 'p-6 space-y-4' },
    artifacts.map((artifact) => 
      React.createElement('div', { key: artifact.id, className: 'card p-6' }, [
        React.createElement('div', { key: 'header', className: 'flex justify-between items-start mb-4' }, [
          React.createElement('div', { key: 'type', className: 'font-semibold text-crypto-primary' },
            artifact.type.replace('_', ' ').toUpperCase()
          ),
          React.createElement('span', { 
            key: 'status',
            className: `status-indicator status-${artifact.validationStatus}`
          }, artifact.validationStatus.toUpperCase())
        ]),
        React.createElement('div', { key: 'details', className: 'space-y-2 text-sm' }, [
          React.createElement('div', { key: 'crypto' }, 
            React.createElement('strong', {}, 'Cryptocurrency: '), 
            artifact.metadata.cryptocurrency.name
          ),
          React.createElement('div', { key: 'confidence' }, 
            React.createElement('strong', {}, 'Confidence: '), 
            `${(artifact.metadata.confidence * 100).toFixed(0)}%`
          ),
          React.createElement('div', { key: 'source' }, 
            React.createElement('strong', {}, 'Source: '), 
            artifact.source.type.replace('_', ' ')
          ),
          artifact.source.path && React.createElement('div', { key: 'path' }, 
            React.createElement('strong', {}, 'Path: '), 
            artifact.source.path
          )
        ]),
        React.createElement('div', { 
          key: 'data',
          className: 'mt-4 bg-crypto-darker p-3 rounded text-mono text-xs text-gray-300 break-all'
        }, artifact.raw.length > 100 ? 
          artifact.raw.substring(0, 50) + '...' + artifact.raw.substring(artifact.raw.length - 20) :
          artifact.raw
        ),
        artifact.balanceInfo && parseFloat(artifact.balanceInfo.balance) > 0 && 
          React.createElement('div', {
            key: 'balance',
            className: 'mt-4 balance-highlight p-3 rounded'
          }, `💰 Balance: ${artifact.balanceInfo.balance} ${artifact.balanceInfo.currency}`)
      ])
    )
  );
}

// ProgressModal Component  
export function ProgressModal({ progress, onClose }: {
  progress: any;
  onClose: () => void;
}) {
  const progressPercent = progress.totalFiles > 0 ? 
    Math.round((progress.filesScanned / progress.totalFiles) * 100) : 0;

  return React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50' },
    React.createElement('div', { className: 'card p-8 max-w-md w-full mx-4' }, [
      React.createElement('h3', { 
        key: 'title',
        className: 'text-lg font-semibold text-crypto-primary mb-4'
      }, 'Scanning Progress'),
      React.createElement('div', { key: 'progress', className: 'mb-4' }, [
        React.createElement('div', { 
          key: 'info',
          className: 'text-sm text-gray-400 mb-2'
        }, `Phase: ${progress.phase} | Files: ${progress.filesScanned}/${progress.totalFiles}`),
        React.createElement('div', { key: 'bar', className: 'w-full bg-crypto-light rounded-full h-3' },
          React.createElement('div', {
            className: 'bg-crypto-primary h-3 rounded-full transition-all duration-300',
            style: { width: `${progressPercent}%` }
          })
        ),
        React.createElement('div', { 
          key: 'percent',
          className: 'text-sm text-gray-400 mt-2'
        }, `${progressPercent}% complete`)
      ]),
      progress.currentFile && React.createElement('div', {
        key: 'current',
        className: 'text-xs text-gray-500 truncate'
      }, `Current: ${progress.currentFile}`)
    ])
  );
}

// Toast Component
export function Toast({ type, message, onClose }: {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose: () => void;
}) {
  const colors = {
    success: 'bg-crypto-success',
    error: 'bg-crypto-error', 
    warning: 'bg-crypto-warning',
    info: 'bg-crypto-info'
  };

  React.useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return React.createElement('div', { className: 'fixed top-4 right-4 z-50 slide-up' },
    React.createElement('div', { className: `${colors[type]} text-white p-4 rounded-lg shadow-lg max-w-sm` },
      React.createElement('div', { className: 'flex justify-between items-start' }, [
        React.createElement('p', { key: 'text', className: 'text-sm' }, message),
        React.createElement('button', {
          key: 'close',
          onClick: onClose,
          className: 'ml-4 text-white/70 hover:text-white'
        }, '×')
      ])
    )
  );
}
