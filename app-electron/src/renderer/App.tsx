import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MainContent } from './components/MainContent';
import { ProgressModal, Toast } from './components/index';
import { useAppState } from './hooks/useAppState';

function App() {
  const { 
    artifacts, 
    statistics, 
    isScanning, 
    scanProgress, 
    refreshData,
    toast,
    showToast,
    hideToast,
    handleScanStarted,
    handleScanProgress,
    handleScanCompleted,
    handleScanError
  } = useAppState();

  useEffect(() => {
    refreshData(); // Load initial data
    
    // Set up engine event listeners directly to use the correct state
    if (window.cryptoValidator) {
      window.cryptoValidator.onEngineEvent((event: string, data?: any) => {
        switch (event) {
          case 'scan-started':
            handleScanStarted();
            break;
          case 'scan-progress':
            handleScanProgress(data);
            break;
          case 'scan-completed':
            handleScanCompleted();
            break;
          case 'scan-error':
            handleScanError(data);
            break;
          case 'artifact-validated':
            // Handle if needed
            break;
          case 'balance-found':
            // Handle if needed (disabled in offline mode)
            break;
        }
      });
    }
  }, [refreshData, handleScanStarted, handleScanProgress, handleScanCompleted, handleScanError]);

  return (
    <div className="flex h-screen bg-crypto-dark text-white overflow-hidden">
      <Sidebar 
        onToast={showToast}
      />
      
      <div className="flex flex-col flex-1">
        <Header statistics={statistics} />
        
        <MainContent 
          artifacts={artifacts}
          refreshData={refreshData}
          onToast={showToast}
        />
      </div>

      {isScanning && (
        <ProgressModal 
          progress={scanProgress}
          onClose={() => {}} 
        />
      )}

      {toast && (
        <Toast 
          type={toast.type}
          message={toast.message}
          onClose={hideToast}
        />
      )}
    </div>
  );
}

export default App;
