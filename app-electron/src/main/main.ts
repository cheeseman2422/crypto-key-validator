import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron';
import { join } from 'path';
import Store from 'electron-store';
import { CryptoKeyValidatorEngine, AppConfiguration } from '@crypto-validator/core-engine';
import { ExportManager, ExportOptions } from './exportUtils';

// Security: Disable node integration in renderer
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

interface StoreSchema {
  windowBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: AppConfiguration;
  recentFiles: string[];
}

class CryptoKeyValidatorApp {
  private mainWindow: BrowserWindow | null = null;
  private engine: CryptoKeyValidatorEngine | null = null;
  private store: Store<StoreSchema>;
  
  constructor() {
    // Initialize persistent store
    this.store = new Store<StoreSchema>({
      defaults: {
        windowBounds: { x: 100, y: 100, width: 1200, height: 800 },
        config: {
          security: {
            enableMemoryProtection: true,
            clearClipboardAfter: 30,
            enableAuditLog: true,
            requireAuthentication: false,
            maxIdleTime: 1800,
            enableEncryption: true
          },
          scanning: {
            includePaths: [],
            excludePaths: ['/proc', '/sys', '/dev', '/tmp'],
            fileTypes: ['.dat', '.wallet', '.json', '.keys'],
            maxFileSize: 100 * 1024 * 1024,
            followSymlinks: false,
            scanCompressed: false,
            deepScan: true,
            pattern: []
          },
          reporting: {
            includePrivateKeys: false,
            truncateKeys: true,
            includeBalances: true,
            includeMetadata: true,
            format: 'json' as const
          },
          ui: {
            theme: 'auto' as const,
            language: 'en',
            animations: true,
            notifications: true,
            autoSave: true,
            maxResultsDisplay: 1000
          },
          offline: {
            blockchainDataPath: join(app.getPath('userData'), 'blockchain-data'),
            enableLocalNodes: false,
            syncInterval: 24,
            maxCacheSize: 1024,
            enableCaching: true
          }
        },
        recentFiles: []
      }
    });
    
    this.initializeApp();
  }

  private async initializeApp(): Promise<void> {
    // Handle app events
    app.whenReady().then(() => {
      this.createWindow();
      this.setupMenu();
      this.initializeEngine();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.cleanup();
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });

    app.on('before-quit', () => {
      this.cleanup();
    });

    // Security: Prevent new window creation
    app.on('web-contents-created', (event, contents) => {
      contents.on('new-window', (navigationEvent, navigationUrl) => {
        navigationEvent.preventDefault();
        shell.openExternal(navigationUrl);
      });
    });
  }

  private createWindow(): void {
    const bounds = this.store.get('windowBounds');
    
    this.mainWindow = new BrowserWindow({
      ...bounds,
      minWidth: 800,
      minHeight: 600,
      icon: join(__dirname, '../../../assets/icon.png'),
      show: false,
      titleBarStyle: 'default',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: join(__dirname, '../preload/preload.js'),
        additionalArguments: [`--userData=${app.getPath('userData')}`],
        webSecurity: true,
        allowRunningInsecureContent: false
      }
    });

    // Load the renderer
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }

    // Window events
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      this.sendToRenderer('app-ready');
    });

    this.mainWindow.on('close', () => {
      if (this.mainWindow) {
        this.store.set('windowBounds', this.mainWindow.getBounds());
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    this.setupIpcHandlers();
  }

  private async initializeEngine(): Promise<void> {
    try {
      const config = this.store.get('config');
      this.engine = new CryptoKeyValidatorEngine(config);
      
      // Setup engine event listeners
      this.engine.on('scan-started', (event) => {
        this.sendToRenderer('engine-scan-started', event);
      });
      
      this.engine.on('scan-progress', (progress) => {
        this.sendToRenderer('engine-scan-progress', progress);
      });
      
      this.engine.on('artifact-validated', (data) => {
        this.sendToRenderer('engine-artifact-validated', data);
      });
      
      this.engine.on('balance-found', (data) => {
        this.sendToRenderer('engine-balance-found', data);
      });
      
      this.engine.on('scan-completed', (event) => {
        this.sendToRenderer('engine-scan-completed', event);
      });
      
      this.engine.on('scan-error', (event) => {
        this.sendToRenderer('engine-scan-error', event);
      });

      await this.engine.initialize();
      console.log('CryptoKeyValidatorEngine initialized');
      
    } catch (error) {
      console.error('Failed to initialize engine:', error);
      this.showErrorDialog('Engine Initialization Failed', 
        `Failed to initialize the crypto validation engine: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private setupIpcHandlers(): void {
    // File operations
    ipcMain.handle('select-file', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        properties: ['openFile'],
        filters: [
          { name: 'All Supported', extensions: ['db', 'sqlite', 'wallet', 'dat', 'json'] },
          { name: 'Autopsy Database', extensions: ['db', 'sqlite'] },
          { name: 'Wallet Files', extensions: ['wallet', 'dat'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      return result;
    });

    ipcMain.handle('select-directory', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        properties: ['openDirectory']
      });
      return result;
    });

    ipcMain.handle('save-file', async (_, defaultName: string) => {
      const result = await dialog.showSaveDialog(this.mainWindow!, {
        defaultPath: defaultName,
        filters: [
          { name: 'JSON', extensions: ['json'] },
          { name: 'CSV', extensions: ['csv'] },
          { name: 'HTML', extensions: ['html'] },
          { name: 'Text', extensions: ['txt'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      return result;
    });

    // Engine operations
    ipcMain.handle('engine-scan-autopsy', async (_, caseDatabasePath: string) => {
      if (!this.engine) throw new Error('Engine not initialized');
      return await this.engine.scanAutopsyCase(caseDatabasePath);
    });

    ipcMain.handle('engine-scan-filesystem', async (_, rootPath: string, config?: any) => {
      if (!this.engine) throw new Error('Engine not initialized');
      return await this.engine.scanFileSystem(rootPath, config);
    });

    ipcMain.handle('engine-process-input', async (_, input: string) => {
      if (!this.engine) throw new Error('Engine not initialized');
      return await this.engine.processDirectInput(input);
    });

    ipcMain.handle('engine-get-artifacts', async () => {
      if (!this.engine) throw new Error('Engine not initialized');
      return this.engine.getArtifacts();
    });

    ipcMain.handle('engine-get-statistics', async () => {
      if (!this.engine) throw new Error('Engine not initialized');
      return this.engine.getStatistics();
    });

    ipcMain.handle('engine-clear-all', async () => {
      if (!this.engine) throw new Error('Engine not initialized');
      this.engine.clearAll();
    });

    ipcMain.handle('engine-get-blockchain-status', async () => {
      if (!this.engine) throw new Error('Engine not initialized');
      return this.engine.getBlockchainDataStatus();
    });

    // Export functionality
    ipcMain.handle('export-results', async (_, filePath: string, format: string, options: any) => {
      if (!this.engine) throw new Error('Engine not initialized');
      
      try {
        const artifacts = this.engine.getArtifacts();
        const statistics = this.engine.getStatistics();
        
        const exportOptions: ExportOptions = {
          format: format as 'json' | 'csv' | 'html' | 'txt',
          includePrivateKeys: options.includePrivateKeys ?? false,
          includeBalances: options.includeBalances ?? true,
          includeMetadata: options.includeMetadata ?? true,
          truncateKeys: options.truncateKeys ?? true
        };
        
        await ExportManager.exportArtifacts(artifacts, statistics, filePath, exportOptions);
        return { success: true };
      } catch (error) {
        console.error('Export failed:', error);
        throw error;
      }
    });

    // Configuration
    ipcMain.handle('get-config', () => {
      return this.store.get('config');
    });

    ipcMain.handle('set-config', (_, config: AppConfiguration) => {
      this.store.set('config', config);
      return true;
    });

    ipcMain.handle('get-recent-files', () => {
      return this.store.get('recentFiles');
    });

    ipcMain.handle('add-recent-file', (_, filePath: string) => {
      const recent = this.store.get('recentFiles');
      const updated = [filePath, ...recent.filter(f => f !== filePath)].slice(0, 10);
      this.store.set('recentFiles', updated);
      return updated;
    });

    // System info
    ipcMain.handle('get-app-version', () => {
      return app.getVersion();
    });

    ipcMain.handle('get-system-info', () => {
      return {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        electronVersion: process.versions.electron
      };
    });
  }

  private setupMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Scan Autopsy Case...',
            accelerator: 'CmdOrCtrl+O',
            click: () => this.sendToRenderer('menu-scan-autopsy')
          },
          {
            label: 'Scan Directory...',
            accelerator: 'CmdOrCtrl+Shift+O',
            click: () => this.sendToRenderer('menu-scan-directory')
          },
          { type: 'separator' },
          {
            label: 'Export Results...',
            accelerator: 'CmdOrCtrl+E',
            click: () => this.sendToRenderer('menu-export')
          },
          { type: 'separator' },
          {
            label: 'Clear All Data',
            click: () => this.sendToRenderer('menu-clear-data')
          },
          { type: 'separator' },
          {
            label: 'Quit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              this.cleanup();
              app.quit();
            }
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
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'close' }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About',
            click: () => this.sendToRenderer('menu-about')
          },
          {
            label: 'Documentation',
            click: () => shell.openExternal('https://github.com/crypto-key-validator/docs')
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private sendToRenderer(channel: string, data?: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  private showErrorDialog(title: string, message: string): void {
    if (this.mainWindow) {
      dialog.showErrorBox(title, message);
    }
  }

  private async cleanup(): Promise<void> {
    try {
      if (this.engine) {
        await this.engine.shutdown();
        this.engine = null;
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

// Create and start the application
new CryptoKeyValidatorApp();
