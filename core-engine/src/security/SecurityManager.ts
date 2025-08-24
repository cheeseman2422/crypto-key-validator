import * as crypto from 'crypto';
import { SecurityError, SecurityConfig } from '../types';

export class SecurityManager {
  private config: SecurityConfig;
  private secureBuffers: Map<string, Buffer> = new Map();
  private accessLog: Array<{ timestamp: Date; action: string; resource: string }> = [];

  constructor(config: SecurityConfig) {
    this.config = config;
    if (config.enableMemoryProtection) {
      this.enableMemoryProtection();
    }
  }

  /**
   * Store sensitive data in secure memory
   */
  storeSensitiveData(id: string, data: string | Buffer): void {
    try {
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
      
      // Encrypt the buffer before storing
      const encrypted = this.encryptBuffer(buffer);
      this.secureBuffers.set(id, encrypted);
      
      // Zero out the original buffer if it was passed in
      if (Buffer.isBuffer(data)) {
        data.fill(0);
      }
      
      this.logAccess('STORE', id);
    } catch (error) {
      throw new SecurityError(`Failed to store sensitive data: ${error instanceof Error ? error.message : 'Unknown error'}`, 'HIGH');
    }
  }

  /**
   * Retrieve sensitive data from secure memory
   */
  getSensitiveData(id: string): Buffer | null {
    try {
      const encrypted = this.secureBuffers.get(id);
      if (!encrypted) {
        return null;
      }
      
      this.logAccess('ACCESS', id);
      return this.decryptBuffer(encrypted);
    } catch (error) {
      throw new SecurityError(`Failed to retrieve sensitive data: ${error instanceof Error ? error.message : 'Unknown error'}`, 'HIGH');
    }
  }

  /**
   * Remove sensitive data from secure memory
   */
  removeSensitiveData(id: string): void {
    try {
      const buffer = this.secureBuffers.get(id);
      if (buffer) {
        // Zero out the buffer before deletion
        buffer.fill(0);
        this.secureBuffers.delete(id);
      }
      
      this.logAccess('REMOVE', id);
    } catch (error) {
      throw new SecurityError(`Failed to remove sensitive data: ${error instanceof Error ? error.message : 'Unknown error'}`, 'MEDIUM');
    }
  }

  /**
   * Clear all sensitive data
   */
  clearAll(): void {
    try {
      for (const [id, buffer] of this.secureBuffers) {
        buffer.fill(0);
        this.logAccess('CLEAR', id);
      }
      
      this.secureBuffers.clear();
    } catch (error) {
      throw new SecurityError(`Failed to clear all sensitive data: ${error instanceof Error ? error.message : 'Unknown error'}`, 'HIGH');
    }
  }

  /**
   * Truncate sensitive string for safe display
   */
  truncateForDisplay(data: string, showLength: number = 8): string {
    if (data.length <= showLength * 2) {
      return '*'.repeat(data.length);
    }
    
    return data.substring(0, showLength) + '...' + data.substring(data.length - showLength);
  }

  /**
   * Validate that a string contains only valid characters for a private key
   */
  validateKeyFormat(key: string, format: 'hex' | 'wif' | 'base58'): boolean {
    switch (format) {
      case 'hex':
        return /^[a-fA-F0-9]+$/.test(key) && key.length === 64;
      case 'wif':
        return /^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/.test(key);
      case 'base58':
        return /^[1-9A-HJ-NP-Za-km-z]+$/.test(key);
      default:
        return false;
    }
  }

  /**
   * Generate secure random bytes
   */
  generateSecureRandom(length: number): Buffer {
    return crypto.randomBytes(length);
  }

  /**
   * Hash data securely
   */
  secureHash(data: string | Buffer, algorithm: string = 'sha256'): string {
    const hash = crypto.createHash(algorithm);
    hash.update(data);
    return hash.digest('hex');
  }

  /**
   * Create a secure checksum for integrity verification
   */
  createChecksum(data: string | Buffer): string {
    return this.secureHash(data, 'sha256').substring(0, 16);
  }

  /**
   * Verify data integrity using checksum
   */
  verifyChecksum(data: string | Buffer, expectedChecksum: string): boolean {
    const actualChecksum = this.createChecksum(data);
    return actualChecksum === expectedChecksum;
  }

  /**
   * Get access log entries
   */
  getAccessLog(): Array<{ timestamp: Date; action: string; resource: string }> {
    return [...this.accessLog];
  }

  /**
   * Clear access log
   */
  clearAccessLog(): void {
    this.accessLog.length = 0;
  }

  /**
   * Check if we're running in a secure environment
   */
  isSecureEnvironment(): { isSecure: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check if running in development mode
    if (process.env.NODE_ENV === 'development') {
      issues.push('Running in development mode');
    }

    // Check if debugger is attached
    if (process.env.NODE_OPTIONS?.includes('--inspect')) {
      issues.push('Node.js inspector is enabled');
    }

    // Check for common development tools
    if (process.env.DEBUG) {
      issues.push('Debug mode is enabled');
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
      issues.push('High memory usage detected');
    }

    return {
      isSecure: issues.length === 0,
      issues
    };
  }

  /**
   * Encrypt buffer using AES-256-GCM
   */
  private encryptBuffer(buffer: Buffer): Buffer {
    if (!this.config.enableEncryption) {
      return buffer;
    }

    const algorithm = 'aes-256-gcm';
    const key = this.getDerivedKey();
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    
    const encrypted = Buffer.concat([
      cipher.update(buffer),
      cipher.final()
    ]);
    
    // Combine IV + encrypted data
    return Buffer.concat([iv, encrypted]);
  }

  /**
   * Decrypt buffer using AES-256-GCM
   */
  private decryptBuffer(encryptedBuffer: Buffer): Buffer {
    if (!this.config.enableEncryption) {
      return encryptedBuffer;
    }

    const algorithm = 'aes-256-gcm';
    const key = this.getDerivedKey();
    
    // Extract IV and encrypted data
    const iv = encryptedBuffer.slice(0, 16);
    const encrypted = encryptedBuffer.slice(16);
    
    const decipher = crypto.createDecipher(algorithm, key);
    
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
  }

  /**
   * Get derived encryption key
   */
  private getDerivedKey(): Buffer {
    // In a real implementation, this should use a more sophisticated key derivation
    // For now, use a simple approach
    const salt = Buffer.from('CryptoKeyValidator-Salt', 'utf8');
    return crypto.pbkdf2Sync('master-key', salt, 10000, 32, 'sha256');
  }

  /**
   * Enable memory protection features
   */
  private enableMemoryProtection(): void {
    // Set process title to something generic
    process.title = 'node';
    
    // Handle uncaught exceptions securely
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      this.clearAll();
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled rejection:', reason);
      this.clearAll();
      process.exit(1);
    });

    // Clear sensitive data on exit
    process.on('exit', () => {
      this.clearAll();
    });

    process.on('SIGINT', () => {
      console.log('Received SIGINT, clearing sensitive data...');
      this.clearAll();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('Received SIGTERM, clearing sensitive data...');
      this.clearAll();
      process.exit(0);
    });
  }

  /**
   * Log access to sensitive data
   */
  private logAccess(action: string, resource: string): void {
    if (!this.config.enableAuditLog) {
      return;
    }

    this.accessLog.push({
      timestamp: new Date(),
      action,
      resource
    });

    // Keep only the last 1000 entries
    if (this.accessLog.length > 1000) {
      this.accessLog.splice(0, this.accessLog.length - 1000);
    }
  }
}

export default SecurityManager;
