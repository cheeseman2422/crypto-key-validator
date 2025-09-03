import { EventEmitter } from 'events';
import * as path from 'path';
import * as os from 'os';

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
  ValidationResult,
  ValidationError,
  SecurityError
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
  
  // Enhanced error handling and performance tracking
  private errorLog: Array<{ timestamp: Date; error: Error; context: string }> = [];
  private performanceMetrics = {
    validationTime: 0,
    fileProcessingTime: 0,
    memoryUsage: [] as NodeJS.MemoryUsage[],
    errorCount: 0,
    warningCount: 0
  };
  
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
    
    const startTime = Date.now();
    let artifacts: Artifact[] = [];
    
    try {
      this.startScan('filesystem');
      this.scanProgress.phase = ScanPhase.SCANNING;
      
      // Use provided config or default scanning configuration
      const config = { ...this.config.scanning, ...scanConfig };
      
      // Monitor memory usage during scanning
      this.startMemoryMonitoring();
      
      try {
        artifacts = await this.inputParser.parseFileSystem(rootPath, config);
      } catch (parseError) {
        this.logError(parseError as Error, 'FileSystem parsing');
        // Continue with partial results if available
        artifacts = this.getArtifacts();
      }
      
      // Store artifacts with error handling
      const storedCount = this.storeArtifactsWithErrorHandling(artifacts);
      console.log(`Stored ${storedCount}/${artifacts.length} artifacts successfully`);
      
      this.scanProgress.artifactsFound = artifacts.length;
      this.emit('scan-progress', { ...this.scanProgress });
      
      // Validate artifacts with enhanced error handling
      await this.validateArtifactsWithRetry(artifacts);
      
      // Check balances for valid artifacts (if enabled)
      const validArtifacts = artifacts.filter(a => a.validationStatus === ValidationStatus.VALID);
      if (validArtifacts.length > 0) {
        await this.checkBalances(validArtifacts);
      }
      
      this.performanceMetrics.fileProcessingTime = Date.now() - startTime;
      this.completeScan();
      return artifacts;
      
    } catch (error) {
      this.performanceMetrics.fileProcessingTime = Date.now() - startTime;
      this.logError(error as Error, 'FileSystem scan');
      this.handleScanError(error);
      throw error;
    } finally {
      this.stopMemoryMonitoring();
    }
  }

  /**
   * Process direct input (paste/type)
   */
  async processDirectInput(input: string): Promise<Artifact[]> {
    this.validateInitialized();
    
    if (!input || input.trim().length === 0) {
      throw new ValidationError('Input cannot be empty', 'EMPTY_INPUT');
    }
    
    const startTime = Date.now();
    let artifacts: Artifact[] = [];
    
    try {
      // Sanitize input
      const sanitizedInput = this.sanitizeInput(input);
      artifacts = this.inputParser.parseDirectInput(sanitizedInput);
      
      if (artifacts.length === 0) {
        console.log('No cryptocurrency artifacts detected in input');
        return [];
      }
      
      // Store artifacts with error handling
      const storedCount = this.storeArtifactsWithErrorHandling(artifacts);
      console.log(`Processed ${storedCount}/${artifacts.length} artifacts from direct input`);
      
      // Validate artifacts with enhanced error handling
      await this.validateArtifactsWithRetry(artifacts);
      
      // Balance checking disabled in offline-only mode
      
      this.performanceMetrics.validationTime += Date.now() - startTime;
      return artifacts;
      
    } catch (error) {
      this.performanceMetrics.validationTime += Date.now() - startTime;
      this.logError(error as Error, 'Direct input processing');
      
      // Return partial results if available
      if (artifacts.length > 0) {
        console.warn('Returning partial results due to processing error');
        return artifacts;
      }
      
      throw error;
    }
  }

  /**
   * Validate all artifacts (legacy method for compatibility)
   */
  private async validateArtifacts(artifacts: Artifact[]): Promise<void> {
    await this.validateArtifactsWithRetry(artifacts);
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
    performance: {
      errors: number;
      warnings: number;
      processingTime: number;
      validationTime: number;
    };
  } {
    const artifacts = this.getArtifacts();
    const validArtifacts = artifacts.filter(a => a.validationStatus === ValidationStatus.VALID);
    
    return {
      totalArtifacts: artifacts.length,
      validArtifacts: validArtifacts.length,
      artifactsWithBalance: 0, // Balance checking disabled
      totalBalance: 'N/A (offline mode)',
      scanProgress: { ...this.scanProgress },
      performance: {
        errors: this.performanceMetrics.errorCount,
        warnings: this.performanceMetrics.warningCount,
        processingTime: this.performanceMetrics.fileProcessingTime,
        validationTime: this.performanceMetrics.validationTime
      }
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

  /**
   * Enhanced error handling and utility methods
   */
  private logError(error: Error, context: string): void {
    const errorEntry = {
      timestamp: new Date(),
      error,
      context
    };
    
    this.errorLog.push(errorEntry);
    this.performanceMetrics.errorCount++;
    
    console.error(`[${context}] Error:`, error.message);
    this.emit('error', { error, context, timestamp: errorEntry.timestamp });
    
    // Keep error log size manageable
    if (this.errorLog.length > 1000) {
      this.errorLog = this.errorLog.slice(-500);
    }
  }

  private sanitizeInput(input: string): string {
    // Remove null bytes and control characters except newlines and tabs
    return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
                .trim();
  }

  private storeArtifactsWithErrorHandling(artifacts: Artifact[]): number {
    let successCount = 0;
    
    for (const artifact of artifacts) {
      try {
        // Validate artifact structure before storing
        this.validateArtifactStructure(artifact);
        this.artifacts.set(artifact.id, artifact);
        successCount++;
      } catch (error) {
        this.logError(error as Error, `Storing artifact ${artifact.id}`);
        // Continue with other artifacts
      }
    }
    
    return successCount;
  }

  private validateArtifactStructure(artifact: Artifact): void {
    if (!artifact.id || !artifact.type || !artifact.raw) {
      throw new ValidationError('Invalid artifact structure', 'INVALID_STRUCTURE');
    }
    
    if (artifact.raw.length > 10000) { // Reasonable limit for crypto artifacts
      throw new ValidationError('Artifact data too large', 'DATA_TOO_LARGE');
    }
  }

  private async validateArtifactsWithRetry(artifacts: Artifact[], maxRetries: number = 2): Promise<void> {
    this.scanProgress.phase = ScanPhase.VALIDATING;
    this.emit('scan-progress', { ...this.scanProgress });
    
    const startTime = Date.now();
    
    try {
      // Process in smaller batches for better memory management
      const batchSize = Math.min(5, Math.max(1, Math.floor(artifacts.length / 4)));
      
      for (let i = 0; i < artifacts.length; i += batchSize) {
        const batch = artifacts.slice(i, i + batchSize);
        let attempt = 0;
        
        while (attempt <= maxRetries) {
          try {
            const results = await this.validator.validateBatch(batch);
            
            for (const [artifactId, result] of results) {
              this.validationResults.set(artifactId, result);
              
              // Count warnings
              this.performanceMetrics.warningCount += result.warnings.length;
              
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
            
            break; // Success, exit retry loop
            
          } catch (batchError) {
            attempt++;
            this.logError(batchError as Error, `Validation batch ${i}-${i + batchSize} (attempt ${attempt})`);
            
            if (attempt > maxRetries) {
              // Mark batch artifacts as error state
              batch.forEach(artifact => {
                artifact.validationStatus = ValidationStatus.ERROR;
                this.artifacts.set(artifact.id, artifact);
              });
            } else {
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
          }
        }
        
        // Emit progress update
        this.emit('scan-progress', { ...this.scanProgress });
        
        // Give other processes a chance to run
        await new Promise(resolve => setImmediate(resolve));
      }
      
      this.performanceMetrics.validationTime += Date.now() - startTime;
      
    } catch (error) {
      this.performanceMetrics.validationTime += Date.now() - startTime;
      this.logError(error as Error, 'Artifact validation');
      throw error;
    }
  }

  private startMemoryMonitoring(): void {
    this.performanceMetrics.memoryUsage = [];
    
    // Take initial memory snapshot
    this.performanceMetrics.memoryUsage.push(process.memoryUsage());
  }

  private stopMemoryMonitoring(): void {
    // Take final memory snapshot
    if (this.performanceMetrics.memoryUsage.length > 0) {
      this.performanceMetrics.memoryUsage.push(process.memoryUsage());
    }
  }

  /**
   * Get detailed performance and error statistics
   */
  getDetailedStatistics(): {
    performance: {
      validationTime: number;
      fileProcessingTime: number;
      memoryUsage: NodeJS.MemoryUsage[];
      errorCount: number;
      warningCount: number;
    };
    errors: Array<{ timestamp: Date; error: string; context: string }>;
    memory: {
      current: NodeJS.MemoryUsage;
      peak?: NodeJS.MemoryUsage;
      usage?: string;
    };
  } {
    const current = process.memoryUsage();
    let peak: NodeJS.MemoryUsage | undefined;
    let usage: string | undefined;
    
    if (this.performanceMetrics.memoryUsage.length >= 2) {
      const initial = this.performanceMetrics.memoryUsage[0];
      const final = this.performanceMetrics.memoryUsage[this.performanceMetrics.memoryUsage.length - 1];
      peak = final;
      usage = `RSS: ${Math.round((final.rss - initial.rss) / 1024 / 1024)}MB change`;
    }
    
    return {
      performance: { ...this.performanceMetrics },
      errors: this.errorLog.slice(-50).map(entry => ({
        timestamp: entry.timestamp,
        error: entry.error.message,
        context: entry.context
      })),
      memory: {
        current,
        peak,
        usage
      }
    };
  }

  /**
   * Clear error logs and reset performance metrics
   */
  resetMetrics(): void {
    this.errorLog = [];
    this.performanceMetrics = {
      validationTime: 0,
      fileProcessingTime: 0,
      memoryUsage: [],
      errorCount: 0,
      warningCount: 0
    };
  }
}
