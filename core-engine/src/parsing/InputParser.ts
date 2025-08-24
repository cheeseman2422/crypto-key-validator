import * as fs from 'fs';
import * as path from 'path';
import { Database } from 'sqlite3';
import * as crypto from 'crypto';

import {
  Artifact,
  ArtifactType,
  ArtifactSource,
  SourceType,
  AutopsyArtifactInfo,
  CryptocurrencyType,
  ValidationStatus,
  ScanConfiguration
} from '../types';

// Crypto patterns - defined inline instead of importing JSON
const CRYPTO_PATTERNS = {
  "cryptocurrency_addresses": {
    "bitcoin": {
      "patterns": [
        "\\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\\b",
        "\\bbc1[a-z0-9]{39,59}\\b"
      ]
    },
    "ethereum": {
      "patterns": [
        "\\b0x[a-fA-F0-9]{40}\\b"
      ]
    },
    "monero": {
      "patterns": [
        "\\b4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}\\b",
        "\\b8[0-9AB][1-9A-HJ-NP-Za-km-z]{93}\\b"
      ]
    }
  }
};

export class InputParser {
  private patterns: Map<string, RegExp[]> = new Map();
  private cryptocurrencyTypes: Map<string, CryptocurrencyType> = new Map();

  constructor() {
    this.initializePatterns();
    this.initializeCryptocurrencyTypes();
  }

  private initializePatterns() {
    try {
      // Bitcoin address patterns - comprehensive coverage
      this.patterns.set('bitcoin_address_legacy', [
        /\b1[a-km-zA-HJ-NP-Z1-9]{25,34}\b/g,     // P2PKH Legacy (starts with 1)
      ]);
      
      this.patterns.set('bitcoin_address_p2sh', [
        /\b3[a-km-zA-HJ-NP-Z1-9]{25,34}\b/g,     // P2SH (starts with 3)
      ]);
      
      this.patterns.set('bitcoin_address_bech32', [
        /\bbc1q[a-z0-9]{38,62}\b/g,               // P2WPKH/P2WSH Bech32 (bc1q)
      ]);
      
      this.patterns.set('bitcoin_address_taproot', [
        /\bbc1p[a-z0-9]{56,58}\b/g,               // P2TR Taproot (bc1p)
      ]);
      
      // Bitcoin testnet addresses
      this.patterns.set('bitcoin_testnet_address', [
        /\b[mn][a-km-zA-HJ-NP-Z1-9]{25,33}\b/g,  // Testnet legacy (m/n prefix)
        /\b2[a-km-zA-HJ-NP-Z1-9]{25,34}\b/g,     // Testnet P2SH
        /\btb1[a-z0-9]{38,62}\b/g,               // Testnet bech32
      ]);

      // Bitcoin private keys - comprehensive WIF formats
      this.patterns.set('bitcoin_private_key_wif', [
        /\b5[1-9A-HJ-NP-Za-km-z]{50}\b/g,        // WIF Uncompressed (starts with 5)
        /\b[KL][1-9A-HJ-NP-Za-km-z]{51}\b/g,     // WIF Compressed (starts with K or L)
      ]);
      
      // Bitcoin private keys - testnet WIF
      this.patterns.set('bitcoin_testnet_private_key', [
        /\b9[1-9A-HJ-NP-Za-km-z]{50}\b/g,        // Testnet WIF Uncompressed
        /\bc[1-9A-HJ-NP-Za-km-z]{51}\b/g,        // Testnet WIF Compressed
      ]);
      
      // Bitcoin extended keys (HD wallets)
      this.patterns.set('bitcoin_extended_key_xpub', [
        /\bxpub[1-9A-HJ-NP-Za-km-z]{107,108}\b/g, // BIP32 Master Public Key
      ]);
      
      this.patterns.set('bitcoin_extended_key_xprv', [
        /\bxprv[1-9A-HJ-NP-Za-km-z]{107,108}\b/g, // BIP32 Master Private Key
      ]);
      
      this.patterns.set('bitcoin_extended_key_ypub', [
        /\bypub[1-9A-HJ-NP-Za-km-z]{107,108}\b/g, // BIP49 P2SH-wrapped SegWit
      ]);
      
      this.patterns.set('bitcoin_extended_key_yprv', [
        /\byprv[1-9A-HJ-NP-Za-km-z]{107,108}\b/g, // BIP49 P2SH-wrapped SegWit Private
      ]);
      
      this.patterns.set('bitcoin_extended_key_zpub', [
        /\bzpub[1-9A-HJ-NP-Za-km-z]{107,108}\b/g, // BIP84 Native SegWit
      ]);
      
      this.patterns.set('bitcoin_extended_key_zprv', [
        /\bzprv[1-9A-HJ-NP-Za-km-z]{107,108}\b/g, // BIP84 Native SegWit Private
      ]);
      
      // Bitcoin raw private keys
      this.patterns.set('bitcoin_private_key_hex', [
        /\b[a-fA-F0-9]{64}\b/g,                   // 32-byte hex private key
      ]);
      
      // Bitcoin mini private keys (Casascius)
      this.patterns.set('bitcoin_mini_private_key', [
        /\bS[1-9A-HJ-NP-Za-km-z]{21,29}\b/g,     // Mini private key format
      ]);
      
      // BIP38 encrypted private keys
      this.patterns.set('bitcoin_bip38_encrypted_key', [
        /\b6P[1-9A-HJ-NP-Za-km-z]{56}\b/g,       // BIP38 encrypted key (6P prefix)
      ]);
      
      // Bitcoin seed phrases (BIP39) - more precise patterns
      this.patterns.set('bitcoin_seed_phrase_12', [
        /\b(?:[a-z]{3,8}\s+){11}[a-z]{3,8}\b/gi, // 12 words, 3-8 chars each
      ]);
      
      this.patterns.set('bitcoin_seed_phrase_15', [
        /\b(?:[a-z]{3,8}\s+){14}[a-z]{3,8}\b/gi, // 15 words
      ]);
      
      this.patterns.set('bitcoin_seed_phrase_18', [
        /\b(?:[a-z]{3,8}\s+){17}[a-z]{3,8}\b/gi, // 18 words
      ]);
      
      this.patterns.set('bitcoin_seed_phrase_21', [
        /\b(?:[a-z]{3,8}\s+){20}[a-z]{3,8}\b/gi, // 21 words
      ]);
      
      this.patterns.set('bitcoin_seed_phrase_24', [
        /\b(?:[a-z]{3,8}\s+){23}[a-z]{3,8}\b/gi, // 24 words
      ]);

      // Patterns initialized
    } catch (error) {
      console.error('Failed to initialize patterns:', error);
    }
  }

  private initializeCryptocurrencyTypes() {
    this.cryptocurrencyTypes.set('bitcoin', {
      name: 'Bitcoin',
      symbol: 'BTC',
      network: 'mainnet',
      coinType: 0
    });

    this.cryptocurrencyTypes.set('ethereum', {
      name: 'Ethereum',
      symbol: 'ETH',
      network: 'mainnet',
      coinType: 60
    });

    this.cryptocurrencyTypes.set('monero', {
      name: 'Monero',
      symbol: 'XMR',
      network: 'mainnet',
      coinType: 128
    });

    this.cryptocurrencyTypes.set('litecoin', {
      name: 'Litecoin',
      symbol: 'LTC',
      network: 'mainnet',
      coinType: 2
    });
  }

  /**
   * Parse Autopsy case database for cryptocurrency artifacts
   */
  async parseAutopsyCase(caseDatabasePath: string): Promise<Artifact[]> {
    return new Promise((resolve, reject) => {
      const artifacts: Artifact[] = [];
      
      // Check if file exists first
      if (!fs.existsSync(caseDatabasePath)) {
        reject(new Error(`Autopsy database file not found: ${caseDatabasePath}`));
        return;
      }
      
      const db = new Database(caseDatabasePath, (err) => {
        if (err) {
          reject(new Error(`Failed to open Autopsy case database: ${err.message}`));
          return;
        }

        // Query for cryptocurrency artifacts
        const query = `
          SELECT 
            a.artifact_id,
            a.obj_id,
            at.type_name,
            attr.value_text,
            attr.value_byte,
            f.name as file_name,
            f.parent_path,
            f.size
          FROM blackboard_artifacts a
          JOIN blackboard_artifact_types at ON a.artifact_type_id = at.artifact_type_id
          LEFT JOIN blackboard_attributes attr ON a.artifact_id = attr.artifact_id
          LEFT JOIN tsk_files f ON a.obj_id = f.obj_id
          WHERE at.type_name IN (
            'TSK_CRYPTO_WALLET',
            'TSK_CRYPTO_ADDRESS', 
            'TSK_CRYPTO_PRIVATE_KEY',
            'TSK_CRYPTO_TRANSACTION'
          )
          ORDER BY a.artifact_id, attr.attribute_type_id
        `;

        db.all(query, [], (err, rows: any[]) => {
          if (err) {
            reject(new Error(`Failed to query artifacts: ${err.message}`));
            return;
          }

          // Group rows by artifact_id
          const artifactGroups = new Map<number, any[]>();
          for (const row of rows) {
            if (!artifactGroups.has(row.artifact_id)) {
              artifactGroups.set(row.artifact_id, []);
            }
            artifactGroups.get(row.artifact_id)!.push(row);
          }

          // Convert to artifacts
          for (const [artifactId, rows] of artifactGroups) {
            try {
              const artifact = this.convertAutopsyArtifact(artifactId, rows);
              if (artifact) {
                artifacts.push(artifact);
              }
            } catch (error) {
              console.warn(`Failed to convert artifact ${artifactId}:`, error);
            }
          }

          db.close();
          resolve(artifacts);
        });
      });
    });
  }

  /**
   * Convert Autopsy database rows to Artifact object
   */
  private convertAutopsyArtifact(artifactId: number, rows: any[]): Artifact | null {
    if (rows.length === 0) return null;

    const firstRow = rows[0];
    const attributes: Record<string, any> = {};
    
    // Collect all attributes
    for (const row of rows) {
      if (row.value_text) {
        attributes[row.attribute_type_id] = row.value_text;
      } else if (row.value_byte) {
        attributes[row.attribute_type_id] = row.value_byte;
      }
    }

    // Determine artifact type and extract value
    let artifactType: ArtifactType;
    let cryptoType: string = 'bitcoin'; // default
    let rawValue: string = '';

    switch (firstRow.type_name) {
      case 'TSK_CRYPTO_WALLET':
        artifactType = ArtifactType.WALLET_FILE;
        rawValue = firstRow.file_name || '';
        break;
      case 'TSK_CRYPTO_ADDRESS':
        artifactType = ArtifactType.ADDRESS;
        rawValue = attributes['TSK_CRYPTO_VALUE'] || '';
        cryptoType = attributes['TSK_CRYPTO_TYPE']?.toLowerCase() || 'bitcoin';
        break;
      case 'TSK_CRYPTO_PRIVATE_KEY':
        artifactType = ArtifactType.PRIVATE_KEY;
        rawValue = attributes['TSK_CRYPTO_VALUE'] || '';
        break;
      case 'TSK_CRYPTO_TRANSACTION':
        artifactType = ArtifactType.TRANSACTION;
        rawValue = attributes['TSK_CRYPTO_VALUE'] || '';
        break;
      default:
        return null;
    }

    const cryptocurrency = this.cryptocurrencyTypes.get(cryptoType) || this.cryptocurrencyTypes.get('bitcoin')!;

    return {
      id: crypto.randomUUID(),
      type: artifactType,
      subtype: firstRow.type_name,
      raw: rawValue,
      source: {
        type: SourceType.AUTOPSY_EXPORT,
        path: path.join(firstRow.parent_path || '', firstRow.file_name || ''),
        size: firstRow.size,
        autopsy: {
          artifactId,
          caseId: '', // Would need to be extracted from case metadata
          objectId: firstRow.obj_id,
          artifactTypeName: firstRow.type_name,
          attributes
        }
      },
      metadata: {
        cryptocurrency,
        confidence: 0.8, // Autopsy artifacts are generally reliable
        tags: ['autopsy', cryptoType]
      },
      validationStatus: ValidationStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * [DEPRECATED] Parse files and folders for cryptocurrency artifacts
   * 
   * This method is deprecated. Use Autopsy's CryptocurrencyArtifactDetector for
   * filesystem scanning instead, then import results via parseAutopsyCase().
   * 
   * @deprecated Use parseAutopsyCase() with CryptocurrencyArtifactDetector output instead
   */
  async parseFileSystem(rootPath: string, config: ScanConfiguration): Promise<Artifact[]> {
    console.warn(
      '[DEPRECATED] parseFileSystem() is deprecated. ' +
      'Use Autopsy\'s CryptocurrencyArtifactDetector for filesystem scanning instead.'
    );
    
    // Return empty array - filesystem scanning is now handled by Autopsy
    return [];
  }

  /**
   * Recursively scan directory for files matching criteria
   */
  private async scanDirectory(dirPath: string, config: ScanConfiguration): Promise<string[]> {
    const files: string[] = [];
    
    const scanRecursive = async (currentPath: string, depth: number = 0): Promise<void> => {
      if (depth > 10) return; // Prevent infinite recursion
      
      try {
        const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          
          // Skip excluded paths
          if (config.excludePaths.some(exclude => fullPath.includes(exclude))) {
            continue;
          }
          
          if (entry.isDirectory()) {
            if (config.followSymlinks || !entry.isSymbolicLink()) {
              await scanRecursive(fullPath, depth + 1);
            }
          } else if (entry.isFile()) {
            try {
              // Check file type filter
              const ext = path.extname(entry.name).toLowerCase();
              if (config.fileTypes.length === 0 || config.fileTypes.includes(ext)) {
                // Check file size
                const stats = await fs.promises.stat(fullPath);
                if (stats.size <= config.maxFileSize) {
                  files.push(fullPath);
                }
              }
            } catch (statError) {
              console.warn(`Cannot stat file ${fullPath}:`, statError);
            }
          }
        }
      } catch (error) {
        console.warn(`Cannot scan directory ${currentPath}:`, error);
      }
    };

    await scanRecursive(dirPath);
    return files;
  }

  /**
   * Parse individual file for cryptocurrency artifacts
   */
  async parseFile(filePath: string, config: ScanConfiguration): Promise<Artifact[]> {
    const artifacts: Artifact[] = [];
    
    try {
      // Check if it's a known wallet file first
      const walletArtifacts = await this.parseWalletFile(filePath);
      artifacts.push(...walletArtifacts);
      
      // Then scan content for patterns
      const contentArtifacts = await this.parseFileContent(filePath, config);
      artifacts.push(...contentArtifacts);
      
    } catch (error) {
      console.warn(`Error parsing file ${filePath}:`, error);
    }

    return artifacts;
  }

  /**
   * Parse known wallet file types
   */
  private async parseWalletFile(filePath: string): Promise<Artifact[]> {
    const artifacts: Artifact[] = [];
    const fileName = path.basename(filePath).toLowerCase();
    const fileExt = path.extname(filePath).toLowerCase();
    
    // Bitcoin wallet file types - comprehensive detection
    const walletTypes = [
      // Bitcoin Core wallets
      { name: 'Bitcoin Core Legacy', files: ['wallet.dat'], dirs: ['wallets'], crypto: 'bitcoin' },
      { name: 'Bitcoin Core Descriptor', extensions: ['.dat'], patterns: ['wallet_'], crypto: 'bitcoin' },
      
      // Electrum wallets
      { name: 'Electrum', files: ['default_wallet'], extensions: ['.wallet'], crypto: 'bitcoin' },
      { name: 'Electrum Portable', patterns: ['electrum'], extensions: ['.wallet'], crypto: 'bitcoin' },
      
      // Hardware wallet files
      { name: 'Ledger', files: ['ledger.dat'], patterns: ['ledger'], crypto: 'bitcoin' },
      { name: 'Trezor', files: ['trezor.dat'], patterns: ['trezor'], crypto: 'bitcoin' },
      { name: 'Hardware Wallet Backup', extensions: ['.backup', '.hww'], crypto: 'bitcoin' },
      
      // Desktop wallet applications
      { name: 'Bitcoin Knots', files: ['wallet.dat'], dirs: ['BitcoinKnots'], crypto: 'bitcoin' },
      { name: 'Exodus Bitcoin', files: ['seed.seco', 'info.seco'], dirs: ['Exodus'], crypto: 'bitcoin' },
      { name: 'Atomic Wallet', files: ['wallet.dat'], dirs: ['atomic'], crypto: 'bitcoin' },
      { name: 'Wasabi Wallet', files: ['wallet.json'], dirs: ['WalletWasabi'], crypto: 'bitcoin' },
      
      // Mobile wallet backups
      { name: 'Bitcoin Mobile Backup', extensions: ['.aes', '.backup', '.json'], patterns: ['bitcoin', 'btc'], crypto: 'bitcoin' },
      
      // Paper/Brain wallet files
      { name: 'Paper Wallet', extensions: ['.html', '.pdf'], patterns: ['bitaddress', 'paperwallet'], crypto: 'bitcoin' },
      { name: 'Brain Wallet', files: ['brain.txt', 'passphrase.txt'], crypto: 'bitcoin' },
      
      // Bitcoin configuration and data files
      { name: 'Bitcoin Config', files: ['bitcoin.conf'], crypto: 'bitcoin' },
      { name: 'Bitcoin Debug Log', files: ['debug.log'], dirs: ['.bitcoin', 'Bitcoin'], crypto: 'bitcoin' },
      
      // Lightning Network files
      { name: 'Lightning Network', files: ['channel.backup'], dirs: ['lnd', 'lightning'], crypto: 'bitcoin' },
      { name: 'LND Wallet', files: ['wallet.db'], dirs: ['lnd'], crypto: 'bitcoin' },
      
      // Exchange and service exports
      { name: 'Bitcoin Exchange Export', extensions: ['.csv'], patterns: ['bitcoin', 'btc'], crypto: 'bitcoin' },
      { name: 'Blockchain.info Backup', extensions: ['.aes'], patterns: ['blockchain'], crypto: 'bitcoin' }
    ];

    for (const walletType of walletTypes) {
      let isMatch = false;
      
      if (walletType.files && walletType.files.includes(fileName)) {
        isMatch = true;
      } else if (walletType.extensions && walletType.extensions.includes(fileExt)) {
        isMatch = true;
      }
      
      if (isMatch) {
        const stats = await fs.promises.stat(filePath);
        
        artifacts.push({
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
            cryptocurrency: this.cryptocurrencyTypes.get('bitcoin')!, // Default to Bitcoin
            confidence: 0.9,
            walletType: walletType.name,
            isEncrypted: await this.checkIfEncrypted(filePath),
            tags: ['wallet', walletType.name.toLowerCase()]
          },
          validationStatus: ValidationStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    return artifacts;
  }

  /**
   * Parse file content using regex patterns
   */
  private async parseFileContent(filePath: string, config: ScanConfiguration): Promise<Artifact[]> {
    const artifacts: Artifact[] = [];
    
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      
      // Search for cryptocurrency addresses
      for (const [cryptoType, patterns] of this.patterns) {
        for (const pattern of patterns) {
          const matches = content.match(pattern);
          if (matches) {
            for (const match of matches) {
              const artifactType = this.getArtifactTypeFromPattern(cryptoType);
              const cryptocurrency = this.getCryptocurrencyFromPattern(cryptoType);
              
              artifacts.push({
                id: crypto.randomUUID(),
                type: artifactType,
                subtype: cryptoType,
                raw: match,
                source: {
                  type: SourceType.FILE_SYSTEM,
                  path: filePath
                },
                metadata: {
                  cryptocurrency,
                  confidence: 0.7, // Pattern matches are less certain
                  tags: [cryptoType, 'pattern_match']
                },
                validationStatus: ValidationStatus.PENDING,
                createdAt: new Date(),
                updatedAt: new Date()
              });
            }
          }
        }
      }
    } catch (error) {
      // File might be binary, try a different approach
      if (config.deepScan) {
        await this.parseBinaryFile(filePath, artifacts);
      }
    }

    return artifacts;
  }

  /**
   * Parse binary files for patterns
   */
  private async parseBinaryFile(filePath: string, artifacts: Artifact[]): Promise<void> {
    try {
      const buffer = await fs.promises.readFile(filePath);
      const content = buffer.toString('binary');
      
      // Convert to readable string and search for patterns
      const readableContent = content.replace(/[^\x20-\x7E]/g, ' ');
      
      for (const [cryptoType, patterns] of this.patterns) {
        for (const pattern of patterns) {
          const matches = readableContent.match(pattern);
          if (matches) {
            for (const match of matches) {
              const artifactType = this.getArtifactTypeFromPattern(cryptoType);
              const cryptocurrency = this.getCryptocurrencyFromPattern(cryptoType);
              
              artifacts.push({
                id: crypto.randomUUID(),
                type: artifactType,
                subtype: cryptoType,
                raw: match,
                source: {
                  type: SourceType.FILE_SYSTEM,
                  path: filePath
                },
                metadata: {
                  cryptocurrency,
                  confidence: 0.5, // Binary file matches are less certain
                  tags: [cryptoType, 'binary_scan']
                },
                validationStatus: ValidationStatus.PENDING,
                createdAt: new Date(),
                updatedAt: new Date()
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to parse binary file ${filePath}:`, error);
    }
  }

  /**
   * Parse JSON export from CryptocurrencyArtifactDetector
   */
  async parseAutopsyJsonExport(jsonFilePath: string): Promise<Artifact[]> {
    const artifacts: Artifact[] = [];
    
    try {
      const jsonContent = await fs.promises.readFile(jsonFilePath, 'utf8');
      const exportData = JSON.parse(jsonContent);
      
      if (!exportData.artifacts || !Array.isArray(exportData.artifacts)) {
        throw new Error('Invalid JSON export format - missing artifacts array');
      }
      
      console.log(`Processing ${exportData.artifacts.length} artifacts from Autopsy export`);
      
      for (const autopsyArtifact of exportData.artifacts) {
        try {
          const artifact = this.convertAutopsyJsonToArtifact(autopsyArtifact, exportData.case_info);
          if (artifact) {
            artifacts.push(artifact);
          }
        } catch (error) {
          console.warn(`Failed to convert artifact ${autopsyArtifact.id}:`, error);
        }
      }
      
      console.log(`Successfully converted ${artifacts.length} artifacts from JSON export`);
      
    } catch (error) {
      console.error('Failed to parse Autopsy JSON export:', error);
      throw error;
    }
    
    return artifacts;
  }
  
  /**
   * Convert Autopsy JSON artifact to internal Artifact format
   */
  private convertAutopsyJsonToArtifact(autopsyArtifact: any, caseInfo: any): Artifact | null {
    try {
      // Determine artifact type
      let artifactType: ArtifactType;
      let cryptoType: string = 'bitcoin'; // default
      let rawValue: string = '';
      
      switch (autopsyArtifact.type) {
        case 'TSK_CRYPTO_WALLET':
          artifactType = ArtifactType.WALLET_FILE;
          rawValue = autopsyArtifact.file_info?.name || autopsyArtifact.attributes?.['Wallet Name'] || '';
          break;
        case 'TSK_CRYPTO_ADDRESS':
          artifactType = ArtifactType.ADDRESS;
          rawValue = autopsyArtifact.attributes?.['Cryptocurrency Value'] || '';
          cryptoType = (autopsyArtifact.attributes?.['Cryptocurrency Type'] || 'bitcoin').toLowerCase();
          break;
        case 'TSK_CRYPTO_PRIVATE_KEY':
          artifactType = ArtifactType.PRIVATE_KEY;
          rawValue = autopsyArtifact.attributes?.['Cryptocurrency Value'] || '';
          
          // Detect if it's a seed phrase
          if (rawValue.split(' ').length >= 12) {
            artifactType = ArtifactType.SEED_PHRASE;
          }
          break;
        case 'TSK_CRYPTO_TRANSACTION':
          artifactType = ArtifactType.TRANSACTION;
          rawValue = autopsyArtifact.attributes?.['Cryptocurrency Value'] || '';
          break;
        default:
          console.warn(`Unknown artifact type: ${autopsyArtifact.type}`);
          return null;
      }
      
      const cryptocurrency = this.cryptocurrencyTypes.get(cryptoType) || this.cryptocurrencyTypes.get('bitcoin')!;
      
      return {
        id: crypto.randomUUID(),
        type: artifactType,
        subtype: autopsyArtifact.type,
        raw: rawValue,
        source: {
          type: SourceType.AUTOPSY_EXPORT,
          path: autopsyArtifact.file_info?.path || 'unknown',
          size: autopsyArtifact.file_info?.size,
          hash: autopsyArtifact.file_info?.md5,
          autopsy: {
            artifactId: parseInt(autopsyArtifact.id),
            caseId: caseInfo?.number || '',
            objectId: autopsyArtifact.obj_id,
            artifactTypeName: autopsyArtifact.type,
            attributes: autopsyArtifact.attributes
          }
        },
        metadata: {
          cryptocurrency,
          confidence: 0.9, // Autopsy artifacts are high confidence
          tags: ['autopsy', 'json_export', cryptoType]
        },
        validationStatus: ValidationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
    } catch (error) {
      console.error('Failed to convert Autopsy artifact:', error);
      return null;
    }
  }

  /**
   * Parse direct text input
   */
  parseDirectInput(input: string, sourceType: SourceType = SourceType.DIRECT_INPUT): Artifact[] {
    const artifacts: Artifact[] = [];
    
    for (const [cryptoType, patterns] of this.patterns) {
      for (const pattern of patterns) {
        const matches = input.match(pattern);
        if (matches) {
          for (const match of matches) {
            const artifactType = this.getArtifactTypeFromPattern(cryptoType);
            const cryptocurrency = this.getCryptocurrencyFromPattern(cryptoType);
            
            artifacts.push({
              id: crypto.randomUUID(),
              type: artifactType,
              subtype: cryptoType,
              raw: match,
              source: {
                type: sourceType,
                path: 'direct_input'
              },
              metadata: {
                cryptocurrency,
                confidence: 0.8, // User input is generally reliable
                tags: [cryptoType, 'direct_input']
              },
              validationStatus: ValidationStatus.PENDING,
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
        }
      }
    }

    return artifacts;
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
    if (patternType.includes('bitcoin') || patternType.includes('testnet')) {
      return this.cryptocurrencyTypes.get('bitcoin')!;
    }
    
    // Legacy support (will be removed)
    if (patternType.includes('ethereum')) return this.cryptocurrencyTypes.get('ethereum')!;
    if (patternType.includes('monero')) return this.cryptocurrencyTypes.get('monero')!;
    if (patternType.includes('litecoin')) return this.cryptocurrencyTypes.get('litecoin')!;
    
    return this.cryptocurrencyTypes.get('bitcoin')!; // Bitcoin is default
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
