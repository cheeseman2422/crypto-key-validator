/**
 * Unit tests for CryptoValidator
 */

import CryptoValidator from '../CryptoValidator';
import { 
  Artifact, 
  ArtifactType, 
  SourceType, 
  ValidationStatus,
  CryptocurrencyType 
} from '../../types';
import * as crypto from 'crypto';

describe('CryptoValidator', () => {
  let validator: CryptoValidator;
  const bitcoinType: CryptocurrencyType = {
    name: 'Bitcoin',
    symbol: 'BTC',
    network: 'mainnet',
    coinType: 0
  };

  beforeEach(() => {
    validator = new CryptoValidator();
  });

  describe('Bitcoin Address Validation', () => {
    it('should validate P2PKH (Legacy) addresses', async () => {
      const artifact: Artifact = {
        id: crypto.randomUUID(),
        type: ArtifactType.ADDRESS,
        subtype: 'Legacy Address (P2PKH/P2SH)',
        raw: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        source: { type: SourceType.DIRECT_INPUT, path: 'test' },
        metadata: { cryptocurrency: bitcoinType, confidence: 0.9, tags: [] },
        validationStatus: ValidationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await validator.validateArtifact(artifact);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate P2SH addresses', async () => {
      const artifact: Artifact = {
        id: crypto.randomUUID(),
        type: ArtifactType.ADDRESS,
        subtype: 'Legacy Address (P2PKH/P2SH)',
        raw: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
        source: { type: SourceType.DIRECT_INPUT, path: 'test' },
        metadata: { cryptocurrency: bitcoinType, confidence: 0.9, tags: [] },
        validationStatus: ValidationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await validator.validateArtifact(artifact);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate Bech32 SegWit addresses', async () => {
      const artifact: Artifact = {
        id: crypto.randomUUID(),
        type: ArtifactType.ADDRESS,
        subtype: 'Bech32 Address (P2WPKH/P2WSH)',
        raw: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
        source: { type: SourceType.DIRECT_INPUT, path: 'test' },
        metadata: { cryptocurrency: bitcoinType, confidence: 0.9, tags: [] },
        validationStatus: ValidationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await validator.validateArtifact(artifact);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate Taproot addresses', async () => {
      const artifact: Artifact = {
        id: crypto.randomUUID(),
        type: ArtifactType.ADDRESS,
        subtype: 'Taproot Address (P2TR)',
        raw: 'bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297',
        source: { type: SourceType.DIRECT_INPUT, path: 'test' },
        metadata: { cryptocurrency: bitcoinType, confidence: 0.9, tags: [] },
        validationStatus: ValidationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await validator.validateArtifact(artifact);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid Bitcoin addresses', async () => {
      const invalidAddresses = [
        'invalid_address',
        '1234567890',
        'bc1invalid',
        '3invalidaddress',
        ''
      ];

      for (const invalidAddress of invalidAddresses) {
        const artifact: Artifact = {
          id: crypto.randomUUID(),
          type: ArtifactType.ADDRESS,
          subtype: 'Legacy Address (P2PKH/P2SH)',
          raw: invalidAddress,
          source: { type: SourceType.DIRECT_INPUT, path: 'test' },
          metadata: { cryptocurrency: bitcoinType, confidence: 0.9, tags: [] },
          validationStatus: ValidationStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await validator.validateArtifact(artifact);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Bitcoin Private Key Validation', () => {
    it('should validate WIF private keys', async () => {
      const artifact: Artifact = {
        id: crypto.randomUUID(),
        type: ArtifactType.PRIVATE_KEY,
        subtype: 'WIF Private Key',
        raw: '5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ',
        source: { type: SourceType.DIRECT_INPUT, path: 'test' },
        metadata: { cryptocurrency: bitcoinType, confidence: 0.9, tags: [] },
        validationStatus: ValidationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await validator.validateArtifact(artifact);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.derivedAddresses).toBeDefined();
      expect(result.derivedAddresses!.length).toBeGreaterThan(0);
    });

    it('should validate hex private keys', async () => {
      const artifact: Artifact = {
        id: crypto.randomUUID(),
        type: ArtifactType.PRIVATE_KEY,
        subtype: 'Raw Hex Private Key',
        raw: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        source: { type: SourceType.DIRECT_INPUT, path: 'test' },
        metadata: { cryptocurrency: bitcoinType, confidence: 0.9, tags: [] },
        validationStatus: ValidationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await validator.validateArtifact(artifact);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.derivedAddresses).toBeDefined();
      expect(result.derivedAddresses!.length).toBeGreaterThan(0);
    });

    it('should reject invalid private keys', async () => {
      const invalidKeys = [
        'invalid_key',
        '123', // Too short
        'not_hex_or_wif',
        'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364142', // Invalid range
        ''
      ];

      for (const invalidKey of invalidKeys) {
        const artifact: Artifact = {
          id: crypto.randomUUID(),
          type: ArtifactType.PRIVATE_KEY,
          subtype: 'WIF Private Key',
          raw: invalidKey,
          source: { type: SourceType.DIRECT_INPUT, path: 'test' },
          metadata: { cryptocurrency: bitcoinType, confidence: 0.9, tags: [] },
          validationStatus: ValidationStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await validator.validateArtifact(artifact);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Bitcoin Seed Phrase Validation', () => {
    it('should validate 12-word BIP39 seed phrases', async () => {
      const artifact: Artifact = {
        id: crypto.randomUUID(),
        type: ArtifactType.SEED_PHRASE,
        subtype: 'BIP39 Seed Phrase (12 words)',
        raw: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        source: { type: SourceType.DIRECT_INPUT, path: 'test' },
        metadata: { cryptocurrency: bitcoinType, confidence: 0.9, tags: [] },
        validationStatus: ValidationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await validator.validateArtifact(artifact);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.entropy).toBe(128); // 12 words = 128 bits
      expect(result.derivedAddresses).toBeDefined();
      expect(result.derivedAddresses!.length).toBeGreaterThan(0);
    });

    it('should validate 24-word BIP39 seed phrases', async () => {
      const artifact: Artifact = {
        id: crypto.randomUUID(),
        type: ArtifactType.SEED_PHRASE,
        subtype: 'BIP39 Seed Phrase (24 words)',
        raw: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art',
        source: { type: SourceType.DIRECT_INPUT, path: 'test' },
        metadata: { cryptocurrency: bitcoinType, confidence: 0.9, tags: [] },
        validationStatus: ValidationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await validator.validateArtifact(artifact);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.entropy).toBe(256); // 24 words = 256 bits
    });

    it('should reject invalid seed phrases', async () => {
      const invalidSeeds = [
        'invalid word count here only',
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon invalid',
        'not valid bip39 words here at all',
        ''
      ];

      for (const invalidSeed of invalidSeeds) {
        const artifact: Artifact = {
          id: crypto.randomUUID(),
          type: ArtifactType.SEED_PHRASE,
          subtype: 'BIP39 Seed Phrase (12 words)',
          raw: invalidSeed,
          source: { type: SourceType.DIRECT_INPUT, path: 'test' },
          metadata: { cryptocurrency: bitcoinType, confidence: 0.9, tags: [] },
          validationStatus: ValidationStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await validator.validateArtifact(artifact);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Batch Validation', () => {
    it('should validate multiple artifacts in batch', async () => {
      const artifacts: Artifact[] = [
        {
          id: crypto.randomUUID(),
          type: ArtifactType.ADDRESS,
          subtype: 'Legacy Address (P2PKH/P2SH)',
          raw: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
          source: { type: SourceType.DIRECT_INPUT, path: 'test' },
          metadata: { cryptocurrency: bitcoinType, confidence: 0.9, tags: [] },
          validationStatus: ValidationStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: crypto.randomUUID(),
          type: ArtifactType.PRIVATE_KEY,
          subtype: 'WIF Private Key',
          raw: '5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ',
          source: { type: SourceType.DIRECT_INPUT, path: 'test' },
          metadata: { cryptocurrency: bitcoinType, confidence: 0.9, tags: [] },
          validationStatus: ValidationStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const results = await validator.validateBatch(artifacts);

      expect(results.size).toBe(2);
      for (const [id, result] of results) {
        expect(artifacts.some(a => a.id === id)).toBe(true);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    it('should handle mixed valid and invalid artifacts', async () => {
      const artifacts: Artifact[] = [
        {
          id: 'valid',
          type: ArtifactType.ADDRESS,
          subtype: 'Legacy Address (P2PKH/P2SH)',
          raw: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
          source: { type: SourceType.DIRECT_INPUT, path: 'test' },
          metadata: { cryptocurrency: bitcoinType, confidence: 0.9, tags: [] },
          validationStatus: ValidationStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'invalid',
          type: ArtifactType.ADDRESS,
          subtype: 'Legacy Address (P2PKH/P2SH)',
          raw: 'invalid_address',
          source: { type: SourceType.DIRECT_INPUT, path: 'test' },
          metadata: { cryptocurrency: bitcoinType, confidence: 0.9, tags: [] },
          validationStatus: ValidationStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const results = await validator.validateBatch(artifacts);

      expect(results.size).toBe(2);
      expect(results.get('valid')!.isValid).toBe(true);
      expect(results.get('invalid')!.isValid).toBe(false);
    });
  });

  describe('Non-Bitcoin Cryptocurrency Support', () => {
    it('should reject non-Bitcoin cryptocurrencies', async () => {
      const ethereumType: CryptocurrencyType = {
        name: 'Ethereum',
        symbol: 'ETH',
        network: 'mainnet',
        coinType: 60
      };

      const artifact: Artifact = {
        id: crypto.randomUUID(),
        type: ArtifactType.ADDRESS,
        subtype: 'Ethereum Address',
        raw: '0x742d35Cc6634C0532925a3b8D73e7C0D99c65D20',
        source: { type: SourceType.DIRECT_INPUT, path: 'test' },
        metadata: { cryptocurrency: ethereumType, confidence: 0.9, tags: [] },
        validationStatus: ValidationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await validator.validateArtifact(artifact);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unsupported cryptocurrency: Ethereum. Only Bitcoin is supported.');
    });
  });
});
