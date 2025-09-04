import { contextBridge, ipcRenderer } from 'electron';

// Define the API interface
interface CryptoValidatorAPI {
  // File operations
  selectFile: () => Promise<Electron.OpenDialogReturnValue>;
  selectDirectory: () => Promise<Electron.OpenDialogReturnValue>;
  saveFile: (defaultName: string) => Promise<Electron.SaveDialogReturnValue>;

  // Engine operations
  scanFileSystem: (rootPath: string, config?: any) => Promise<any[]>;
  scanDeepForensic: (targetPath: string, options?: any) => Promise<any[]>;
  processDirectInput: (input: string) => Promise<any[]>;
  getArtifacts: () => Promise<any[]>;
  getStatistics: () => Promise<any>;
  clearAll: () => Promise<void>;
  getBlockchainStatus: () => Promise<any>;

  // Configuration
  getConfig: () => Promise<any>;
  setConfig: (config: any) => Promise<boolean>;
  getRecentFiles: () => Promise<string[]>;
  addRecentFile: (filePath: string) => Promise<string[]>;

  // System info
  getAppVersion: () => Promise<string>;
  getSystemInfo: () => Promise<any>;

  // Event listeners
  onEngineEvent: (callback: (event: string, data?: any) => void) => void;
  onMenuAction: (callback: (action: string) => void) => void;
  removeAllListeners: () => void;
}

// Expose the API to the renderer process
const api: CryptoValidatorAPI = {
  // File operations
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  saveFile: (defaultName: string) => ipcRenderer.invoke('save-file', defaultName),

  // Engine operations
  scanFileSystem: (rootPath: string, config?: any) => ipcRenderer.invoke('engine-scan-filesystem', rootPath, config),
  scanDeepForensic: (targetPath: string, options?: any) => ipcRenderer.invoke('engine-scan-deep-forensic', targetPath, options),
  processDirectInput: (input: string) => ipcRenderer.invoke('engine-process-input', input),
  getArtifacts: () => ipcRenderer.invoke('engine-get-artifacts'),
  getStatistics: () => ipcRenderer.invoke('engine-get-statistics'),
  clearAll: () => ipcRenderer.invoke('engine-clear-all'),
  getBlockchainStatus: () => ipcRenderer.invoke('engine-get-blockchain-status'),

  // Configuration
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (config: any) => ipcRenderer.invoke('set-config', config),
  getRecentFiles: () => ipcRenderer.invoke('get-recent-files'),
  addRecentFile: (filePath: string) => ipcRenderer.invoke('add-recent-file', filePath),

  // System info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // Event listeners
  onEngineEvent: (callback: (event: string, data?: any) => void) => {
    ipcRenderer.on('engine-scan-started', (_, data) => callback('scan-started', data));
    ipcRenderer.on('engine-scan-progress', (_, data) => callback('scan-progress', data));
    ipcRenderer.on('engine-artifact-validated', (_, data) => callback('artifact-validated', data));
    ipcRenderer.on('engine-balance-found', (_, data) => callback('balance-found', data));
    ipcRenderer.on('engine-scan-completed', (_, data) => callback('scan-completed', data));
    ipcRenderer.on('engine-scan-error', (_, data) => callback('scan-error', data));
  },

  onMenuAction: (callback: (action: string) => void) => {
    ipcRenderer.on('menu-scan-directory', () => callback('scan-directory'));
    ipcRenderer.on('menu-export', () => callback('export'));
    ipcRenderer.on('menu-clear-data', () => callback('clear-data'));
    ipcRenderer.on('menu-about', () => callback('about'));
  },

  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('engine-scan-started');
    ipcRenderer.removeAllListeners('engine-scan-progress');
    ipcRenderer.removeAllListeners('engine-artifact-validated');
    ipcRenderer.removeAllListeners('engine-balance-found');
    ipcRenderer.removeAllListeners('engine-scan-completed');
    ipcRenderer.removeAllListeners('engine-scan-error');
    ipcRenderer.removeAllListeners('menu-scan-directory');
    ipcRenderer.removeAllListeners('menu-export');
    ipcRenderer.removeAllListeners('menu-clear-data');
    ipcRenderer.removeAllListeners('menu-about');
  }
};

// Expose the API
contextBridge.exposeInMainWorld('cryptoValidator', api);
