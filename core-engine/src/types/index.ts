/**
 * Core Types and Interfaces for Cryptocurrency Key Validator
 */

export interface CryptocurrencyType {
  name: string;
  symbol: string;
  network: 'mainnet' | 'testnet';
  coinType: number; // BIP44 coin type
}

export interface Artifact {
  id: string;
  type: ArtifactType;
  subtype: string;
  raw: string;
  source: ArtifactSource;
  metadata: ArtifactMetadata;
  validationStatus: ValidationStatus;
  balanceInfo?: BalanceInfo;
  createdAt: Date;
  updatedAt: Date;
}

export enum ArtifactType {
  PRIVATE_KEY = 'private_key',
  SEED_PHRASE = 'seed_phrase',
  WALLET_FILE = 'wallet_file',
  ADDRESS = 'address',
  TRANSACTION = 'transaction',
  EXCHANGE_DATA = 'exchange_data'
}

export interface ArtifactSource {
  type: SourceType;
  path: string;
  size?: number;
  hash?: string;
}

export enum SourceType {
  FILE_SYSTEM = 'file_system',
  DIRECT_INPUT = 'direct_input',
  DRIVE_SCAN = 'drive_scan'
}


export interface ArtifactMetadata {
  cryptocurrency: CryptocurrencyType;
  confidence: number; // 0-1 scale
  derivationPath?: string;
  addressType?: string;
  walletType?: string;
  isEncrypted?: boolean;
  tags: string[];
}

export enum ValidationStatus {
  PENDING = 'pending',
  VALID = 'valid',
  INVALID = 'invalid',
  REQUIRES_PASSWORD = 'requires_password',
  ENCRYPTED = 'encrypted',
  ERROR = 'error'
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  derivedAddresses?: DerivedAddress[];
  entropy?: number;
  checksum?: boolean;
}

export interface DerivedAddress {
  address: string;
  derivationPath: string;
  addressType: string;
  publicKey?: string;
}

export interface BalanceInfo {
  balance: string; // Using string to avoid precision issues
  confirmed: string;
  unconfirmed: string;
  currency: string;
  lastUpdated: Date;
  transactionCount: number;
  utxos?: UTXO[];
  source: BalanceSource;
}

export enum BalanceSource {
  LOCAL_BLOCKCHAIN = 'local_blockchain',
  CACHED_DATA = 'cached_data',
  DERIVED_EMPTY = 'derived_empty',
  HARDWARE_WALLET = 'hardware_wallet'
}

export interface UTXO {
  txid: string;
  vout: number;
  amount: string;
  confirmations: number;
  scriptPubKey: string;
  address: string;
}

export interface ScanConfiguration {
  includePaths: string[];
  excludePaths: string[];
  fileTypes: string[];
  maxFileSize: number;
  followSymlinks: boolean;
  scanCompressed: boolean;
  deepScan: boolean;
  pattern: RegExp[];
}

export interface ScanProgress {
  phase: ScanPhase;
  filesScanned: number;
  totalFiles: number;
  artifactsFound: number;
  validatedArtifacts: number;
  currentFile: string;
  elapsedTime: number;
  estimatedTimeRemaining: number;
  bytesProcessed: number;
  totalBytes: number;
}

export enum ScanPhase {
  INITIALIZING = 'initializing',
  SCANNING = 'scanning',
  PARSING = 'parsing',
  VALIDATING = 'validating',
  // CHECKING_BALANCES removed in offline-only mode
  CHECKING_BALANCES = 'checking_balances',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ERROR = 'error'
}

export interface SecurityConfig {
  enableMemoryProtection: boolean;
  clearClipboardAfter: number; // seconds
  enableAuditLog: boolean;
  requireAuthentication: boolean;
  maxIdleTime: number; // seconds
  enableEncryption: boolean;
}

export interface ReportConfiguration {
  includePrivateKeys: boolean;
  truncateKeys: boolean;
  includeBalances: boolean;
  includeMetadata: boolean;
  format: ReportFormat;
  template?: string;
}

export enum ReportFormat {
  JSON = 'json',
  CSV = 'csv',
  HTML = 'html',
  PDF = 'pdf'
}

export interface CryptoPattern {
  name: string;
  regex: RegExp;
  validator?: (match: string) => boolean;
  cryptocurrency: CryptocurrencyType;
  category: ArtifactType;
}

export interface WalletParser {
  name: string;
  fileExtensions: string[];
  fileSignatures: Buffer[];
  parse(data: Buffer, password?: string): Promise<Artifact[]>;
  requiresPassword(data: Buffer): boolean;
}

export interface BalanceProvider {
  name: string;
  supportedCryptocurrencies: CryptocurrencyType[];
  isOnline: boolean;
  getBalance(address: string, cryptocurrency: CryptocurrencyType): Promise<BalanceInfo>;
  getMultipleBalances(addresses: string[], cryptocurrency: CryptocurrencyType): Promise<BalanceInfo[]>;
}

export interface HDWallet {
  mnemonic: string;
  seed: Buffer;
  masterKey: any; // hdkey instance
  derivePath(path: string): HDWallet;
  deriveAddresses(count: number, change?: boolean): DerivedAddress[];
  getPrivateKey(): string;
  getPublicKey(): string;
  getAddress(addressType?: string): string;
}

// Error types
export class ValidationError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class BalanceCheckError extends Error {
  constructor(message: string, public address: string, public cryptocurrency: string) {
    super(message);
    this.name = 'BalanceCheckError';
  }
}

export class SecurityError extends Error {
  constructor(message: string, public securityLevel: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

// Event types for the UI
export interface ScanEvent {
  type: ScanEventType;
  data: any;
  timestamp: Date;
}

export enum ScanEventType {
  SCAN_STARTED = 'scan_started',
  PROGRESS_UPDATE = 'progress_update',
  ARTIFACT_FOUND = 'artifact_found',
  VALIDATION_COMPLETED = 'validation_completed',
  BALANCE_UPDATED = 'balance_updated',
  SCAN_COMPLETED = 'scan_completed',
  SCAN_ERROR = 'scan_error',
  SECURITY_EVENT = 'security_event'
}

// Configuration interfaces
export interface AppConfiguration {
  security: SecurityConfig;
  scanning: ScanConfiguration;
  reporting: ReportConfiguration;
  ui: UIConfiguration;
  offline: OfflineConfiguration;
}

export interface UIConfiguration {
  theme: 'dark' | 'light' | 'auto';
  language: string;
  animations: boolean;
  notifications: boolean;
  autoSave: boolean;
  maxResultsDisplay: number;
}

export interface OfflineConfiguration {
  blockchainDataPath: string;
  enableLocalNodes: boolean;
  syncInterval: number; // hours
  maxCacheSize: number; // MB
  enableCaching: boolean;
}
