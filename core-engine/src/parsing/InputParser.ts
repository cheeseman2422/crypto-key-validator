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

export default class InputParser {
  private readonly bitcoinType: CryptocurrencyType = {
    name: 'Bitcoin',
    symbol: 'BTC',
    network: 'mainnet',
    coinType: 0
  };

  /**
   * Parse direct input (pasted text) - Bitcoin artifact detection
   */
  parseDirectInput(input: string): Artifact[] {
    const artifacts: Artifact[] = [];
    const lines = input.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (const line of lines) {
      // Check each line for Bitcoin artifacts
      const artifact = this.detectBitcoinArtifact(line);
      if (artifact) {
        artifacts.push(artifact);
      }
    }
    
    return artifacts;
  }
  
  /**
   * Detect Bitcoin artifacts in a single line of text
   */
  private detectBitcoinArtifact(text: string): Artifact | null {
    // Bitcoin Legacy addresses (P2PKH/P2SH) - starts with 1 or 3
    if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(text)) {
      return this.createArtifact(ArtifactType.ADDRESS, text, 'Legacy Address (P2PKH/P2SH)');
    }
    
    // Bitcoin Taproot addresses (P2TR) - starts with bc1p (check first)
    if (/^bc1p[a-z0-9]{58}$/.test(text)) {
      return this.createArtifact(ArtifactType.ADDRESS, text, 'Taproot Address (P2TR)');
    }
    
    // Bitcoin Bech32 addresses (P2WPKH/P2WSH) - starts with bc1q
    if (/^bc1q[a-z0-9]{38}$/.test(text) || /^bc1[a-z0-9]{59}$/.test(text)) {
      return this.createArtifact(ArtifactType.ADDRESS, text, 'Bech32 Address (P2WPKH/P2WSH)');
    }
    
    // Bitcoin WIF private keys - starts with 5, K, or L
    if (/^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/.test(text)) {
      return this.createArtifact(ArtifactType.PRIVATE_KEY, text, 'WIF Private Key');
    }
    
    // Bitcoin raw hex private keys - 64 hex characters
    if (/^[a-fA-F0-9]{64}$/.test(text)) {
      return this.createArtifact(ArtifactType.PRIVATE_KEY, text, 'Raw Hex Private Key');
    }
    
    // Bitcoin seed phrases - 12, 15, 18, 21, or 24 words
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    if ([12, 15, 18, 21, 24].includes(words.length)) {
      // Basic check - all words should be lowercase letters only
      if (words.every(word => /^[a-z]+$/.test(word))) {
        return this.createArtifact(ArtifactType.SEED_PHRASE, text, `BIP39 Seed Phrase (${words.length} words)`);
      }
    }
    
    return null;
  }

  /**
   * Parse filesystem for cryptocurrency artifacts
   */
  async parseFileSystem(rootPath: string, config: ScanConfiguration): Promise<Artifact[]> {
    const artifacts: Artifact[] = [];
    
    if (!fs.existsSync(rootPath)) {
      throw new Error(`Path does not exist: ${rootPath}`);
    }
    
    const stats = fs.statSync(rootPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${rootPath}`);
    }
    
    console.log(`🔍 Starting filesystem scan of: ${rootPath}`);
    
    try {
      await this.scanDirectory(rootPath, config, artifacts, 0);
    } catch (error) {
      console.error(`Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
    
    console.log(`✅ Filesystem scan completed. Found ${artifacts.length} artifacts.`);
    return artifacts;
  }
  
  /**
   * Recursively scan a directory for Bitcoin artifacts
   */
  private async scanDirectory(
    dirPath: string, 
    config: ScanConfiguration, 
    artifacts: Artifact[], 
    depth: number
  ): Promise<void> {
    const maxDepth = 10; // Prevent infinite recursion
    if (depth > maxDepth) {
      return;
    }
    
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        // Skip excluded paths
        if (config.excludePaths.some(excludePath => fullPath.includes(excludePath))) {
          continue;
        }
        
        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          await this.scanDirectory(fullPath, config, artifacts, depth + 1);
        } else if (entry.isFile()) {
          // Process files
          await this.scanFile(fullPath, config, artifacts);
        }
      }
    } catch (error) {
      // Continue scanning even if a directory can't be accessed
      console.warn(`Cannot scan directory ${dirPath}:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  /**
   * Scan an individual file for Bitcoin artifacts
   */
  private async scanFile(
    filePath: string, 
    config: ScanConfiguration, 
    artifacts: Artifact[]
  ): Promise<void> {
    try {
      const stats = fs.statSync(filePath);
      
      // Skip files that are too large
      if (stats.size > config.maxFileSize) {
        return;
      }
      
      // Check if file type should be scanned
      const ext = path.extname(filePath).toLowerCase();
      if (config.fileTypes.length > 0 && !config.fileTypes.includes(ext)) {
        return;
      }
      
      // Read file content
      const content = await this.readFileContent(filePath, stats.size);
      if (!content) {
        return;
      }
      
      // Search for Bitcoin artifacts in the content
      const foundArtifacts = this.findArtifactsInText(content, filePath);
      artifacts.push(...foundArtifacts);
      
      if (foundArtifacts.length > 0) {
        console.log(`📄 Found ${foundArtifacts.length} artifact(s) in: ${filePath}`);
      }
      
    } catch (error) {
      // Continue scanning even if a file can't be processed
      console.warn(`Cannot scan file ${filePath}:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  /**
   * Safely read file content with encoding detection
   */
  private async readFileContent(filePath: string, fileSize: number): Promise<string | null> {
    try {
      // Read file as buffer first
      const buffer = fs.readFileSync(filePath);
      
      // Limit reading to prevent memory issues
      const maxReadSize = Math.min(buffer.length, 1024 * 1024); // 1MB max
      const limitedBuffer = buffer.subarray(0, maxReadSize);
      
      // Try to decode as UTF-8, fall back to binary search
      try {
        return limitedBuffer.toString('utf8');
      } catch {
        // For binary files, convert to hex and search for patterns
        return limitedBuffer.toString('hex');
      }
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Find Bitcoin artifacts in text content
   */
  private findArtifactsInText(content: string, sourcePath: string): Artifact[] {
    const artifacts: Artifact[] = [];
    const lines = content.split(/[\r\n]+/);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length === 0) continue;
      
      // Check for Bitcoin artifacts in each line
      const words = line.split(/\s+/);
      
      for (const word of words) {
        const cleanWord = word.replace(/[^a-zA-Z0-9]/g, ''); // Remove punctuation
        if (cleanWord.length < 10) continue; // Skip very short strings
        
        const artifact = this.detectBitcoinArtifact(cleanWord);
        if (artifact) {
          // Update the artifact to show file source
          artifact.source = {
            type: SourceType.FILE_SYSTEM,
            path: sourcePath,
            size: fs.statSync(sourcePath).size
          };
          artifact.metadata.tags.push('file_scan', `line_${i + 1}`);
          artifacts.push(artifact);
        }
      }
      
      // Also check the entire line for multi-word seed phrases
      if (line.split(' ').length >= 12) {
        const artifact = this.detectBitcoinArtifact(line);
        if (artifact && artifact.type === ArtifactType.SEED_PHRASE) {
          artifact.source = {
            type: SourceType.FILE_SYSTEM,
            path: sourcePath,
            size: fs.statSync(sourcePath).size
          };
          artifact.metadata.tags.push('file_scan', `line_${i + 1}`);
          artifacts.push(artifact);
        }
      }
    }
    
    // Remove duplicates based on raw content
    const uniqueArtifacts = artifacts.filter((artifact, index, arr) => 
      arr.findIndex(a => a.raw === artifact.raw) === index
    );
    
    return uniqueArtifacts;
  }

  /**
   * Create a Bitcoin artifact
   */
  private createArtifact(type: ArtifactType, raw: string, subtype: string): Artifact {
    return {
      id: crypto.randomUUID(),
      type,
      subtype,
      raw,
      source: {
        type: SourceType.DIRECT_INPUT,
        path: 'direct_input'
      },
      metadata: {
        cryptocurrency: this.bitcoinType,
        confidence: 0.8,
        tags: ['bitcoin', 'found']
      },
      validationStatus: ValidationStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}
