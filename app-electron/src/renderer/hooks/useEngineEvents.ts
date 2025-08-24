import { useEffect, useCallback } from 'react';
import { useAppState } from './useAppState';

export function useEngineEvents() {
  const {
    handleScanStarted,
    handleScanProgress,
    handleScanCompleted,
    handleScanError,
    handleArtifactValidated,
    handleBalanceFound
  } = useAppState();

  const setupEventListeners = useCallback(() => {
    if (!window.cryptoValidator) {
      console.warn('cryptoValidator API not available');
      return;
    }

    // Engine events
    window.cryptoValidator.onEngineEvent((event: string, data?: any) => {
      console.log('Engine event:', event, data);
      
      switch (event) {
        case 'scan-started':
          handleScanStarted();
          break;
        case 'scan-progress':
          handleScanProgress(data);
          break;
        case 'artifact-validated':
          handleArtifactValidated(data);
          break;
        case 'balance-found':
          handleBalanceFound(data);
          break;
        case 'scan-completed':
          handleScanCompleted();
          break;
        case 'scan-error':
          handleScanError(data);
          break;
      }
    });

    // Menu events
    window.cryptoValidator.onMenuAction((action: string) => {
      console.log('Menu action:', action);
      
      switch (action) {
        case 'scan-autopsy':
          handleScanAutopsy();
          break;
        case 'scan-directory':
          handleScanDirectory();
          break;
        case 'export':
          handleExport();
          break;
        case 'clear-data':
          handleClearData();
          break;
        case 'about':
          handleAbout();
          break;
      }
    });

    return () => {
      // Cleanup if needed
      window.cryptoValidator?.removeAllListeners?.();
    };
  }, [
    handleScanStarted,
    handleScanProgress,
    handleScanCompleted,
    handleScanError,
    handleArtifactValidated,
    handleBalanceFound
  ]);

  // Menu action handlers
  const handleScanAutopsy = useCallback(async () => {
    try {
      const result = await window.cryptoValidator.selectFile();
      if (result.canceled || !result.filePaths.length) {
        return;
      }

      const filePath = result.filePaths[0];
      await window.cryptoValidator.scanAutopsyCase(filePath);
      await window.cryptoValidator.addRecentFile(filePath);
    } catch (error) {
      console.error('Autopsy scan failed:', error);
    }
  }, []);

  const handleScanDirectory = useCallback(async () => {
    try {
      const result = await window.cryptoValidator.selectDirectory();
      if (result.canceled || !result.filePaths.length) {
        return;
      }

      const dirPath = result.filePaths[0];
      const scanConfig = {
        deepScan: true,
        maxFileSize: 100 * 1024 * 1024, // 100MB
        fileTypes: ['.dat', '.wallet', '.json', '.keys', '.txt']
      };
      
      await window.cryptoValidator.scanFileSystem(dirPath, scanConfig);
    } catch (error) {
      console.error('Directory scan failed:', error);
    }
  }, []);

  const handleExport = useCallback(async () => {
    try {
      const result = await window.cryptoValidator.saveFile('crypto-results.json');
      if (!result.canceled && result.filePath) {
        console.log('Results exported to:', result.filePath);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, []);

  const handleClearData = useCallback(async () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      try {
        await window.cryptoValidator.clearAll();
      } catch (error) {
        console.error('Clear all failed:', error);
      }
    }
  }, []);

  const handleAbout = useCallback(() => {
    alert(`Crypto Key Validator v1.0.0

A secure, offline Bitcoin key validation and artifact discovery tool.

Built for digital forensics professionals.`);
  }, []);

  return {
    setupEventListeners,
    handleScanAutopsy,
    handleScanDirectory,
    handleExport,
    handleClearData,
    handleAbout
  };
}
