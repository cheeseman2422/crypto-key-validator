import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MainContent } from './components/MainContent';
import { ProgressModal, Toast } from './components/index';
import { useAppState } from './hooks/useAppState';
import { useEngineEvents } from './hooks/useEngineEvents';

function App() {
  const { 
    artifacts, 
    statistics, 
    isScanning, 
    scanProgress, 
    refreshData,
    toast,
    showToast,
    hideToast
  } = useAppState();

  // Set up engine event listeners for progress updates
  const { setupEventListeners } = useEngineEvents();

  useEffect(() => {
    refreshData(); // Load initial data
    setupEventListeners(); // Connect to engine events
  }, [refreshData, setupEventListeners]);

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
