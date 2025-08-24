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
      // Bitcoin patterns
      this.patterns.set('bitcoin_address', [
        /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g,  // Legacy
        /\bbc1[a-z0-9]{39,59}\b/g                 // Bech32
      ]);

      // Ethereum patterns
      this.patterns.set('ethereum_address', [
        /\b0x[a-fA-F0-9]{40}\b/g
      ]);

      // Monero patterns
      this.patterns.set('monero_address', [
        /\b4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}\b/g,  // Standard
        /\b8[0-9AB][1-9A-HJ-NP-Za-km-z]{93}\b/g   // Integrated
      ]);

      // Private key patterns
      this.patterns.set('private_key', [
        /\b[KL5][1-9A-HJ-NP-Za-km-z]{51}\b/g,     // Bitcoin WIF
        /\b[59][1-9A-HJ-NP-Za-km-z]{50}\b/g,      // Bitcoin WIF compressed
        /\b[a-fA-F0-9]{64}\b/g                    // Raw hex key
      ]);

      // Seed phrase patterns
      this.patterns.set('seed_phrase', [
        /\b(?:[a-z]+\s+){11}[a-z]+\b/gi,          // 12 words
        /\b(?:[a-z]+\s+){14}[a-z]+\b/gi,          // 15 words
        /\b(?:[a-z]+\s+){17}[a-z]+\b/gi,          // 18 words
        /\b(?:[a-z]+\s+){20}[a-z]+\b/gi,          // 21 words
        /\b(?:[a-z]+\s+){23}[a-z]+\b/gi           // 24 words
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
    
    // Check for known wallet files
    const walletTypes = [
      { name: 'Bitcoin Core', files: ['wallet.dat'], dirs: ['wallets'] },
      { name: 'Electrum', files: ['default_wallet'], extensions: ['.wallet'] },
      { name: 'Exodus', files: ['seed.seco', 'info.seco'] },
      { name: 'MetaMask', files: ['vault'] },
      { name: 'Monero', extensions: ['.wallet', '.keys'] }
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
   * Helper methods
   */
  private getArtifactTypeFromPattern(patternType: string): ArtifactType {
    if (patternType.includes('address')) return ArtifactType.ADDRESS;
    if (patternType.includes('private_key')) return ArtifactType.PRIVATE_KEY;
    if (patternType.includes('seed_phrase')) return ArtifactType.SEED_PHRASE;
    return ArtifactType.ADDRESS; // default
  }

  private getCryptocurrencyFromPattern(patternType: string): CryptocurrencyType {
    if (patternType.includes('bitcoin')) return this.cryptocurrencyTypes.get('bitcoin')!;
    if (patternType.includes('ethereum')) return this.cryptocurrencyTypes.get('ethereum')!;
    if (patternType.includes('monero')) return this.cryptocurrencyTypes.get('monero')!;
    if (patternType.includes('litecoin')) return this.cryptocurrencyTypes.get('litecoin')!;
    return this.cryptocurrencyTypes.get('bitcoin')!; // default
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
