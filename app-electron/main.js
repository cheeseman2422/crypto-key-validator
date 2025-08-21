const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');

// Security: Disable node integration in renderer
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

class CryptoKeyFinderApp {
  constructor() {
    this.mainWindow = null;
    this.initializeApp();
  }

  initializeApp() {
    // Handle app events
    app.whenReady().then(() => {
      this.createWindow();
      this.setupMenu();
      this.setupIpcHandlers();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });

    // Security: Prevent new window creation
    app.on('web-contents-created', (event, contents) => {
      contents.on('new-window', (navigationEvent, navigationUrl) => {
        navigationEvent.preventDefault();
        shell.openExternal(navigationUrl);
      });
    });
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 800,
      minHeight: 600,
      show: false,
      titleBarStyle: 'default',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: true,
        allowRunningInsecureContent: false,
        preload: path.join(__dirname, 'src/preload/preload.js')
      }
    });

    // Load the renderer
    this.mainWindow.loadFile(path.join(__dirname, 'src/renderer/index.html'));

    // Window events
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      console.log('🔐 CryptoKeyFinder Application Started');
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Open DevTools in development
    // this.mainWindow.webContents.openDevTools();
  }

  setupMenu() {
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Demo Crypto Validation',
            click: () => this.sendToRenderer('demo-validation')
          },
          {
            label: 'Demo Export System', 
            click: () => this.sendToRenderer('demo-export')
          },
          { type: 'separator' },
          {
            label: 'About CryptoKeyFinder',
            click: () => this.showAbout()
          },
          { type: 'separator' },
          {
            label: 'Quit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => app.quit()
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About CryptoKeyFinder',
            click: () => this.showAbout()
          },
          {
            label: 'View Reports',
            click: () => shell.openPath(path.join(__dirname, '../sample-report.html'))
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  setupIpcHandlers() {
    const CryptoEngine = require('./src/main/cryptoEngine');
    const FileScanner = require('./src/main/fileScanner');
    const cryptoEngine = new CryptoEngine();
    const fileScanner = new FileScanner();

    // Real crypto validation handler
    ipcMain.handle('validate-crypto', async (event, input) => {
      try {
        const result = cryptoEngine.validateCryptoInput(input);
        return result;
      } catch (error) {
        return {
          valid: false,
          type: 'ERROR',
          error: error.message
        };
      }
    });

    // Batch validation handler
    ipcMain.handle('batch-validate', async (event, inputs) => {
      try {
        const results = cryptoEngine.batchValidate(inputs);
        return results;
      } catch (error) {
        return {
          error: error.message,
          results: []
        };
      }
    });

    // Demo validation with real test data
    ipcMain.handle('demo-validation', async () => {
      const testInputs = [
        'L1SNz6saQzurB2hjryytnZGvbJ9bn1mxfqS17pELqWp43mYA4f2y', // Bitcoin WIF
        '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2', // Bitcoin address
        '0x742d35cc6db6c4335f24c19b5261be20e4cdb1f5', // Ethereum address
        'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', // SegWit address
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about', // BIP39
        'invalid_key_data_here' // Invalid
      ];
      
      const results = cryptoEngine.batchValidate(testInputs);
      return { results };
    });

    ipcMain.handle('demo-export', () => {
      return {
        formats: ['JSON', 'CSV', 'HTML', 'TXT'],
        features: [
          'Professional forensic reports',
          'Security-first private key handling',
          'Court-ready documentation',
          'Machine-readable data formats'
        ]
      };
    });

    // Real file scanning handlers
    ipcMain.handle('scan-files', async (event, options) => {
      try {
        const results = await fileScanner.scanForCrypto(null, {
          ...options,
          onProgress: (progress) => {
            // Send progress updates to renderer
            this.sendToRenderer('scan-progress', progress);
          }
        });
        return results;
      } catch (error) {
        return {
          error: error.message,
          results: [],
          summary: { scannedFiles: 0, foundArtifacts: 0 }
        };
      }
    });

    ipcMain.handle('scan-custom-path', async (event, customPath, options) => {
      try {
        const results = await fileScanner.scanForCrypto([customPath], {
          ...options,
          onProgress: (progress) => {
            this.sendToRenderer('scan-progress', progress);
          }
        });
        return results;
      } catch (error) {
        return {
          error: error.message,
          results: [],
          summary: { scannedFiles: 0, foundArtifacts: 0 }
        };
      }
    });

    ipcMain.handle('quick-wallet-scan', async (event, basePath) => {
      try {
        const results = await fileScanner.quickWalletScan(basePath);
        return results;
      } catch (error) {
        return {
          error: error.message,
          results: [],
          summary: { scannedFiles: 0, foundArtifacts: 0 }
        };
      }
    });

    ipcMain.handle('select-directory', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ['openDirectory'],
        title: 'Select Directory to Scan'
      });
      
      if (result.canceled || !result.filePaths[0]) {
        return { canceled: true };
      }
      
      return { path: result.filePaths[0] };
    });

    ipcMain.handle('show-about', () => {
      this.showAbout();
    });
  }

  sendToRenderer(channel, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  showAbout() {
    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'About CryptoKeyFinder',
      message: 'CryptoKeyFinder v1.0.0',
      detail: `Professional Cryptocurrency Forensics Suite

✅ Bitcoin/Ethereum/Litecoin validation
✅ BIP39 seed phrase validation  
✅ Professional forensic reports
✅ Offline balance checking
✅ Security-first architecture

Built for digital forensics professionals worldwide.`,
      buttons: ['OK']
    });
  }
}

// Create and start the application
new CryptoKeyFinderApp();

console.log('🚀 CryptoKeyFinder Desktop Application');
console.log('=======================================');
console.log('✅ Electron framework loaded');
console.log('✅ Security features enabled');
console.log('✅ Professional UI ready');
console.log('🔐 Crypto forensics capabilities active');
