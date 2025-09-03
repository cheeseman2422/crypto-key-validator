// Simple implementations for remaining components

import React, { useState } from 'react';
import { Artifact } from '../hooks/useAppState';

// Enhanced DirectInput Component with validation UI
export function DirectInput({ onToast, refreshData }: {
  onToast: (type: string, message: string) => void;
  refreshData: () => Promise<void>;
}) {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationPreview, setValidationPreview] = useState<any>(null);
  const [showExamples, setShowExamples] = useState(false);

  // Real-time validation preview
  React.useEffect(() => {
    if (!input.trim()) {
      setValidationPreview(null);
      return;
    }

    const lines = input.trim().split('\n').filter(line => line.trim());
    const preview = {
      lineCount: lines.length,
      potentialBitcoinAddresses: lines.filter(line => 
        /^(1|3|bc1|tb1)[a-zA-HJ-NP-Z0-9]{25,62}$/.test(line.trim())
      ).length,
      potentialPrivateKeys: lines.filter(line => 
        /^[a-fA-F0-9]{64}$/.test(line.trim()) || /^[KL][a-zA-HJ-NP-Z0-9]{51}$/.test(line.trim())
      ).length,
      potentialSeedPhrases: lines.filter(line => {
        const words = line.trim().toLowerCase().split(/\s+/);
        return [12, 15, 18, 21, 24].includes(words.length);
      }).length
    };
    setValidationPreview(preview);
  }, [input]);

  const handleSubmit = async () => {
    if (!input.trim()) {
      onToast('warning', 'Please enter some data to validate');
      return;
    }

    setIsProcessing(true);
    try {
      onToast('info', 'Processing input...');
      const result = await window.cryptoValidator.processDirectInput(input);
      await refreshData();
      onToast('success', `Successfully processed ${result?.length || 0} artifact(s)`);
      setInput('');
      setValidationPreview(null);
    } catch (error: any) {
      onToast('error', `Processing failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const insertExample = (example: string) => {
    setInput(example);
    setShowExamples(false);
  };

  const examples = {
    'Bitcoin Address': 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
    'Bitcoin Private Key (WIF)': 'KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn',
    'Seed Phrase (12 words)': 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    'Multiple Items': `bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4
KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn
abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about`
  };

  return React.createElement('div', { className: 'card p-6' }, [
    React.createElement('div', { key: 'header', className: 'flex justify-between items-center mb-4' }, [
      React.createElement('h3', { className: 'text-lg font-semibold text-crypto-primary' }, 'Direct Input Validation'),
      React.createElement('button', {
        onClick: () => setShowExamples(!showExamples),
        className: 'text-sm text-crypto-primary hover:text-crypto-primary-light'
      }, showExamples ? 'Hide Examples' : 'Show Examples')
    ]),
    
    // Examples dropdown
    showExamples && React.createElement('div', { key: 'examples', className: 'mb-4 p-4 bg-crypto-darker rounded-lg' }, [
      React.createElement('h4', { className: 'text-sm font-semibold mb-2 text-gray-300' }, 'Click to insert example:'),
      ...Object.entries(examples).map(([label, example]) => 
        React.createElement('button', {
          key: label,
          onClick: () => insertExample(example),
          className: 'block w-full text-left text-xs p-2 hover:bg-crypto-light rounded mb-1 text-gray-400 hover:text-white'
        }, `${label}: ${example.substring(0, 50)}${example.length > 50 ? '...' : ''}`)
      )
    ]),

    React.createElement('div', { key: 'input-container', className: 'relative' }, [
      React.createElement('textarea', {
        value: input,
        onChange: (e: any) => setInput(e.target.value),
        className: 'w-full h-40 bg-crypto-dark border border-crypto-light rounded-lg p-4 text-mono text-sm resize-vertical focus:border-crypto-primary focus:ring-1 focus:ring-crypto-primary',
        placeholder: 'Paste Bitcoin addresses, private keys, or seed phrases here...\n\nSupported formats:\n• Bitcoin addresses (legacy, SegWit, Taproot)\n• Private keys (WIF or hex format)\n• BIP39 seed phrases (12-24 words)\n• Multiple items (one per line)',
        disabled: isProcessing
      }),
      
      // Input validation preview
      validationPreview && React.createElement('div', { 
        key: 'preview',
        className: 'mt-2 p-3 bg-crypto-darker rounded text-xs space-y-1'
      }, [
        React.createElement('div', { className: 'text-gray-400' }, `📝 ${validationPreview.lineCount} line(s) detected`),
        validationPreview.potentialBitcoinAddresses > 0 && React.createElement('div', { className: 'text-crypto-primary' }, 
          `🏠 ${validationPreview.potentialBitcoinAddresses} potential Bitcoin address(es)`),
        validationPreview.potentialPrivateKeys > 0 && React.createElement('div', { className: 'text-crypto-warning' }, 
          `🔑 ${validationPreview.potentialPrivateKeys} potential private key(s)`),
        validationPreview.potentialSeedPhrases > 0 && React.createElement('div', { className: 'text-crypto-success' }, 
          `🌱 ${validationPreview.potentialSeedPhrases} potential seed phrase(s)`)
      ])
    ]),

    React.createElement('div', { key: 'actions', className: 'flex gap-3 mt-4' }, [
      React.createElement('button', {
        onClick: handleSubmit,
        disabled: !input.trim() || isProcessing,
        className: 'btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
      }, [
        isProcessing && React.createElement('div', { className: 'w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' }),
        isProcessing ? 'Processing...' : 'Validate Input'
      ]),
      React.createElement('button', {
        onClick: () => { setInput(''); setValidationPreview(null); },
        disabled: !input || isProcessing,
        className: 'btn-secondary disabled:opacity-50 disabled:cursor-not-allowed'
      }, 'Clear')
    ])
  ]);
}

// Enhanced ArtifactList Component with filtering and detailed display
export function ArtifactList({ artifacts }: { artifacts: Artifact[] }) {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showExport, setShowExport] = useState(false);
  const [expandedArtifacts, setExpandedArtifacts] = useState(new Set());

  // Filter and sort artifacts
  const filteredArtifacts = React.useMemo(() => {
    let filtered = artifacts;
    
    // Apply filters
    if (filter !== 'all') {
      filtered = artifacts.filter(a => {
        switch (filter) {
          case 'valid': return a.validationStatus === 'valid';
          case 'invalid': return a.validationStatus === 'invalid';
          case 'addresses': return a.type === 'address';
          case 'private_keys': return a.type === 'private_key';
          case 'seed_phrases': return a.type === 'seed_phrase';
          case 'with_balance': return a.balanceInfo && parseFloat(a.balanceInfo.balance) > 0;
          default: return true;
        }
      });
    }
    
    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'type': return a.type.localeCompare(b.type);
        case 'confidence': return b.metadata.confidence - a.metadata.confidence;
        default: return 0;
      }
    });
  }, [artifacts, filter, sortBy]);

  const toggleExpanded = (artifactId: string) => {
    const newExpanded = new Set(expandedArtifacts);
    if (newExpanded.has(artifactId)) {
      newExpanded.delete(artifactId);
    } else {
      newExpanded.add(artifactId);
    }
    setExpandedArtifacts(newExpanded);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (artifacts.length === 0) {
    return React.createElement('div', { className: 'p-8 text-center text-gray-400' }, [
      React.createElement('div', { key: 'icon', className: 'text-6xl mb-4' }, '📂'),
      React.createElement('h3', { key: 'title', className: 'text-lg font-semibold mb-2' }, 'No Results Yet'),
      React.createElement('p', { key: 'desc' }, 'Scan files or paste cryptocurrency data to get started.'),
      React.createElement('div', { key: 'tips', className: 'mt-4 text-sm space-y-1' }, [
        React.createElement('p', {}, '• Use the "Scan Files" feature to search your system'),
        React.createElement('p', {}, '• Paste Bitcoin addresses, private keys, or seed phrases'),
        React.createElement('p', {}, '• Drag and drop files into the app')
      ])
    ]);
  }

  const stats = {
    total: artifacts.length,
    valid: artifacts.filter(a => a.validationStatus === 'valid').length,
    addresses: artifacts.filter(a => a.type === 'address').length,
    privateKeys: artifacts.filter(a => a.type === 'private_key').length,
    seedPhrases: artifacts.filter(a => a.type === 'seed_phrase').length,
    withBalance: artifacts.filter(a => a.balanceInfo && parseFloat(a.balanceInfo.balance) > 0).length
  };

  return React.createElement('div', { className: 'flex flex-col h-full' }, [
    // Header with filters and stats
    React.createElement('div', { key: 'header', className: 'p-6 border-b border-crypto-light bg-crypto-gray' }, [
      React.createElement('div', { className: 'flex justify-between items-start mb-4' }, [
        React.createElement('h3', { className: 'text-lg font-semibold text-crypto-primary' }, 'Validation Results'),
        React.createElement('button', {
          onClick: () => setShowExport(!showExport),
          className: 'btn-secondary text-sm'
        }, '📤 Export')
      ]),
      
      // Quick stats
      React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-6 gap-3 mb-4 text-xs' }, [
        React.createElement('div', { key: 'total', className: 'bg-crypto-dark p-2 rounded text-center' }, [
          React.createElement('div', { className: 'font-semibold text-crypto-primary' }, stats.total),
          React.createElement('div', { className: 'text-gray-400' }, 'Total')
        ]),
        React.createElement('div', { key: 'valid', className: 'bg-crypto-dark p-2 rounded text-center' }, [
          React.createElement('div', { className: 'font-semibold text-green-400' }, stats.valid),
          React.createElement('div', { className: 'text-gray-400' }, 'Valid')
        ]),
        React.createElement('div', { key: 'addresses', className: 'bg-crypto-dark p-2 rounded text-center' }, [
          React.createElement('div', { className: 'font-semibold text-blue-400' }, stats.addresses),
          React.createElement('div', { className: 'text-gray-400' }, 'Addresses')
        ]),
        React.createElement('div', { key: 'keys', className: 'bg-crypto-dark p-2 rounded text-center' }, [
          React.createElement('div', { className: 'font-semibold text-yellow-400' }, stats.privateKeys),
          React.createElement('div', { className: 'text-gray-400' }, 'Keys')
        ]),
        React.createElement('div', { key: 'seeds', className: 'bg-crypto-dark p-2 rounded text-center' }, [
          React.createElement('div', { className: 'font-semibold text-purple-400' }, stats.seedPhrases),
          React.createElement('div', { className: 'text-gray-400' }, 'Seeds')
        ]),
        React.createElement('div', { key: 'balance', className: 'bg-crypto-dark p-2 rounded text-center' }, [
          React.createElement('div', { className: 'font-semibold text-green-400' }, stats.withBalance),
          React.createElement('div', { className: 'text-gray-400' }, 'Balance')
        ])
      ]),
      
      // Filters and sorting
      React.createElement('div', { className: 'flex flex-wrap gap-4 text-sm' }, [
        React.createElement('div', { key: 'filter' }, [
          React.createElement('label', { className: 'text-gray-400 mr-2' }, 'Filter:'),
          React.createElement('select', {
            value: filter,
            onChange: (e: any) => setFilter(e.target.value),
            className: 'bg-crypto-dark border border-crypto-light rounded px-2 py-1 text-white'
          }, [
            React.createElement('option', { key: 'all', value: 'all' }, 'All'),
            React.createElement('option', { key: 'valid', value: 'valid' }, 'Valid Only'),
            React.createElement('option', { key: 'invalid', value: 'invalid' }, 'Invalid Only'),
            React.createElement('option', { key: 'addresses', value: 'addresses' }, 'Addresses'),
            React.createElement('option', { key: 'private_keys', value: 'private_keys' }, 'Private Keys'),
            React.createElement('option', { key: 'seed_phrases', value: 'seed_phrases' }, 'Seed Phrases'),
            React.createElement('option', { key: 'with_balance', value: 'with_balance' }, 'With Balance')
          ])
        ]),
        React.createElement('div', { key: 'sort' }, [
          React.createElement('label', { className: 'text-gray-400 mr-2' }, 'Sort:'),
          React.createElement('select', {
            value: sortBy,
            onChange: (e: any) => setSortBy(e.target.value),
            className: 'bg-crypto-dark border border-crypto-light rounded px-2 py-1 text-white'
          }, [
            React.createElement('option', { key: 'newest', value: 'newest' }, 'Newest First'),
            React.createElement('option', { key: 'oldest', value: 'oldest' }, 'Oldest First'),
            React.createElement('option', { key: 'type', value: 'type' }, 'By Type'),
            React.createElement('option', { key: 'confidence', value: 'confidence' }, 'By Confidence')
          ])
        ]),
        React.createElement('div', { key: 'count', className: 'text-gray-400 self-center' }, 
          `Showing ${filteredArtifacts.length} of ${artifacts.length} artifacts`)
      ])
    ]),
    
    // Export panel
    showExport && React.createElement('div', { key: 'export', className: 'p-4 bg-crypto-darker border-b border-crypto-light' }, [
      React.createElement('h4', { className: 'font-semibold mb-2' }, 'Export Results'),
      React.createElement('div', { className: 'flex gap-2' }, [
        React.createElement('button', {
          onClick: () => window.cryptoValidator.exportResults('json'),
          className: 'btn-secondary text-sm'
        }, 'JSON'),
        React.createElement('button', {
          onClick: () => window.cryptoValidator.exportResults('csv'),
          className: 'btn-secondary text-sm'
        }, 'CSV'),
        React.createElement('button', {
          onClick: () => window.cryptoValidator.exportResults('html'),
          className: 'btn-secondary text-sm'
        }, 'HTML'),
        React.createElement('button', {
          onClick: () => copyToClipboard(JSON.stringify(filteredArtifacts, null, 2)),
          className: 'btn-secondary text-sm'
        }, 'Copy to Clipboard')
      ])
    ]),
    
    // Results list
    React.createElement('div', { key: 'results', className: 'flex-1 overflow-y-auto p-6 space-y-4' },
      filteredArtifacts.map((artifact) => {
        const isExpanded = expandedArtifacts.has(artifact.id);
        const statusColor = {
          valid: 'text-green-400 bg-green-400/10',
          invalid: 'text-red-400 bg-red-400/10',
          pending: 'text-yellow-400 bg-yellow-400/10',
          error: 'text-red-500 bg-red-500/10'
        }[artifact.validationStatus] || 'text-gray-400 bg-gray-400/10';
        
        const typeIcon = {
          address: '🏠',
          private_key: '🔑',
          seed_phrase: '🌱',
          wallet_file: '💼'
        }[artifact.type] || '📄';
        
        return React.createElement('div', { 
          key: artifact.id, 
          className: 'card p-6 hover:bg-crypto-gray/50 transition-colors'
        }, [
          // Header
          React.createElement('div', { key: 'header', className: 'flex justify-between items-start mb-4' }, [
            React.createElement('div', { className: 'flex items-center gap-3' }, [
              React.createElement('span', { className: 'text-2xl' }, typeIcon),
              React.createElement('div', {}, [
                React.createElement('div', { className: 'font-semibold text-crypto-primary' },
                  artifact.type.replace('_', ' ').toUpperCase()
                ),
                React.createElement('div', { className: 'text-xs text-gray-400' },
                  `Confidence: ${(artifact.metadata.confidence * 100).toFixed(0)}%`
                )
              ])
            ]),
            React.createElement('div', { className: 'flex items-center gap-2' }, [
              React.createElement('span', { className: `px-3 py-1 rounded-full text-xs font-semibold ${statusColor}` },
                artifact.validationStatus.toUpperCase()
              ),
              React.createElement('button', {
                onClick: () => toggleExpanded(artifact.id),
                className: 'text-gray-400 hover:text-white p-1'
              }, isExpanded ? '▼' : '▶')
            ])
          ]),
          
          // Basic info (always visible)
          React.createElement('div', { key: 'basic', className: 'space-y-2 text-sm mb-4' }, [
            React.createElement('div', { className: 'flex justify-between' }, [
              React.createElement('span', { className: 'text-gray-400' }, 'Cryptocurrency:'),
              React.createElement('span', {}, artifact.metadata.cryptocurrency.name)
            ]),
            React.createElement('div', { className: 'flex justify-between' }, [
              React.createElement('span', { className: 'text-gray-400' }, 'Source:'),
              React.createElement('span', {}, artifact.source.type.replace('_', ' '))
            ]),
            artifact.source.path && React.createElement('div', { className: 'flex justify-between' }, [
              React.createElement('span', { className: 'text-gray-400' }, 'Path:'),
              React.createElement('span', { className: 'text-mono text-xs break-all' }, artifact.source.path)
            ])
          ]),
          
          // Data preview (always visible but truncated)
          React.createElement('div', { key: 'preview', className: 'mb-4' }, [
            React.createElement('div', { className: 'flex justify-between items-center mb-2' }, [
              React.createElement('span', { className: 'text-gray-400 text-sm' }, 'Data:'),
              React.createElement('button', {
                onClick: () => copyToClipboard(artifact.raw),
                className: 'text-xs text-crypto-primary hover:text-crypto-primary-light'
              }, '📋 Copy')
            ]),
            React.createElement('div', { 
              className: 'bg-crypto-darker p-3 rounded text-mono text-xs text-gray-300 break-all'
            }, isExpanded || artifact.raw.length <= 100 ? 
              artifact.raw :
              artifact.raw.substring(0, 50) + '...' + artifact.raw.substring(artifact.raw.length - 20)
            )
          ]),
          
          // Expanded details
          isExpanded && React.createElement('div', { key: 'expanded', className: 'space-y-4 pt-4 border-t border-crypto-light' }, [
            // Timestamps
            React.createElement('div', { className: 'grid grid-cols-2 gap-4 text-xs' }, [
              React.createElement('div', {}, [
                React.createElement('div', { className: 'text-gray-400' }, 'Created:'),
                React.createElement('div', {}, new Date(artifact.createdAt).toLocaleString())
              ]),
              React.createElement('div', {}, [
                React.createElement('div', { className: 'text-gray-400' }, 'Updated:'),
                React.createElement('div', {}, new Date(artifact.updatedAt).toLocaleString())
              ])
            ]),
            
            // Additional metadata
            artifact.metadata.tags && artifact.metadata.tags.length > 0 && React.createElement('div', {}, [
              React.createElement('div', { className: 'text-gray-400 text-sm mb-2' }, 'Tags:'),
              React.createElement('div', { className: 'flex flex-wrap gap-1' },
                artifact.metadata.tags.map(tag => 
                  React.createElement('span', {
                    key: tag,
                    className: 'px-2 py-1 bg-crypto-primary/20 text-crypto-primary rounded-full text-xs'
                  }, tag)
                )
              )
            ])
          ]),
          
          // Balance info (if available)
          artifact.balanceInfo && parseFloat(artifact.balanceInfo.balance) > 0 && 
            React.createElement('div', {
              key: 'balance',
              className: 'mt-4 balance-highlight p-3 rounded border border-green-500/30'
            }, [
              React.createElement('div', { className: 'flex justify-between items-center' }, [
                React.createElement('span', { className: 'text-green-400 font-semibold' }, 
                  `💰 Balance: ${artifact.balanceInfo.balance} ${artifact.balanceInfo.currency}`),
                React.createElement('span', { className: 'text-xs text-gray-400' },
                  `Updated: ${new Date(artifact.balanceInfo.lastUpdated).toLocaleDateString()}`)
              ])
            ])
        ]);
      })
    )
  ]);
}

// Enhanced ProgressModal Component with detailed indicators
export function ProgressModal({ progress, onClose }: {
  progress: any;
  onClose: () => void;
}) {
  const [startTime] = React.useState(Date.now());
  const [showDetails, setShowDetails] = React.useState(false);
  
  // Calculate progress percentages
  const fileProgress = progress.totalFiles > 0 ? 
    Math.round((progress.filesScanned / progress.totalFiles) * 100) : 0;
  const artifactProgress = progress.artifactsFound > 0 && progress.validatedArtifacts >= 0 ?
    Math.round((progress.validatedArtifacts / progress.artifactsFound) * 100) : 0;
  
  // Calculate speeds and time estimates
  const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
  const filesPerSecond = elapsedSeconds > 0 ? (progress.filesScanned / elapsedSeconds).toFixed(1) : '0';
  const bytesPerSecond = elapsedSeconds > 0 && progress.bytesProcessed ? 
    (progress.bytesProcessed / elapsedSeconds / 1024 / 1024).toFixed(1) : '0';
  
  const remainingFiles = progress.totalFiles - progress.filesScanned;
  const estimatedSeconds = parseFloat(filesPerSecond) > 0 ? 
    Math.round(remainingFiles / parseFloat(filesPerSecond)) : 0;
  
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

  const phaseDescriptions = {
    initializing: 'Preparing scan...',
    scanning: 'Scanning filesystem for files',
    parsing: 'Parsing files for crypto artifacts', 
    validating: 'Validating discovered artifacts',
    checking_balances: 'Checking balances (disabled)',
    completed: 'Scan completed!',
    cancelled: 'Scan was cancelled',
    error: 'An error occurred during scanning'
  };

  return React.createElement('div', { 
    className: 'fixed inset-0 bg-black/70 flex items-center justify-center z-50',
    onClick: (e: any) => e.target === e.currentTarget && progress.phase === 'completed' && onClose()
  },
    React.createElement('div', { className: 'card p-8 max-w-lg w-full mx-4' }, [
      // Header
      React.createElement('div', { key: 'header', className: 'flex justify-between items-start mb-6' }, [
        React.createElement('div', {}, [
          React.createElement('h3', { className: 'text-xl font-semibold text-crypto-primary mb-2' }, 
            progress.phase === 'completed' ? '✅ Scan Complete' : '🔍 Scanning in Progress'
          ),
          React.createElement('p', { className: 'text-sm text-gray-400' },
            phaseDescriptions[progress.phase] || 'Processing...'
          )
        ]),
        progress.phase === 'completed' && React.createElement('button', {
          onClick: onClose,
          className: 'text-gray-400 hover:text-white text-2xl'
        }, '×')
      ]),
      
      // Main progress indicators
      React.createElement('div', { key: 'progress', className: 'space-y-4' }, [
        // File scanning progress
        React.createElement('div', {}, [
          React.createElement('div', { className: 'flex justify-between text-sm mb-2' }, [
            React.createElement('span', {}, 'Files Scanned'),
            React.createElement('span', { className: 'font-mono' }, 
              `${progress.filesScanned}/${progress.totalFiles} (${fileProgress}%)`
            )
          ]),
          React.createElement('div', { className: 'w-full bg-crypto-light rounded-full h-2' },
            React.createElement('div', {
              className: 'bg-blue-500 h-2 rounded-full transition-all duration-300',
              style: { width: `${fileProgress}%` }
            })
          )
        ]),
        
        // Artifact validation progress (if artifacts found)
        progress.artifactsFound > 0 && React.createElement('div', {}, [
          React.createElement('div', { className: 'flex justify-between text-sm mb-2' }, [
            React.createElement('span', {}, 'Artifacts Validated'),
            React.createElement('span', { className: 'font-mono' }, 
              `${progress.validatedArtifacts}/${progress.artifactsFound} (${artifactProgress}%)`
            )
          ]),
          React.createElement('div', { className: 'w-full bg-crypto-light rounded-full h-2' },
            React.createElement('div', {
              className: 'bg-green-500 h-2 rounded-full transition-all duration-300',
              style: { width: `${artifactProgress}%` }
            })
          )
        ]),
        
        // Statistics grid
        React.createElement('div', { className: 'grid grid-cols-2 gap-4 text-xs' }, [
          React.createElement('div', { key: 'time', className: 'bg-crypto-darker p-3 rounded' }, [
            React.createElement('div', { className: 'text-gray-400' }, 'Elapsed Time'),
            React.createElement('div', { className: 'font-semibold text-white' }, formatTime(elapsedSeconds))
          ]),
          estimatedSeconds > 0 && progress.phase !== 'completed' && React.createElement('div', { key: 'eta', className: 'bg-crypto-darker p-3 rounded' }, [
            React.createElement('div', { className: 'text-gray-400' }, 'Estimated Remaining'),
            React.createElement('div', { className: 'font-semibold text-white' }, formatTime(estimatedSeconds))
          ]),
          React.createElement('div', { key: 'speed', className: 'bg-crypto-darker p-3 rounded' }, [
            React.createElement('div', { className: 'text-gray-400' }, 'Speed'),
            React.createElement('div', { className: 'font-semibold text-white' }, `${filesPerSecond} files/s`)
          ]),
          progress.bytesProcessed > 0 && React.createElement('div', { key: 'throughput', className: 'bg-crypto-darker p-3 rounded' }, [
            React.createElement('div', { className: 'text-gray-400' }, 'Data Rate'),
            React.createElement('div', { className: 'font-semibold text-white' }, `${bytesPerSecond} MB/s`)
          ])
        ]),
        
        // Results summary (if artifacts found)
        progress.artifactsFound > 0 && React.createElement('div', { 
          className: 'bg-crypto-success/10 border border-crypto-success/30 rounded-lg p-4'
        }, [
          React.createElement('div', { className: 'flex justify-between items-center mb-2' }, [
            React.createElement('span', { className: 'text-crypto-success font-semibold' }, 
              `🎯 ${progress.artifactsFound} Artifacts Discovered`),
            progress.phase === 'completed' && React.createElement('span', { className: 'text-xs text-gray-400' },
              `${progress.validatedArtifacts} validated`
            )
          ]),
          progress.phase === 'completed' && React.createElement('p', { className: 'text-xs text-gray-300' },
            'Check the Results tab to view detailed information about discovered artifacts.'
          )
        ])
      ]),
      
      // Current file indicator
      progress.currentFile && progress.phase !== 'completed' && React.createElement('div', {
        key: 'current',
        className: 'mt-4 p-3 bg-crypto-darker rounded'
      }, [
        React.createElement('div', { className: 'text-xs text-gray-400 mb-1' }, 'Currently Processing:'),
        React.createElement('div', { className: 'text-xs font-mono text-gray-300 truncate' }, 
          progress.currentFile
        )
      ]),
      
      // Advanced details toggle
      React.createElement('div', { key: 'details', className: 'mt-4' }, [
        React.createElement('button', {
          onClick: () => setShowDetails(!showDetails),
          className: 'text-xs text-crypto-primary hover:text-crypto-primary-light'
        }, showDetails ? 'Hide Details' : 'Show Details'),
        
        showDetails && React.createElement('div', { className: 'mt-3 space-y-2 text-xs text-gray-400' }, [
          React.createElement('div', { className: 'flex justify-between' }, [
            React.createElement('span', {}, 'Phase:'),
            React.createElement('span', { className: 'font-mono' }, progress.phase || 'unknown')
          ]),
          progress.bytesProcessed > 0 && React.createElement('div', { className: 'flex justify-between' }, [
            React.createElement('span', {}, 'Data Processed:'),
            React.createElement('span', { className: 'font-mono' }, formatBytes(progress.bytesProcessed))
          ]),
          progress.totalBytes > 0 && React.createElement('div', { className: 'flex justify-between' }, [
            React.createElement('span', {}, 'Total Data Size:'),
            React.createElement('span', { className: 'font-mono' }, formatBytes(progress.totalBytes))
          ])
        ])
      ]),
      
      // Action buttons
      React.createElement('div', { key: 'actions', className: 'flex justify-end gap-3 mt-6' }, [
        progress.phase === 'completed' && React.createElement('button', {
          onClick: onClose,
          className: 'btn-primary'
        }, 'View Results'),
        progress.phase !== 'completed' && progress.phase !== 'error' && React.createElement('button', {
          onClick: () => {/* TODO: Implement cancel */},
          className: 'btn-secondary text-sm'
        }, 'Cancel')
      ])
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
