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
    
    // Bitcoin Bech32 addresses (P2WPKH/P2WSH) - starts with bc1q or bc1
    if (/^bc1q[a-z0-9]{38}$/.test(text) || /^bc1[a-z0-9]{59}$/.test(text)) {
      return this.createArtifact(ArtifactType.ADDRESS, text, 'Bech32 Address (P2WPKH/P2WSH)');
    }
    
    // Bitcoin Taproot addresses (P2TR) - starts with bc1p
    if (/^bc1p[a-z0-9]{58}$/.test(text)) {
      return this.createArtifact(ArtifactType.ADDRESS, text, 'Taproot Address (P2TR)');
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
   * Parse filesystem for cryptocurrency artifacts - minimal implementation
   */
  async parseFileSystem(rootPath: string, config: ScanConfiguration): Promise<Artifact[]> {
    const artifacts: Artifact[] = [];
    // TODO: Add filesystem scanning logic
    return artifacts;
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
