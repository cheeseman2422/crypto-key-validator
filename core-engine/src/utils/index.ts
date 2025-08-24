/**
 * Utility functions for the Crypto Key Validator
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format time duration to human readable string
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Generate a secure random ID
 */
export function generateSecureId(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Validate cryptocurrency address format (basic check)
 */
export function isValidCryptoAddress(address: string, type: string): boolean {
  switch (type.toLowerCase()) {
    case 'bitcoin':
      return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) ||
             /^bc1[a-z0-9]{39,59}$/.test(address);
    case 'ethereum':
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    case 'monero':
      return /^4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}$/.test(address) ||
             /^8[0-9AB][1-9A-HJ-NP-Za-km-z]{93}$/.test(address);
    default:
      return false;
  }
}

/**
 * Sanitize file path for safe operations
 */
export function sanitizePath(filePath: string): string {
  // Remove null bytes and other dangerous characters
  return filePath
    .replace(/\0/g, '')
    .replace(/\.\./g, '')
    .replace(/[<>:"|?*]/g, '_');
}

/**
 * Check if a file exists and is readable
 */
export async function isFileAccessible(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file extension safely
 */
export function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

/**
 * Calculate file hash
 */
export async function calculateFileHash(filePath: string, algorithm = 'sha256'): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func.apply(null, args);
    }, wait);
  };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Chunk array into smaller arrays
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Format cryptocurrency amount
 */
export function formatCryptoAmount(amount: string, currency: string, decimals = 8): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return '0';
  
  return `${num.toFixed(decimals)} ${currency}`;
}

/**
 * Validate BIP39 word list
 */
export function isValidBip39Word(word: string): boolean {
  // This is a simplified check - in a real implementation,
  // you'd check against the full BIP39 word list
  return /^[a-z]+$/.test(word) && word.length >= 3 && word.length <= 8;
}

/**
 * Estimate scan time based on file size and count
 */
export function estimateScanTime(fileCount: number, totalSize: number): number {
  // Very rough estimation based on typical scan speeds
  const filesPerSecond = 50; // files per second
  const bytesPerSecond = 1024 * 1024 * 10; // 10 MB per second
  
  const timeByFiles = fileCount / filesPerSecond;
  const timeBySize = totalSize / bytesPerSecond;
  
  // Use the larger estimate
  return Math.max(timeByFiles, timeBySize) * 1000; // Convert to milliseconds
}

/**
 * Create directory if it doesn't exist
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if ((error as any).code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Get system information
 */
export function getSystemInfo(): {
  platform: string;
  arch: string;
  nodeVersion: string;
  memory: NodeJS.MemoryUsage;
} {
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    memory: process.memoryUsage()
  };
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export default {
  formatBytes,
  formatDuration,
  generateSecureId,
  isValidCryptoAddress,
  sanitizePath,
  isFileAccessible,
  getFileExtension,
  calculateFileHash,
  sleep,
  debounce,
  throttle,
  chunkArray,
  formatCryptoAmount,
  isValidBip39Word,
  estimateScanTime,
  ensureDirectory,
  safeJsonParse,
  getSystemInfo,
  isDevelopment,
  isProduction
};
