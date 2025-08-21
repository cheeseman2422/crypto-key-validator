import React, { useState } from 'react';
import { 
  XMarkIcon,
  DocumentTextIcon,
  TableCellsIcon,
  CodeBracketIcon,
  DocumentIcon 
} from '@heroicons/react/24/outline';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: string, options: any) => Promise<void>;
  artifactCount: number;
}

export function ExportModal({ isOpen, onClose, onExport, artifactCount }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState('json');
  const [options, setOptions] = useState({
    includePrivateKeys: false,
    includeBalances: true,
    includeMetadata: true,
    truncateKeys: true
  });
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const formats = [
    {
      id: 'json',
      name: 'JSON',
      description: 'Machine-readable format for analysis tools',
      icon: CodeBracketIcon,
      extension: '.json'
    },
    {
      id: 'csv',
      name: 'CSV',
      description: 'Spreadsheet format for Excel/Google Sheets',
      icon: TableCellsIcon,
      extension: '.csv'
    },
    {
      id: 'html',
      name: 'HTML Report',
      description: 'Professional report for presentations',
      icon: DocumentTextIcon,
      extension: '.html'
    },
    {
      id: 'txt',
      name: 'Plain Text',
      description: 'Simple text format for documentation',
      icon: DocumentIcon,
      extension: '.txt'
    }
  ];

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(selectedFormat, options);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="card p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-crypto-primary">Export Results</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-400 mb-4">
            Export {artifactCount} artifacts to your preferred format
          </p>
        </div>

        {/* Format Selection */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-crypto-primary mb-4">Select Format</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formats.map((format) => (
              <button
                key={format.id}
                onClick={() => setSelectedFormat(format.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedFormat === format.id
                    ? 'border-crypto-primary bg-crypto-primary/10'
                    : 'border-crypto-light hover:border-crypto-primary/50'
                }`}
              >
                <div className="flex items-center mb-2">
                  <format.icon className="w-6 h-6 text-crypto-primary mr-3" />
                  <span className="font-semibold">{format.name}</span>
                  <span className="ml-auto text-xs text-gray-500">{format.extension}</span>
                </div>
                <p className="text-sm text-gray-400">{format.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Export Options */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-crypto-primary mb-4">Export Options</h3>
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={options.includeBalances}
                onChange={(e) => setOptions(prev => ({
                  ...prev,
                  includeBalances: e.target.checked
                }))}
                className="mr-3 w-4 h-4 text-crypto-primary"
              />
              <span>Include balance information</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={options.includeMetadata}
                onChange={(e) => setOptions(prev => ({
                  ...prev,
                  includeMetadata: e.target.checked
                }))}
                className="mr-3 w-4 h-4 text-crypto-primary"
              />
              <span>Include detailed metadata</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={options.includePrivateKeys}
                onChange={(e) => setOptions(prev => ({
                  ...prev,
                  includePrivateKeys: e.target.checked
                }))}
                className="mr-3 w-4 h-4 text-crypto-primary"
              />
              <span className="flex items-center">
                Include private keys
                <span className="ml-2 px-2 py-1 text-xs bg-crypto-error/20 text-crypto-error rounded">
                  SENSITIVE
                </span>
              </span>
            </label>

            {options.includePrivateKeys && (
              <div className="ml-7">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.truncateKeys}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      truncateKeys: e.target.checked
                    }))}
                    className="mr-3 w-4 h-4 text-crypto-primary"
                  />
                  <span>Truncate keys for security</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Security Warning */}
        {options.includePrivateKeys && (
          <div className="mb-6 p-4 bg-crypto-error/10 border border-crypto-error/30 rounded-lg">
            <div className="flex items-center mb-2">
              <span className="text-crypto-error font-semibold">⚠️ Security Warning</span>
            </div>
            <p className="text-sm text-crypto-error">
              Including private keys in exports creates security risks. Ensure the export file 
              is stored securely and deleted after use.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="btn-secondary"
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="btn-primary flex items-center"
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <div className="spinner w-4 h-4 mr-2" />
                Exporting...
              </>
            ) : (
              'Export Results'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
