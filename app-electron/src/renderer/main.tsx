import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// TypeScript declarations for window.cryptoValidator
declare global {
  interface Window {
    cryptoValidator: {
      selectFile: () => Promise<{ canceled: boolean; filePaths: string[] }>;
      selectDirectory: () => Promise<{ canceled: boolean; filePaths: string[] }>;
      saveFile: (defaultName: string) => Promise<{ canceled: boolean; filePath?: string }>;
      scanAutopsyCase: (caseDatabasePath: string) => Promise<any[]>;
      scanFileSystem: (rootPath: string, config?: any) => Promise<any[]>;
      processDirectInput: (input: string) => Promise<any[]>;
      getArtifacts: () => Promise<any[]>;
      getStatistics: () => Promise<any>;
      clearAll: () => Promise<void>;
      getBlockchainStatus: () => Promise<any>;
      getConfig: () => Promise<any>;
      setConfig: (config: any) => Promise<boolean>;
      getRecentFiles: () => Promise<string[]>;
      addRecentFile: (filePath: string) => Promise<string[]>;
      getAppVersion: () => Promise<string>;
      getSystemInfo: () => Promise<any>;
      onEngineEvent: (callback: (event: string, data?: any) => void) => void;
      onMenuAction: (callback: (action: string) => void) => void;
      removeAllListeners?: () => void;
    };
  }
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
