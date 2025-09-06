import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import * as bs58 from 'bs58';
import * as crypto from 'crypto';

// Import ECPair factory - bitcoinjs-lib v6 requires this pattern
const ECPairFactory = require('ecpair');
const ecc = require('tiny-secp256k1');
const ECPair = ECPairFactory.default(ecc);

// Initialize ECC library for bitcoinjs-lib (required for Taproot)
bitcoin.initEccLib(ecc);

// HDKey import
const HDKey = require('hdkey');

// Define ECPairInterface type
interface ECPairInterface {
  publicKey: Buffer;
  privateKey?: Buffer;
  toWIF(): string;
  sign(hash: Buffer): Buffer;
  verify(hash: Buffer, signature: Buffer): boolean;
}

import {
  Artifact,
  ArtifactType,
  ValidationResult,
  ValidationStatus,
  CryptocurrencyType,
  DerivedAddress,
  ValidationError
} from '../types';

export class CryptoValidator {
  private readonly supportedNetworks: Map<string, any> = new Map();

  constructor() {
    this.initializeNetworks();
  }

  private initializeNetworks() {
    // Bitcoin networks only
    this.supportedNetworks.set('bitcoin', bitcoin.networks.bitcoin);
    this.supportedNetworks.set('bitcoin-testnet', bitcoin.networks.testnet);
    this.supportedNetworks.set('bitcoin-signet', bitcoin.networks.regtest); // Using regtest for signet
    this.supportedNetworks.set('bitcoin-regtest', bitcoin.networks.regtest);
  }

  /**
   * Validate a cryptocurrency artifact
   */
  async validateArtifact(artifact: Artifact): Promise<ValidationResult> {
    try {
      switch (artifact.type) {
        case ArtifactType.PRIVATE_KEY:
          return await this.validatePrivateKey(artifact);
        case ArtifactType.SEED_PHRASE:
          return await this.validateSeedPhrase(artifact);
        case ArtifactType.ADDRESS:
          return await this.validateAddress(artifact);
        default:
          throw new ValidationError(`Unsupported artifact type: ${artifact.type}`, 'UNSUPPORTED_TYPE');
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown validation error'],
        warnings: []
      };
    }
  }

  /**
   * Validate private key formats
   */
  private async validatePrivateKey(artifact: Artifact): Promise<ValidationResult> {
    const { raw, metadata } = artifact;
    const crypto = metadata.cryptocurrency;
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      derivedAddresses: []
    };

    try {
      // Remove whitespace and normalize
      const cleanKey = raw.replace(/\s+/g, '');

      switch (crypto.name.toLowerCase()) {
        case 'bitcoin':
        case 'bitcoin-testnet':
        case 'bitcoin-signet':
        case 'bitcoin-regtest':
          return await this.validateBitcoinPrivateKey(cleanKey, crypto);
        default:
          result.errors.push(`Unsupported cryptocurrency: ${crypto.name}. Only Bitcoin is supported.`);
      }
    } catch (error) {
      result.errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Validate Bitcoin-like private keys (WIF format or hex)
   */
  private async validateBitcoinPrivateKey(key: string, crypto: CryptocurrencyType): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      derivedAddresses: []
    };

    const network = this.supportedNetworks.get(crypto.name.toLowerCase());
    if (!network) {
      result.errors.push(`Network not supported: ${crypto.name}`);
      return result;
    }

    try {
      let keyPair: ECPairInterface;

      // Try WIF format first
      if (key.length >= 51 && key.length <= 52) {
        try {
          keyPair = ECPair.fromWIF(key, network);
          result.checksum = true;
        } catch (wifError) {
          result.errors.push('Invalid WIF format');
          return result;
        }
      }
      // Try hex format
      else if (key.length === 64 && /^[a-fA-F0-9]+$/.test(key)) {
        try {
          const keyBuffer = Buffer.from(key, 'hex');
          keyPair = ECPair.fromPrivateKey(keyBuffer, { network });
          result.warnings.push('Private key in raw hex format (less secure)');
        } catch (hexError) {
          result.errors.push('Invalid hex private key');
          return result;
        }
      } else {
        result.errors.push('Invalid private key format (expected WIF or 64-char hex)');
        return result;
      }

      // Generate addresses
      const addresses = this.generateBitcoinAddresses(keyPair, network);
      result.derivedAddresses = addresses;
      result.isValid = true;

    } catch (error) {
      result.errors.push(`Bitcoin key validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Generate Bitcoin addresses from a key pair
   */
  private generateBitcoinAddresses(keyPair: ECPairInterface, network: any): DerivedAddress[] {
    const addresses: DerivedAddress[] = [];

    try {
      // Convert publicKey to Buffer if it's a Uint8Array
      let pubkey = Buffer.isBuffer(keyPair.publicKey) ? keyPair.publicKey : Buffer.from(keyPair.publicKey);
      
      // Ensure we have a compressed public key for SegWit (P2WPKH requires compressed keys)
      if (pubkey.length === 65) {
        // Convert uncompressed to compressed
        const isEven = (pubkey[64] % 2) === 0;
        pubkey = Buffer.concat([Buffer.from([isEven ? 0x02 : 0x03]), pubkey.slice(1, 33)]);
      }
      
      // P2PKH (Legacy) - can use both compressed and uncompressed
      const p2pkh = bitcoin.payments.p2pkh({ pubkey, network });
      if (p2pkh.address) {
        addresses.push({
          address: p2pkh.address,
          derivationPath: 'direct',
          addressType: 'P2PKH',
          publicKey: pubkey.toString('hex')
        });
      }

      // P2WPKH (SegWit) - requires compressed public key
      if (pubkey.length === 33) {
        const p2wpkh = bitcoin.payments.p2wpkh({ pubkey, network });
        if (p2wpkh.address) {
          addresses.push({
            address: p2wpkh.address,
            derivationPath: 'direct',
            addressType: 'P2WPKH',
            publicKey: pubkey.toString('hex')
          });
        }

        // P2SH-P2WPKH (SegWit wrapped)
        const p2sh = bitcoin.payments.p2sh({
          redeem: bitcoin.payments.p2wpkh({ pubkey, network }),
          network
        });
        if (p2sh.address) {
          addresses.push({
            address: p2sh.address,
            derivationPath: 'direct',
            addressType: 'P2SH-P2WPKH',
            publicKey: pubkey.toString('hex')
          });
        }
      }

      // P2TR (Taproot) - Add support for Taproot addresses
      try {
        // For Taproot, we need to use the internal key (x-only pubkey)
        const internalPubkey = pubkey.slice(1, 33); // Remove the 0x02/0x03 prefix for x-only
        const p2tr = bitcoin.payments.p2tr({ internalPubkey, network });
        if (p2tr.address) {
          addresses.push({
            address: p2tr.address,
            derivationPath: 'direct',
            addressType: 'P2TR',
            publicKey: pubkey.toString('hex')
          });
        }
      } catch (taprootError) {
        // Taproot may not be available in all cases, fail silently
        console.debug('Taproot address generation failed:', taprootError);
      }
      
    } catch (error) {
      console.warn('Address generation failed:', error);
    }

    return addresses;
  }


  /**
   * Validate seed phrases (mnemonic)
   */
  private async validateSeedPhrase(artifact: Artifact): Promise<ValidationResult> {
    const { raw } = artifact;
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      derivedAddresses: []
    };

    try {
      const mnemonic = raw.trim().toLowerCase();
      const words = mnemonic.split(/\s+/);

      // Check word count
      const validWordCounts = [12, 15, 18, 21, 24];
      if (!validWordCounts.includes(words.length)) {
        result.errors.push(`Invalid word count: ${words.length}. Expected: ${validWordCounts.join(', ')}`);
        return result;
      }

      // Validate mnemonic
      if (!bip39.validateMnemonic(mnemonic)) {
        result.errors.push('Invalid BIP39 mnemonic phrase');
        return result;
      }

      // Calculate entropy
      const entropy = bip39.mnemonicToEntropy(mnemonic);
      result.entropy = (entropy.length / 2) * 8; // bits

      // Generate seed
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      
      // Derive some common addresses
      const derivedAddresses = await this.deriveAddressesFromSeed(seed);
      result.derivedAddresses = derivedAddresses;

      result.isValid = true;
      result.checksum = true;

    } catch (error) {
      result.errors.push(`Seed phrase validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Derive addresses from a seed using common derivation paths
   */
  private async deriveAddressesFromSeed(seed: Buffer): Promise<DerivedAddress[]> {
    const addresses: DerivedAddress[] = [];
    
    try {
      const masterKey = HDKey.fromMasterSeed(seed);

      // Bitcoin derivation paths only
      const derivationPaths = [
        "m/44'/0'/0'/0/0",    // Bitcoin Legacy first address (BIP44)
        "m/84'/0'/0'/0/0",    // Bitcoin Native SegWit first address (BIP84)
        "m/49'/0'/0'/0/0"     // Bitcoin SegWit wrapped first address (BIP49)
      ];

      for (const path of derivationPaths) {
        try {
          const derived = masterKey.derive(path);
          const privateKey = derived.privateKey;
          
          // Bitcoin derivation only
          const keyPair = ECPair.fromPrivateKey(privateKey);
          const btcAddresses = this.generateBitcoinAddresses(keyPair, bitcoin.networks.bitcoin);
          addresses.push(...btcAddresses.map(addr => ({ ...addr, derivationPath: path })));
        } catch (derivationError) {
          console.warn(`Derivation failed for path ${path}:`, derivationError);
        }
      }
    } catch (error) {
      console.warn('Seed derivation failed:', error);
    }

    return addresses;
  }

  /**
   * Validate cryptocurrency addresses
   */
  private async validateAddress(artifact: Artifact): Promise<ValidationResult> {
    const { raw, metadata } = artifact;
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      warnings: []
    };

    try {
      const address = raw.trim();
      const crypto = metadata.cryptocurrency;

      switch (crypto.name.toLowerCase()) {
        case 'bitcoin':
        case 'bitcoin-testnet':
        case 'bitcoin-signet':
        case 'bitcoin-regtest':
          const network = this.supportedNetworks.get(crypto.name.toLowerCase()) || bitcoin.networks.bitcoin;
          result.isValid = this.validateBitcoinAddress(address, network);
          break;
        default:
            result.errors.push(`Unsupported cryptocurrency: ${crypto.name}. Only Bitcoin is supported.`);
      }

      if (!result.isValid && result.errors.length === 0) {
        result.errors.push('Invalid address format');
      }

    } catch (error) {
      result.errors.push(`Address validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Validate Bitcoin-like addresses
   */
  private validateBitcoinAddress(address: string, network: any): boolean {
    try {
      bitcoin.address.toOutputScript(address, network);
      return true;
    } catch {
      return false;
    }
  }


  /**
   * Batch validate multiple artifacts
   */
  async validateBatch(artifacts: Artifact[]): Promise<Map<string, ValidationResult>> {
    const results = new Map<string, ValidationResult>();
    
    // Process in batches to avoid overwhelming the system
    const batchSize = 10;
    
    for (let i = 0; i < artifacts.length; i += batchSize) {
      const batch = artifacts.slice(i, i + batchSize);
      const batchPromises = batch.map(async artifact => {
        const result = await this.validateArtifact(artifact);
        return { id: artifact.id, result };
      });
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ id, result }) => {
        results.set(id, result);
      });
    }
    
    return results;
  }
}

export default CryptoValidator;
