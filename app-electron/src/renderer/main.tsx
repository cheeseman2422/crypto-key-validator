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

const rootElem = document.getElementById('root') as HTMLElement;
const root = ReactDOM.createRoot(rootElem);

function showErrorOverlay(error: any) {
  rootElem.innerHTML = `<div style="color:red;font-size:2em;padding:2em;text-align:center;">Renderer error:<br>${error?.message || error}</div>`;
}

window.addEventListener('error', (e) => {
  showErrorOverlay(e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  showErrorOverlay(e.reason || e);
});

try {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (err) {
  showErrorOverlay(err);
}
