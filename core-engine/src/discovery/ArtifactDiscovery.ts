import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

import {
  Artifact,
  ArtifactType,
  SourceType,
  CryptocurrencyType,
  ValidationStatus,
  ScanConfiguration
} from '../types';

interface DiscoveryResult {
  artifacts: Artifact[];
  metadata: {
    scanType: string;
    dataSource: string;
    confidence: number;
    context: string;
    offset?: number;
    encoding?: string;
  };
}

export class ArtifactDiscovery {
  private readonly bitcoinType: CryptocurrencyType = {
    name: 'Bitcoin',
    symbol: 'BTC', 
    network: 'mainnet',
    coinType: 0
  };

  // Advanced regex patterns for Bitcoin artifacts
  private readonly patterns = {
    // Legacy addresses (P2PKH/P2SH)
    legacyAddress: /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g,
    
    // Bech32 addresses (SegWit)
    bech32Address: /\b(bc1|tb1)[a-z0-9]{39,59}\b/g,
    
    // Taproot addresses 
    taprootAddress: /\b(bc1|tb1)p[a-z0-9]{58}\b/g,
    
    // WIF private keys
    wifPrivateKey: /\b[5KL][1-9A-HJ-NP-Za-km-z]{50,51}\b/g,
    
    // Raw hex private keys (64 chars)
    hexPrivateKey: /\b[a-fA-F0-9]{64}\b/g,
    
    // BIP39 seed phrases - improved detection
    seedPhrase: /\b([a-z]{3,8}\s+){11,23}[a-z]{3,8}\b/gi,
    
    // Wallet file signatures
    walletSignatures: {
      bitcoin: /wallet\.dat|Bitcoin.*wallet/i,
      electrum: /electrum.*wallet|\.wallet/i,
      multibit: /multibit.*wallet|\.wallet/i,
      blockchain: /blockchain.*wallet/i
    },
    
    // Extended public/private keys (xpub/xprv)
    extendedKeys: /\b(xpub|xprv|ypub|yprv|zpub|zprv|tpub|tprv)[1-9A-HJ-NP-Za-km-z]{100,120}\b/g,
    
    // Private key hex patterns in various encodings
    hexPatterns: [
      /[a-fA-F0-9]{64}/g,  // Standard hex
      /\\x[a-fA-F0-9]{2}/g, // Escaped hex
      /0x[a-fA-F0-9]{64}/g  // 0x prefixed
    ]
  };

  /**
   * Comprehensive artifact discovery - the main entry point
   */
  async discoverArtifacts(targetPath: string, options: {
    deepScan?: boolean;
    hexCarving?: boolean; 
    databaseScan?: boolean;
    metadataScan?: boolean;
    maxFileSize?: number;
    skipBinaries?: boolean;
  } = {}): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];
    
    
    if (!fs.existsSync(targetPath)) {
      throw new Error(`Target path does not exist: ${targetPath}`);
    }

    const stats = fs.statSync(targetPath);
    const maxSize = options.maxFileSize || 100 * 1024 * 1024; // 100MB default
    
    if (stats.isFile()) {
      const fileResults = await this.scanSingleFile(targetPath, options);
      results.push(...fileResults);
    } else if (stats.isDirectory()) {
      const dirResults = await this.scanDirectory(targetPath, options, 0);
      results.push(...dirResults);
    }
    
    return results;
  }

  /**
   * Scan a single file with all discovery methods
   */
  private async scanSingleFile(filePath: string, options: any): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];
    const fileName = path.basename(filePath);
    const fileExt = path.extname(filePath).toLowerCase();
    
    try {
      const stats = fs.statSync(filePath);
      
      // Skip files that are too large
      if (stats.size > (options.maxFileSize || 100 * 1024 * 1024)) {
        return results;
      }
      
      
      // 1. Text-based scanning (fastest)
      if (this.isTextFile(fileExt) || !options.skipBinaries) {
        const textResults = await this.scanTextContent(filePath);
        results.push(...textResults);
      }
      
      // 2. Hex carving for binary files
      if (options.hexCarving && this.shouldHexCarve(fileExt)) {
        const hexResults = await this.hexCarveFile(filePath);
        results.push(...hexResults);
      }
      
      // 3. Database scanning
      if (options.databaseScan && this.isDatabaseFile(fileExt)) {
        const dbResults = await this.scanDatabase(filePath);
        results.push(...dbResults);
      }
      
      // 4. Metadata extraction
      if (options.metadataScan) {
        const metaResults = await this.extractMetadata(filePath);
        results.push(...metaResults);
      }
      
      // 5. Wallet-specific scanning
      if (this.isWalletFile(fileName, fileExt)) {
        const walletResults = await this.scanWalletFile(filePath);
        results.push(...walletResults);
      }
      
    } catch (error) {
      console.warn(`⚠️  Cannot scan ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return results;
  }

  /**
   * Hex carving - extract artifacts from binary data
   */
  private async hexCarveFile(filePath: string): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];
    
    try {
      const buffer = fs.readFileSync(filePath);
      const hexString = buffer.toString('hex');
      
      // Look for private keys in hex data
      const hexKeyMatches = hexString.match(/[a-fA-F0-9]{64}/g) || [];
      
      for (const match of hexKeyMatches) {
        const offset = hexString.indexOf(match) / 2;
        
        const artifact = this.createArtifact(
          ArtifactType.PRIVATE_KEY,
          match,
          'Hex Carved Private Key',
          filePath,
          0.7 // Lower confidence for carved data
        );
        
        results.push({
          artifacts: [artifact],
          metadata: {
            scanType: 'hex_carving',
            dataSource: filePath,
            confidence: 0.7,
            context: 'Binary hex carving',
            offset,
            encoding: 'hex'
          }
        });
      }
      
      // Carve for wallet.dat signatures
      const walletSigOffset = buffer.indexOf(Buffer.from('wallet', 'ascii'));
      if (walletSigOffset !== -1) {
        results.push({
          artifacts: [],
          metadata: {
            scanType: 'signature_detection', 
            dataSource: filePath,
            confidence: 0.8,
            context: 'Wallet file signature detected',
            offset: walletSigOffset
          }
        });
      }
      
    } catch (error) {
      console.warn(`Hex carving failed for ${filePath}: ${error}`);
    }
    
    return results;
  }

  /**
   * Database scanning for SQLite, JSON, and other structured data
   */
  private async scanDatabase(filePath: string): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];
    const fileExt = path.extname(filePath).toLowerCase();
    
    try {
      if (fileExt === '.db' || fileExt === '.sqlite' || fileExt === '.sqlite3') {
        // SQLite database scanning
        const sqliteResults = await this.scanSQLiteDatabase(filePath);
        results.push(...sqliteResults);
      } else if (fileExt === '.json') {
        // JSON scanning
        const jsonResults = await this.scanJSONFile(filePath);
        results.push(...jsonResults);
      } else if (fileExt === '.xml') {
        // XML scanning  
        const xmlResults = await this.scanXMLFile(filePath);
        results.push(...xmlResults);
      }
    } catch (error) {
      console.warn(`Database scan failed for ${filePath}: ${error}`);
    }
    
    return results;
  }

  /**
   * SQLite database deep scanning
   */
  private async scanSQLiteDatabase(filePath: string): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];
    
    try {
      // For now, treat as binary and scan for patterns
      // In production, would use sqlite3 module to query tables
      const buffer = fs.readFileSync(filePath);
      const content = buffer.toString('utf8', 0, Math.min(buffer.length, 1024 * 1024));
      
      // Look for Bitcoin artifacts in database content
      const artifacts = this.extractArtifactsFromText(content, filePath, 0.8);
      
      if (artifacts.length > 0) {
        results.push({
          artifacts,
          metadata: {
            scanType: 'sqlite_scan',
            dataSource: filePath,
            confidence: 0.8,
            context: 'SQLite database content'
          }
        });
      }
    } catch (error) {
      console.warn(`SQLite scan failed: ${error}`);
    }
    
    return results;
  }

  /**
   * JSON file deep scanning
   */
  private async scanJSONFile(filePath: string): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      
      // Recursively scan JSON object for crypto artifacts
      const artifacts = this.scanJSONObject(data, filePath, []);
      
      if (artifacts.length > 0) {
        results.push({
          artifacts,
          metadata: {
            scanType: 'json_scan',
            dataSource: filePath,
            confidence: 0.9,
            context: 'Structured JSON data'
          }
        });
      }
    } catch (error) {
      // If JSON parsing fails, treat as text
      const textResults = await this.scanTextContent(filePath);
      results.push(...textResults);
    }
    
    return results;
  }

  /**
   * Recursively scan JSON object for crypto artifacts
   */
  private scanJSONObject(obj: any, filePath: string, keyPath: string[]): Artifact[] {
    const artifacts: Artifact[] = [];
    
    if (typeof obj === 'string') {
      // Check if string is a crypto artifact
      const artifact = this.detectBitcoinArtifact(obj, filePath, 0.9);
      if (artifact) {
        artifact.metadata.tags = [...(artifact.metadata.tags || []), `json_key:${keyPath.join('.')}`];
        artifacts.push(artifact);
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        const newKeyPath = [...keyPath, key];
        artifacts.push(...this.scanJSONObject(value, filePath, newKeyPath));
      }
    }
    
    return artifacts;
  }

  /**
   * XML file scanning
   */
  private async scanXMLFile(filePath: string): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const artifacts = this.extractArtifactsFromText(content, filePath, 0.8);
      
      if (artifacts.length > 0) {
        results.push({
          artifacts,
          metadata: {
            scanType: 'xml_scan',
            dataSource: filePath,
            confidence: 0.8,
            context: 'XML document content'
          }
        });
      }
    } catch (error) {
      console.warn(`XML scan failed: ${error}`);
    }
    
    return results;
  }

  /**
   * Extract metadata from files (EXIF, file attributes, etc.)
   */
  private async extractMetadata(filePath: string): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];
    
    try {
      const stats = fs.statSync(filePath);
      const fileName = path.basename(filePath);
      
      // Check filename for crypto indicators
      const cryptoKeywords = ['wallet', 'bitcoin', 'btc', 'crypto', 'private', 'seed', 'mnemonic', 'key'];
      const hasKeyword = cryptoKeywords.some(keyword => fileName.toLowerCase().includes(keyword));
      
      if (hasKeyword) {
        results.push({
          artifacts: [],
          metadata: {
            scanType: 'filename_analysis',
            dataSource: filePath,
            confidence: 0.6,
            context: `Crypto-related filename: ${fileName}`
          }
        });
      }
      
      // Check file timestamps for suspicious patterns
      const now = Date.now();
      const fileAge = now - stats.mtime.getTime();
      const daysSinceModified = fileAge / (1000 * 60 * 60 * 24);
      
      if (daysSinceModified > 365 && daysSinceModified < 365 * 10) {
        // Files 1-10 years old might be old wallets
        results.push({
          artifacts: [],
          metadata: {
            scanType: 'temporal_analysis',
            dataSource: filePath,
            confidence: 0.4,
            context: `Old file (${Math.round(daysSinceModified)} days old) - potential abandoned wallet`
          }
        });
      }
      
    } catch (error) {
      console.warn(`Metadata extraction failed: ${error}`);
    }
    
    return results;
  }

  /**
   * Text content scanning with advanced pattern matching
   */
  private async scanTextContent(filePath: string): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];
    
    try {
      const content = this.readFileWithEncoding(filePath);
      const artifacts = this.extractArtifactsFromText(content, filePath, 0.95);
      
      if (artifacts.length > 0) {
        results.push({
          artifacts,
          metadata: {
            scanType: 'text_pattern_matching',
            dataSource: filePath,
            confidence: 0.95,
            context: 'Text file pattern matching'
          }
        });
      }
    } catch (error) {
      console.warn(`Text scanning failed: ${error}`);
    }
    
    return results;
  }

  /**
   * Extract Bitcoin artifacts from text using all patterns
   */
  private extractArtifactsFromText(text: string, filePath: string, baseConfidence: number): Artifact[] {
    const artifacts: Artifact[] = [];
    
    // Bitcoin addresses
    const legacyMatches = text.match(this.patterns.legacyAddress) || [];
    legacyMatches.forEach(match => {
      const artifact = this.createArtifact(ArtifactType.ADDRESS, match, 'Legacy Bitcoin Address', filePath, baseConfidence);
      artifacts.push(artifact);
    });
    
    const bech32Matches = text.match(this.patterns.bech32Address) || [];
    bech32Matches.forEach(match => {
      const artifact = this.createArtifact(ArtifactType.ADDRESS, match, 'Bech32 Bitcoin Address', filePath, baseConfidence);
      artifacts.push(artifact);
    });
    
    const taprootMatches = text.match(this.patterns.taprootAddress) || [];
    taprootMatches.forEach(match => {
      const artifact = this.createArtifact(ArtifactType.ADDRESS, match, 'Taproot Bitcoin Address', filePath, baseConfidence);
      artifacts.push(artifact);
    });
    
    // Private keys
    const wifMatches = text.match(this.patterns.wifPrivateKey) || [];
    wifMatches.forEach(match => {
      const artifact = this.createArtifact(ArtifactType.PRIVATE_KEY, match, 'WIF Private Key', filePath, baseConfidence);
      artifacts.push(artifact);
    });
    
    const hexMatches = text.match(this.patterns.hexPrivateKey) || [];
    hexMatches.forEach(match => {
      const artifact = this.createArtifact(ArtifactType.PRIVATE_KEY, match, 'Hex Private Key', filePath, baseConfidence);
      artifacts.push(artifact);
    });
    
    // Extended keys
    const extendedMatches = text.match(this.patterns.extendedKeys) || [];
    extendedMatches.forEach(match => {
      const keyType = match.startsWith('x') ? 'BIP32' : match.startsWith('y') ? 'BIP49' : 'BIP84';
      const artifact = this.createArtifact(ArtifactType.PRIVATE_KEY, match, `${keyType} Extended Key`, filePath, baseConfidence);
      artifacts.push(artifact);
    });
    
    // Seed phrases
    const seedMatches = text.match(this.patterns.seedPhrase) || [];
    seedMatches.forEach(match => {
      const words = match.trim().toLowerCase().split(/\s+/);
      if ([12, 15, 18, 21, 24].includes(words.length)) {
        const artifact = this.createArtifact(ArtifactType.SEED_PHRASE, match.trim(), `BIP39 Seed Phrase (${words.length} words)`, filePath, baseConfidence);
        artifacts.push(artifact);
      }
    });
    
    return artifacts;
  }

  /**
   * Wallet file specific scanning
   */
  private async scanWalletFile(filePath: string): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];
    
    try {
      const fileName = path.basename(filePath).toLowerCase();
      
      if (fileName.includes('wallet.dat')) {
        // Bitcoin Core wallet.dat
        const coreResults = await this.scanBitcoinCoreWallet(filePath);
        results.push(...coreResults);
      } else if (fileName.includes('electrum')) {
        // Electrum wallet
        const electrumResults = await this.scanElectrumWallet(filePath);
        results.push(...electrumResults);
      }
    } catch (error) {
      console.warn(`Wallet scan failed: ${error}`);
    }
    
    return results;
  }

  /**
   * Bitcoin Core wallet.dat scanning
   */
  private async scanBitcoinCoreWallet(filePath: string): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];
    
    try {
      // Bitcoin Core wallet.dat is a Berkeley DB file
      // For now, do hex carving - in production would use BDB parser
      const hexResults = await this.hexCarveFile(filePath);
      
      results.push({
        artifacts: [],
        metadata: {
          scanType: 'bitcoin_core_wallet',
          dataSource: filePath,
          confidence: 0.95,
          context: 'Bitcoin Core wallet.dat file detected'
        }
      });
      
      results.push(...hexResults);
    } catch (error) {
      console.warn(`Bitcoin Core wallet scan failed: ${error}`);
    }
    
    return results;
  }

  /**
   * Electrum wallet scanning
   */
  private async scanElectrumWallet(filePath: string): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];
    
    try {
      // Electrum wallets are JSON files
      const jsonResults = await this.scanJSONFile(filePath);
      
      results.push({
        artifacts: [],
        metadata: {
          scanType: 'electrum_wallet',
          dataSource: filePath,
          confidence: 0.95,
          context: 'Electrum wallet file detected'
        }
      });
      
      results.push(...jsonResults);
    } catch (error) {
      console.warn(`Electrum wallet scan failed: ${error}`);
    }
    
    return results;
  }

  /**
   * Directory scanning with recursion
   */
  private async scanDirectory(dirPath: string, options: any, depth: number): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];
    const maxDepth = 20; // Prevent infinite recursion
    
    if (depth > maxDepth) {
      return results;
    }
    
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        // Skip system directories and common exclusions
        if (this.shouldSkipPath(entry.name, fullPath)) {
          continue;
        }
        
        if (entry.isDirectory()) {
          const subResults = await this.scanDirectory(fullPath, options, depth + 1);
          results.push(...subResults);
        } else if (entry.isFile()) {
          const fileResults = await this.scanSingleFile(fullPath, options);
          results.push(...fileResults);
        }
      }
    } catch (error) {
      console.warn(`Cannot scan directory ${dirPath}: ${error}`);
    }
    
    return results;
  }

  // Helper methods
  private detectBitcoinArtifact(text: string, filePath: string, confidence: number): Artifact | null {
    // Legacy addresses
    if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(text)) {
      return this.createArtifact(ArtifactType.ADDRESS, text, 'Legacy Bitcoin Address', filePath, confidence);
    }
    
    // Bech32 addresses
    if (/^(bc1|tb1)[a-z0-9]{39,59}$/.test(text)) {
      return this.createArtifact(ArtifactType.ADDRESS, text, 'Bech32 Bitcoin Address', filePath, confidence);
    }
    
    // WIF private keys
    if (/^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/.test(text)) {
      return this.createArtifact(ArtifactType.PRIVATE_KEY, text, 'WIF Private Key', filePath, confidence);
    }
    
    // Hex private keys
    if (/^[a-fA-F0-9]{64}$/.test(text)) {
      return this.createArtifact(ArtifactType.PRIVATE_KEY, text, 'Hex Private Key', filePath, confidence);
    }
    
    return null;
  }

  private createArtifact(type: ArtifactType, raw: string, subtype: string, sourcePath: string, confidence: number): Artifact {
    return {
      id: this.generateId(raw),
      type,
      subtype,
      raw,
      source: {
        type: SourceType.FILE_SYSTEM,
        path: sourcePath,
        size: raw.length
      },
      metadata: {
        cryptocurrency: this.bitcoinType,
        confidence,
        tags: []
      },
      validationStatus: ValidationStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private generateId(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  private isTextFile(ext: string): boolean {
    const textExts = ['.txt', '.log', '.csv', '.json', '.xml', '.html', '.js', '.py', '.md', '.sql'];
    return textExts.includes(ext);
  }

  private shouldHexCarve(ext: string): boolean {
    const binaryExts = ['.dat', '.db', '.sqlite', '.bin', '.exe', '.dll', '.img', '.raw'];
    return binaryExts.includes(ext);
  }

  private isDatabaseFile(ext: string): boolean {
    const dbExts = ['.db', '.sqlite', '.sqlite3', '.mdb', '.json', '.xml'];
    return dbExts.includes(ext);
  }

  private isWalletFile(filename: string, ext: string): boolean {
    const walletKeywords = ['wallet', 'electrum', 'bitcoin', 'multibit', 'blockchain'];
    const walletExts = ['.dat', '.wallet', '.json'];
    
    return walletKeywords.some(kw => filename.includes(kw)) || walletExts.includes(ext);
  }

  private shouldSkipPath(name: string, fullPath: string): boolean {
    const skipDirs = ['node_modules', '.git', '.svn', 'System Volume Information', '$Recycle.Bin', '.Trash'];
    const skipPatterns = [/^\./, /~$/, /\.tmp$/];
    
    return skipDirs.includes(name) || skipPatterns.some(pattern => pattern.test(name));
  }

  private readFileWithEncoding(filePath: string): string {
    try {
      // Try UTF-8 first
      return fs.readFileSync(filePath, 'utf8');
    } catch {
      try {
        // Try ASCII if UTF-8 fails
        return fs.readFileSync(filePath, 'ascii');
      } catch {
        // Last resort - binary as hex
        return fs.readFileSync(filePath).toString('hex');
      }
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
