const { contextBridge, ipcRenderer } = require('electron');

// Expose secure API to renderer process
contextBridge.exposeInMainWorld('cryptoAPI', {
    // Validate single crypto input
    validateCrypto: (input) => ipcRenderer.invoke('validate-crypto', input),
    
    // Validate multiple crypto inputs
    batchValidate: (inputs) => ipcRenderer.invoke('batch-validate', inputs),
    
    // File scanning functions
    scanFiles: (options) => ipcRenderer.invoke('scan-files', options),
    scanCustomPath: (path, options) => ipcRenderer.invoke('scan-custom-path', path, options),
    quickWalletScan: (basePath) => ipcRenderer.invoke('quick-wallet-scan', basePath),
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    
    // Progress listener for file scanning
    onScanProgress: (callback) => {
        ipcRenderer.on('scan-progress', (event, progress) => callback(progress));
    },
    
    // Demo functions
    runDemoValidation: () => ipcRenderer.invoke('demo-validation'),
    runDemoExport: () => ipcRenderer.invoke('demo-export'),
    
    // About dialog
    showAbout: () => ipcRenderer.invoke('show-about')
});

console.log('🔐 CryptoKeyFinder Preload Script Loaded');
console.log('✅ Secure API bridge established');
