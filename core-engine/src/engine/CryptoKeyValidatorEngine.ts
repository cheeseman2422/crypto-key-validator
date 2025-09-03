import { EventEmitter } from 'events';
import * as path from 'path';

import {
  Artifact,
  AppConfiguration,
  ScanConfiguration,
  ScanProgress,
  ScanPhase,
  ScanEvent,
  ScanEventType,
  ValidationStatus,
  BalanceInfo,
  ValidationResult
} from '../types';

import CryptoValidator from '../validation/CryptoValidator';
import OfflineBalanceChecker, { BlockchainDataManager } from '../balance/OfflineBalanceChecker';
import InputParser from '../parsing/InputParser';
import SecurityManager from '../security/SecurityManager';

export class CryptoKeyValidatorEngine extends EventEmitter {
  private validator: CryptoValidator;
  // Offline balance checking is disabled for offline-only mode
  private balanceChecker: OfflineBalanceChecker;
  private inputParser: InputParser;
  private securityManager: SecurityManager;
  private blockchainManager: BlockchainDataManager;
  
  private artifacts: Map<string, Artifact> = new Map();
  private validationResults: Map<string, ValidationResult> = new Map();
  private balanceResults: Map<string, BalanceInfo> = new Map();
  
  private isInitialized = false;
  private isScanning = false;
  private scanProgress: ScanProgress = {
    phase: ScanPhase.INITIALIZING,
    filesScanned: 0,
    totalFiles: 0,
    artifactsFound: 0,
    validatedArtifacts: 0,
    currentFile: '',
    elapsedTime: 0,
    estimatedTimeRemaining: 0,
    bytesProcessed: 0,
    totalBytes: 0
  };

  constructor(private config: AppConfiguration) {
    super();
    
    // Initialize core components
    this.validator = new CryptoValidator();
    this.inputParser = new InputParser();
    this.securityManager = new SecurityManager(config.security);
    this.blockchainManager = new BlockchainDataManager(config.offline.blockchainDataPath);
    this.balanceChecker = new OfflineBalanceChecker(config.offline.blockchainDataPath);
  }

  /**
   * Initialize the engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.emit('initialization-started');
      
      // Check security environment
      const securityCheck = this.securityManager.isSecureEnvironment();
      if (!securityCheck.isSecure) {
        console.warn('Security issues detected:', securityCheck.issues);
        this.emit('security-warning', securityCheck.issues);
      }

      // Skip balance checker initialization for offline-only mode
      // await this.balanceChecker.initialize();
      
      this.isInitialized = true;
      this.emit('initialization-complete');
      
      console.log('CryptoKeyValidatorEngine initialized successfully');
    } catch (error) {
      this.emit('initialization-error', error);
      throw new Error(`Engine initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  /**
   * Scan filesystem for cryptocurrency artifacts
   */
  async scanFileSystem(rootPath: string, scanConfig?: Partial<ScanConfiguration>): Promise<Artifact[]> {
    this.validateInitialized();
    
    try {
      this.startScan('filesystem');
      this.scanProgress.phase = ScanPhase.SCANNING;
      
      // Use provided config or default scanning configuration
      const config = { ...this.config.scanning, ...scanConfig };
      
      const artifacts = await this.inputParser.parseFileSystem(rootPath, config);
      
      // Store artifacts
      for (const artifact of artifacts) {
        this.artifacts.set(artifact.id, artifact);
      }
      
      this.scanProgress.artifactsFound = artifacts.length;
      this.emit('scan-progress', { ...this.scanProgress });
      
      // Validate artifacts
      await this.validateArtifacts(artifacts);
      
      // Check balances for valid artifacts (if enabled)
      const validArtifacts = artifacts.filter(a => a.validationStatus === ValidationStatus.VALID);
      if (validArtifacts.length > 0) {
        await this.checkBalances(validArtifacts);
      }
      
      this.completeScan();
      return artifacts;
      
    } catch (error) {
      this.handleScanError(error);
      throw error;
    }
  }

  /**
   * Process direct input (paste/type)
   */
  async processDirectInput(input: string): Promise<Artifact[]> {
    this.validateInitialized();
    
    try {
      const artifacts = this.inputParser.parseDirectInput(input);
      
      // Store artifacts
      for (const artifact of artifacts) {
        this.artifacts.set(artifact.id, artifact);
      }
      
      // Validate artifacts
      await this.validateArtifacts(artifacts);
      
      // Balance checking disabled in offline-only mode
      
      return artifacts;
      
    } catch (error) {
      console.error('Failed to process direct input:', error);
      throw error;
    }
  }

  /**
   * Validate all artifacts
   */
  private async validateArtifacts(artifacts: Artifact[]): Promise<void> {
    this.scanProgress.phase = ScanPhase.VALIDATING;
    this.emit('scan-progress', { ...this.scanProgress });
    
    try {
      const results = await this.validator.validateBatch(artifacts);
      
      for (const [artifactId, result] of results) {
        this.validationResults.set(artifactId, result);
        
        // Update artifact validation status
        const artifact = this.artifacts.get(artifactId);
        if (artifact) {
          artifact.validationStatus = result.isValid ? ValidationStatus.VALID : ValidationStatus.INVALID;
          artifact.updatedAt = new Date();
          this.artifacts.set(artifactId, artifact);
        }
        
        this.scanProgress.validatedArtifacts++;
        this.emit('artifact-validated', { artifactId, result });
      }
      
    } catch (error) {
      console.error('Validation failed:', error);
      throw error;
    }
  }

  /**
   * Check balances for valid artifacts
   * DISABLED: Balance checking is disabled in offline-only mode
   */
  private async checkBalances(artifacts: Artifact[]): Promise<void> {
    // Balance checking is fully disabled for offline-only operation
    console.log('Balance checking disabled - offline-only mode');
    return;
  }

  /**
   * Get all artifacts
   */
  getArtifacts(): Artifact[] {
    return Array.from(this.artifacts.values());
  }

  /**
   * Get artifact by ID
   */
  getArtifact(id: string): Artifact | undefined {
    return this.artifacts.get(id);
  }

  /**
   * Get validation result for artifact
   */
  getValidationResult(artifactId: string): ValidationResult | undefined {
    return this.validationResults.get(artifactId);
  }

  /**
   * Get balance info for artifact and address
   */
  getBalanceInfo(artifactId: string, address: string): BalanceInfo | undefined {
    return this.balanceResults.get(`${artifactId}-${address}`);
  }

  /**
   * Get artifacts with positive balances
   */
  getArtifactsWithBalance(): Artifact[] {
    return this.getArtifacts().filter(artifact => 
      artifact.balanceInfo && parseFloat(artifact.balanceInfo.balance) > 0
    );
  }

  /**
   * Get summary statistics (offline-only mode)
   */
  getStatistics(): {
    totalArtifacts: number;
    validArtifacts: number;
    artifactsWithBalance: number;
    totalBalance: string;
    scanProgress: ScanProgress;
  } {
    const artifacts = this.getArtifacts();
    const validArtifacts = artifacts.filter(a => a.validationStatus === ValidationStatus.VALID);
    
    return {
      totalArtifacts: artifacts.length,
      validArtifacts: validArtifacts.length,
      artifactsWithBalance: 0, // Balance checking disabled
      totalBalance: 'N/A (offline mode)',
      scanProgress: { ...this.scanProgress }
    };
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.artifacts.clear();
    this.validationResults.clear();
    this.balanceResults.clear();
    this.securityManager.clearAll();
    
    this.resetScanProgress();
    this.emit('data-cleared');
  }

  /**
   * Get blockchain data status
   */
  getBlockchainDataStatus(): { [key: string]: { exists: boolean; size?: number; lastModified?: Date } } {
    return this.blockchainManager.getDataStatus();
  }

  /**
   * Shutdown the engine
   */
  async shutdown(): Promise<void> {
    try {
      this.emit('shutdown-started');
      
      // Clear sensitive data
      this.securityManager.clearAll();
      
      // Skip balance checker close (disabled)
      // await this.balanceChecker.close();
      
      this.isInitialized = false;
      this.emit('shutdown-complete');
      
      console.log('CryptoKeyValidatorEngine shut down successfully');
    } catch (error) {
      console.error('Engine shutdown failed:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private validateInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Engine not initialized. Call initialize() first.');
    }
  }

  private startScan(type: string): void {
    if (this.isScanning) {
      throw new Error('Scan already in progress');
    }
    
    this.isScanning = true;
    this.resetScanProgress();
    this.scanProgress.phase = ScanPhase.INITIALIZING;
    
    const event: ScanEvent = {
      type: ScanEventType.SCAN_STARTED,
      data: { scanType: type },
      timestamp: new Date()
    };
    
    this.emit('scan-started', event);
  }

  private completeScan(): void {
    this.scanProgress.phase = ScanPhase.COMPLETED;
    this.scanProgress.elapsedTime = Date.now() - this.scanProgress.elapsedTime;
    this.isScanning = false;
    
    const event: ScanEvent = {
      type: ScanEventType.SCAN_COMPLETED,
      data: { ...this.scanProgress },
      timestamp: new Date()
    };
    
    this.emit('scan-completed', event);
  }

  private handleScanError(error: any): void {
    this.scanProgress.phase = ScanPhase.ERROR;
    this.isScanning = false;
    
    const event: ScanEvent = {
      type: ScanEventType.SCAN_ERROR,
      data: { error: error.message || error },
      timestamp: new Date()
    };
    
    this.emit('scan-error', event);
  }

  private resetScanProgress(): void {
    this.scanProgress = {
      phase: ScanPhase.INITIALIZING,
      filesScanned: 0,
      totalFiles: 0,
      artifactsFound: 0,
      validatedArtifacts: 0,
      currentFile: '',
      elapsedTime: Date.now(),
      estimatedTimeRemaining: 0,
      bytesProcessed: 0,
      totalBytes: 0
    };
  }
}
