/**
 * Cryptocurrency Key Validator Core Engine
 * Main entry point for all core functionality
 */

// Types and Interfaces
export * from './types';

// Core Components
export { default as CryptoValidator } from './validation/CryptoValidator';
export { default as OfflineBalanceChecker, BlockchainDataManager } from './balance/OfflineBalanceChecker';
export { default as InputParser } from './parsing/InputParser';

// Security Manager
export { default as SecurityManager } from './security/SecurityManager';

// Main Engine Class
export { CryptoKeyValidatorEngine } from './engine/CryptoKeyValidatorEngine';

// Utilities
export * from './utils';

// Version
export const VERSION = '1.0.0';
