import React, { useState, useEffect } from 'react';
import { 
  FolderIcon, 
  DocumentIcon, 
  TrashIcon, 
  ArrowDownTrayIcon,
  ClockIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface SidebarProps {
  onToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export function Sidebar({ onToast }: SidebarProps) {
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const [systemInfo, setSystemInfo] = useState<any>(null);

  useEffect(() => {
    loadRecentFiles();
    loadSystemInfo();
  }, []);

  const loadRecentFiles = async () => {
    try {
      const files = await window.cryptoValidator?.getRecentFiles() || [];
      setRecentFiles(files);
    } catch (error) {
      console.error('Failed to load recent files:', error);
    }
  };

  const loadSystemInfo = async () => {
    try {
      const [version, sysInfo] = await Promise.all([
        window.cryptoValidator?.getAppVersion() || 'Unknown',
        window.cryptoValidator?.getSystemInfo() || {}
      ]);
      
      setSystemInfo({ version, ...sysInfo });
    } catch (error) {
      console.error('Failed to load system info:', error);
    }
  };

  const handleScanAutopsy = async () => {
    try {
      const result = await window.cryptoValidator.selectFile();
      if (result.canceled || !result.filePaths.length) {
        return;
      }

      const filePath = result.filePaths[0];
      onToast('info', 'Starting Autopsy case scan...');
      
      await window.cryptoValidator.scanAutopsyCase(filePath);
      await window.cryptoValidator.addRecentFile(filePath);
      await loadRecentFiles();
      
    } catch (error: any) {
      console.error('Autopsy scan failed:', error);
      onToast('error', `Scan failed: ${error.message}`);
    }
  };

  const handleScanDirectory = async () => {
    try {
      const result = await window.cryptoValidator.selectDirectory();
      if (result.canceled || !result.filePaths.length) {
        return;
      }

      const dirPath = result.filePaths[0];
      onToast('info', 'Starting directory scan...');
      
      const scanConfig = {
        deepScan: true,
        maxFileSize: 100 * 1024 * 1024,
        fileTypes: ['.dat', '.wallet', '.json', '.keys', '.txt']
      };
      
      await window.cryptoValidator.scanFileSystem(dirPath, scanConfig);
      
    } catch (error: any) {
      console.error('Directory scan failed:', error);
      onToast('error', `Scan failed: ${error.message}`);
    }
  };

  const handleExport = async () => {
    try {
      const result = await window.cryptoValidator.saveFile('crypto-results.json');
      if (!result.canceled && result.filePath) {
        onToast('success', `Results exported to: ${result.filePath}`);
      }
    } catch (error: any) {
      console.error('Export failed:', error);
      onToast('error', `Export failed: ${error.message}`);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      return;
    }

    try {
      await window.cryptoValidator.clearAll();
      onToast('info', 'All data cleared');
      await loadRecentFiles();
    } catch (error: any) {
      console.error('Clear all failed:', error);
      onToast('error', `Failed to clear data: ${error.message}`);
    }
  };

  const openRecentFile = async (filePath: string) => {
    try {
      onToast('info', 'Opening recent file...');
      await window.cryptoValidator.scanAutopsyCase(filePath);
    } catch (error: any) {
      console.error('Failed to open recent file:', error);
      onToast('error', `Failed to open file: ${error.message}`);
    }
  };

  return (
    <div className="w-80 bg-crypto-gray border-r border-crypto-light p-6 flex flex-col h-full">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-crypto-primary mb-2">
          CryptoKeyFinder
        </h2>
        <p className="text-sm text-gray-400">
          Offline key validation & balance checker
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-3 mb-8">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">ACTIONS</h3>
        
        <button
          onClick={handleScanAutopsy}
          className="w-full btn-primary flex items-center gap-3 text-left"
        >
          <DocumentIcon className="w-5 h-5" />
          Scan Autopsy Case
        </button>
        
        <button
          onClick={handleScanDirectory}
          className="w-full btn-primary flex items-center gap-3 text-left"
        >
          <FolderIcon className="w-5 h-5" />
          Scan Directory
        </button>
        
        <div className="border-t border-crypto-light my-4"></div>
        
        <button
          onClick={handleExport}
          className="w-full btn-secondary flex items-center gap-3 text-left"
        >
          <ArrowDownTrayIcon className="w-5 h-5" />
          Export Results
        </button>
        
        <button
          onClick={handleClearAll}
          className="w-full btn-danger flex items-center gap-3 text-left"
        >
          <TrashIcon className="w-5 h-5" />
          Clear All Data
        </button>
      </div>

      {/* Recent Files */}
      <div className="mb-8 flex-1 overflow-hidden">
        <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <ClockIcon className="w-4 h-4" />
          RECENT FILES
        </h3>
        
        <div className="space-y-2 overflow-y-auto max-h-48">
          {recentFiles.length > 0 ? (
            recentFiles.slice(0, 8).map((file, index) => {
              const fileName = file.split(/[/\\]/).pop() || file;
              return (
                <button
                  key={index}
                  onClick={() => openRecentFile(file)}
                  className="w-full p-2 rounded-lg bg-crypto-dark hover:bg-crypto-light transition-colors text-left text-sm text-gray-300 hover:text-white truncate"
                  title={file}
                >
                  {fileName}
                </button>
              );
            })
          ) : (
            <p className="text-xs text-gray-500 italic">No recent files</p>
          )}
        </div>
      </div>

      {/* System Info */}
      <div className="mt-auto">
        <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <InformationCircleIcon className="w-4 h-4" />
          SYSTEM INFO
        </h3>
        
        {systemInfo && (
          <div className="space-y-1 text-xs text-gray-400">
            <div>Version: {systemInfo.version}</div>
            <div>Platform: {systemInfo.platform}</div>
            <div>Node: {systemInfo.nodeVersion}</div>
            <div>Electron: v{systemInfo.electronVersion}</div>
          </div>
        )}
      </div>
    </div>
  );
}
