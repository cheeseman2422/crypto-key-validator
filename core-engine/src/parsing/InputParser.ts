
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

import {
  Artifact,
  ArtifactType,
  ArtifactSource,
  SourceType,
  CryptocurrencyType,
  ValidationStatus,
  ScanConfiguration
} from '../types';


import { bitcoinPatterns, bitcoinWalletTypes } from '../utils/bitcoinPatterns';


class InputParser {
  private bitcoinPatterns = bitcoinPatterns;
  private db: any | null = null;

  constructor(dbPath?: string) {
    if (dbPath) {
      // Dynamically require to avoid runtime dependency unless enabled
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const BetterSqlite3 = require('better-sqlite3');
      this.db = new BetterSqlite3(dbPath);
      this.initDb();
    }
  }

  private initDb() {
    if (!this.db) return;
    this.db.exec(`CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      type TEXT,
      subtype TEXT,
      raw TEXT,
      source_type TEXT,
      source_path TEXT,
      metadata TEXT,
      validation_status TEXT,
      created_at TEXT,
      updated_at TEXT
    )`);
  }

  private saveArtifactToDb(artifact: Artifact) {
    if (!this.db) return;
    const stmt = this.db.prepare(`INSERT OR REPLACE INTO artifacts
      (id, type, subtype, raw, source_type, source_path, metadata, validation_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.run(
      artifact.id,
      artifact.type,
      artifact.subtype,
      artifact.raw,
      artifact.source.type,
      artifact.source.path,
      JSON.stringify(artifact.metadata),
      artifact.validationStatus,
      artifact.createdAt.toISOString(),
      artifact.updatedAt.toISOString()
    );
  }



  // Parse individual file for cryptocurrency artifacts
  async parseFile(filePath: string, config: ScanConfiguration): Promise<Artifact[]> {
    const artifacts: Artifact[] = [];
    try {
      const walletArtifacts = await this.parseWalletFile(filePath);
      artifacts.push(...walletArtifacts);
      // Save to DB if enabled
      for (const artifact of artifacts) {
        this.saveArtifactToDb(artifact);
      }
    } catch (error) {
      console.warn(`Error parsing file ${filePath}:`, error);
    }
    return artifacts;
  }

  // Recursively scan a filesystem path and parse files
  async parseFileSystem(rootPath: string, config: ScanConfiguration): Promise<Artifact[]> {
    const results: Artifact[] = [];

    // Check if path exists
    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(rootPath);
    } catch {
      throw new Error('Path does not exist');
    }
    if (!stat.isDirectory()) {
      throw new Error('Path is not a directory');
    }

    const shouldExclude = (p: string) => {
      if (!config.excludePaths) return false;
      // Exclude if any part of the path contains the excluded path
      return config.excludePaths.some(ex => p.includes(ex));
    };

    const shouldInclude = (p: string) => {
      if (!config.includePaths || config.includePaths.length === 0) return true;
      return config.includePaths.some(inc => p.startsWith(inc));
    };

    const stack: string[] = [rootPath];
    while (stack.length > 0) {
      const current = stack.pop() as string;
      if (shouldExclude(current) || !shouldInclude(current)) continue;
      let currentStat: fs.Stats;
      try {
        currentStat = await fs.promises.stat(current);
      } catch (e) {
        console.warn(`Skipping path due to error: ${current}`, e);
        continue;
      }
      if (currentStat.isDirectory()) {
        const entries = await fs.promises.readdir(current, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(current, entry.name);
          if (entry.isDirectory()) {
            stack.push(full);
          } else if (entry.isFile()) {
            // Filter by file size
            const fileStat = await fs.promises.stat(full);
            if (config.maxFileSize && fileStat.size > config.maxFileSize) continue;
            // Filter by extension if fileTypes provided
            if (config.fileTypes && config.fileTypes.length > 0) {
              const ext = path.extname(full).toLowerCase();
              if (!config.fileTypes.includes(ext)) continue;
            }
            if (shouldExclude(full)) continue;
            const artifacts = await this.parseFile(full, config);
            if (artifacts.length) results.push(...artifacts);
          }
        }
      }
    }
    return results;
  }

  // Parse known wallet file types
  private async parseWalletFile(filePath: string): Promise<Artifact[]> {
  let walletArtifacts: Artifact[] = [];
    const fileName = path.basename(filePath).toLowerCase();
    const fileExt = path.extname(filePath).toLowerCase();
    const walletTypes = bitcoinWalletTypes;
    for (const walletType of walletTypes) {
      let isMatch = false;
      if (walletType.files && walletType.files.includes(fileName)) {
        isMatch = true;
      } else if (walletType.extensions && walletType.extensions.includes(fileExt)) {
        isMatch = true;
      }
      if (isMatch) {
        const stats = await fs.promises.stat(filePath);
        walletArtifacts.push({
          id: crypto.randomUUID(),
          type: ArtifactType.WALLET_FILE,
          subtype: walletType.name,
          raw: filePath,
          source: {
            type: SourceType.FILE_SYSTEM,
            path: filePath,
            size: stats.size,
            hash: await this.calculateFileHash(filePath)
          },
          metadata: {
            cryptocurrency: { name: 'Bitcoin', symbol: 'BTC', network: 'mainnet', coinType: 0 },
            confidence: 0.9,
            walletType: walletType.name,
            tags: ['wallet', walletType.name]
          },
          validationStatus: ValidationStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    // Scan file content for addresses, keys, seed phrases
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const found = this.parseDirectInput(content, SourceType.FILE_SYSTEM);
      for (const artifact of found) {
        artifact.source.path = filePath;
        walletArtifacts.push(artifact);
      }
    } catch {}
    // Remove duplicates by raw value and type
    const unique = new Map<string, Artifact>();
    for (const artifact of walletArtifacts) {
      unique.set(artifact.type + ':' + artifact.raw, artifact);
    }
    return Array.from(unique.values());
  }



  /**
   * Parse direct text input
   */
  parseDirectInput(input: string, sourceType: SourceType = SourceType.DIRECT_INPUT): Artifact[] {
  const artifacts: Artifact[] = [];
    const subtypeMap: Record<string, string> = {
      legacyAddress: 'Legacy Address (P2PKH/P2SH)',
      bech32Address: 'Bech32 Address (P2WPKH/P2WSH)',
      taprootAddress: 'Taproot Address (P2TR)',
      wifPrivateKey: 'WIF Private Key',
      hexPrivateKey: 'Raw Hex Private Key',
      seedPhrase: (input.split(/\s+/).length === 12) ? 'BIP39 Seed Phrase (12 words)' : (input.split(/\s+/).length === 24) ? 'BIP39 Seed Phrase (24 words)' : 'BIP39 Seed Phrase',
    };
  const parsedArtifacts: Artifact[] = [];
    for (const [cryptoType, pattern] of Object.entries(this.bitcoinPatterns)) {
      if (cryptoType === 'walletSignatures') continue;
      let matches = input.match(pattern as RegExp);
      if (!matches) continue;
      let matchArr: string[] = Array.isArray(matches) ? matches : Array.from(matches ?? []);
      // Special case: Taproot addresses are a subset of Bech32, so filter them out from Bech32 results
      if (cryptoType === 'bech32Address') {
        matchArr = matchArr.filter((m: string) => !/^bc1p/.test(m));
      }
      for (const match of matchArr) {
        let artifactType: ArtifactType;
        let subtype: string;
        switch (cryptoType) {
          case 'legacyAddress':
            artifactType = ArtifactType.ADDRESS;
            subtype = 'Legacy Address (P2PKH/P2SH)';
            break;
          case 'bech32Address':
            artifactType = ArtifactType.ADDRESS;
            subtype = 'Bech32 Address (P2WPKH/P2WSH)';
            break;
          case 'taprootAddress':
            artifactType = ArtifactType.ADDRESS;
            subtype = 'Taproot Address (P2TR)';
            break;
          case 'wifPrivateKey':
            artifactType = ArtifactType.PRIVATE_KEY;
            subtype = 'WIF Private Key';
            break;
          case 'hexPrivateKey':
            artifactType = ArtifactType.PRIVATE_KEY;
            subtype = 'Raw Hex Private Key';
            break;
          case 'seedPhrase': {
            artifactType = ArtifactType.SEED_PHRASE;
            const wordCount = match.trim().split(/\s+/).length;
            if (wordCount === 12) subtype = 'BIP39 Seed Phrase (12 words)';
            else if (wordCount === 24) subtype = 'BIP39 Seed Phrase (24 words)';
            else subtype = 'BIP39 Seed Phrase';
            break;
          }
          default:
            artifactType = this.getArtifactTypeFromPattern(cryptoType);
            subtype = cryptoType;
        }
        const cryptocurrency: CryptocurrencyType = { name: 'Bitcoin', symbol: 'BTC', network: 'mainnet', coinType: 0 };
        const artifact: Artifact = {
          id: crypto.randomUUID(),
          type: artifactType,
          subtype,
          raw: match,
          source: {
            type: sourceType,
            path: sourceType === SourceType.DIRECT_INPUT ? 'direct_input' : ''
          },
          metadata: {
            cryptocurrency,
            confidence: 0.8,
            tags: [cryptoType, sourceType === SourceType.DIRECT_INPUT ? 'direct_input' : 'file_system']
          },
          validationStatus: ValidationStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date()
        };
    parsedArtifacts.push(artifact);
        this.saveArtifactToDb(artifact);
      }
    }
  return parsedArtifacts;
  }

  /**
   * Enhanced helper methods for Bitcoin pattern recognition
   */
  private getArtifactTypeFromPattern(patternType: string): ArtifactType {
    // Bitcoin address patterns
    if (patternType.includes('address')) return ArtifactType.ADDRESS;
    
    // Bitcoin private key patterns
    if (patternType.includes('private_key') || patternType.includes('extended_key') || patternType.includes('bip38') || patternType.includes('mini_private_key')) {
      return ArtifactType.PRIVATE_KEY;
    }
    
    // Bitcoin seed phrase patterns
    if (patternType.includes('seed_phrase')) return ArtifactType.SEED_PHRASE;
    
    return ArtifactType.ADDRESS; // default
  }

  private getCryptocurrencyFromPattern(patternType: string): CryptocurrencyType {
    // All patterns are Bitcoin-focused now
  return 'bitcoin' as unknown as CryptocurrencyType;
  }

  /**
   * Get detailed Bitcoin pattern information
   */
  private getBitcoinPatternDetails(patternType: string): { addressType: string, network: string, keyType?: string } {
    // Address types
    if (patternType.includes('address_legacy')) return { addressType: 'P2PKH', network: 'mainnet' };
    if (patternType.includes('address_p2sh')) return { addressType: 'P2SH', network: 'mainnet' };
    if (patternType.includes('address_bech32')) return { addressType: 'P2WPKH/P2WSH', network: 'mainnet' };
    if (patternType.includes('address_taproot')) return { addressType: 'P2TR', network: 'mainnet' };
    if (patternType.includes('testnet_address')) return { addressType: 'Testnet', network: 'testnet' };
    
    // Private key types
    if (patternType.includes('private_key_wif')) return { addressType: 'WIF', network: 'mainnet', keyType: 'private' };
    if (patternType.includes('testnet_private_key')) return { addressType: 'WIF', network: 'testnet', keyType: 'private' };
    if (patternType.includes('private_key_hex')) return { addressType: 'Raw Hex', network: 'mainnet', keyType: 'private' };
    if (patternType.includes('mini_private_key')) return { addressType: 'Mini Key', network: 'mainnet', keyType: 'private' };
    if (patternType.includes('bip38_encrypted_key')) return { addressType: 'BIP38', network: 'mainnet', keyType: 'encrypted' };
    
    // Extended keys
    if (patternType.includes('extended_key_xpub')) return { addressType: 'BIP32 xpub', network: 'mainnet', keyType: 'public' };
    if (patternType.includes('extended_key_xprv')) return { addressType: 'BIP32 xprv', network: 'mainnet', keyType: 'private' };
    if (patternType.includes('extended_key_ypub')) return { addressType: 'BIP49 ypub', network: 'mainnet', keyType: 'public' };
    if (patternType.includes('extended_key_yprv')) return { addressType: 'BIP49 yprv', network: 'mainnet', keyType: 'private' };
    if (patternType.includes('extended_key_zpub')) return { addressType: 'BIP84 zpub', network: 'mainnet', keyType: 'public' };
    if (patternType.includes('extended_key_zprv')) return { addressType: 'BIP84 zprv', network: 'mainnet', keyType: 'private' };
    
    // Seed phrases
    if (patternType.includes('seed_phrase')) {
      const wordCount = patternType.includes('_12') ? '12' : 
                       patternType.includes('_15') ? '15' : 
                       patternType.includes('_18') ? '18' : 
                       patternType.includes('_21') ? '21' : 
                       patternType.includes('_24') ? '24' : 'unknown';
      return { addressType: `BIP39 ${wordCount} words`, network: 'mainnet', keyType: 'seed' };
    }
    
    return { addressType: 'Unknown', network: 'mainnet' };
  }

  private async calculateFileHash(filePath: string): Promise<string> {
    try {
      const buffer = await fs.promises.readFile(filePath);
      return crypto.createHash('sha256').update(buffer).digest('hex');
    } catch {
      return '';
    }
  }

  private async checkIfEncrypted(filePath: string): Promise<boolean> {
    try {
      const buffer = await fs.promises.readFile(filePath, { encoding: null });
      
      // Simple heuristics for encrypted files
      if (buffer.length === 0) return false;
      
      // Check for high entropy (encrypted files tend to have high entropy)
      const entropy = this.calculateEntropy(buffer);
      return entropy > 7.5; // Threshold for detecting encrypted content
    } catch {
      return false;
    }
  }

  private calculateEntropy(buffer: Buffer): number {
    const frequencies = new Array(256).fill(0);
    
    for (let i = 0; i < buffer.length; i++) {
      frequencies[buffer[i]]++;
    }
    
    let entropy = 0;
    const length = buffer.length;
    
    for (let i = 0; i < 256; i++) {
      if (frequencies[i] > 0) {
        const p = frequencies[i] / length;
        entropy -= p * Math.log2(p);
      }
    }
    
    return entropy;
  }

}


export default InputParser;
