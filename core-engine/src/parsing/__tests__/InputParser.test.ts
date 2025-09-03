/**
 * Unit tests for InputParser
 */

import InputParser from '../InputParser';
import { ArtifactType } from '../../types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('InputParser', () => {
  let parser: InputParser;

  beforeEach(() => {
    parser = new InputParser();
  });

  describe('Direct Input Parsing', () => {
    it('should detect Bitcoin Legacy P2PKH addresses', () => {
      const input = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
      const artifacts = parser.parseDirectInput(input);

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].type).toBe(ArtifactType.ADDRESS);
      expect(artifacts[0].subtype).toBe('Legacy Address (P2PKH/P2SH)');
      expect(artifacts[0].raw).toBe(input);
    });

    it('should detect Bitcoin P2SH addresses', () => {
      const input = '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy';
      const artifacts = parser.parseDirectInput(input);

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].type).toBe(ArtifactType.ADDRESS);
      expect(artifacts[0].subtype).toBe('Legacy Address (P2PKH/P2SH)');
      expect(artifacts[0].raw).toBe(input);
    });

    it('should detect Bitcoin Bech32 addresses', () => {
      const input = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
      const artifacts = parser.parseDirectInput(input);

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].type).toBe(ArtifactType.ADDRESS);
      expect(artifacts[0].subtype).toBe('Bech32 Address (P2WPKH/P2WSH)');
      expect(artifacts[0].raw).toBe(input);
    });

    it('should detect Bitcoin Taproot addresses', () => {
      const input = 'bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297';
      const artifacts = parser.parseDirectInput(input);

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].type).toBe(ArtifactType.ADDRESS);
      expect(artifacts[0].subtype).toBe('Taproot Address (P2TR)');
      expect(artifacts[0].raw).toBe(input);
    });

    it('should detect WIF private keys', () => {
      const input = '5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ';
      const artifacts = parser.parseDirectInput(input);

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].type).toBe(ArtifactType.PRIVATE_KEY);
      expect(artifacts[0].subtype).toBe('WIF Private Key');
      expect(artifacts[0].raw).toBe(input);
    });

    it('should detect raw hex private keys', () => {
      const input = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      const artifacts = parser.parseDirectInput(input);

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].type).toBe(ArtifactType.PRIVATE_KEY);
      expect(artifacts[0].subtype).toBe('Raw Hex Private Key');
      expect(artifacts[0].raw).toBe(input);
    });

    it('should detect 12-word BIP39 seed phrases', () => {
      const input = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const artifacts = parser.parseDirectInput(input);

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].type).toBe(ArtifactType.SEED_PHRASE);
      expect(artifacts[0].subtype).toBe('BIP39 Seed Phrase (12 words)');
      expect(artifacts[0].raw).toBe(input);
    });

    it('should detect 24-word BIP39 seed phrases', () => {
      const input = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';
      const artifacts = parser.parseDirectInput(input);

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].type).toBe(ArtifactType.SEED_PHRASE);
      expect(artifacts[0].subtype).toBe('BIP39 Seed Phrase (24 words)');
      expect(artifacts[0].raw).toBe(input);
    });

    it('should detect multiple artifacts in multi-line input', () => {
      const input = `1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4
5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ`;
      const artifacts = parser.parseDirectInput(input);

      expect(artifacts).toHaveLength(3);
      expect(artifacts.map(a => a.type)).toEqual([
        ArtifactType.ADDRESS,
        ArtifactType.ADDRESS,
        ArtifactType.PRIVATE_KEY
      ]);
    });

    it('should ignore non-Bitcoin artifacts', () => {
      const input = `random text
not_a_valid_address
0x742d35Cc6634C0532925a3b8D73e7C0D99c65D20
some more text`;
      const artifacts = parser.parseDirectInput(input);

      expect(artifacts).toHaveLength(0);
    });

    it('should handle empty input', () => {
      const artifacts = parser.parseDirectInput('');

      expect(artifacts).toHaveLength(0);
    });

    it('should handle whitespace-only input', () => {
      const artifacts = parser.parseDirectInput('   \n\n\t   ');

      expect(artifacts).toHaveLength(0);
    });
  });

  describe('Filesystem Parsing', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'crypto-validator-test-'));
    });

    afterEach(() => {
      // Clean up temp directory
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should scan files and find Bitcoin artifacts', async () => {
      const testFile = path.join(tempDir, 'test.txt');
      fs.writeFileSync(testFile, `This file contains Bitcoin artifacts:
Legacy address: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
Bech32 address: bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4
Some other text...`);

      const config = {
        includePaths: [],
        excludePaths: [],
        fileTypes: ['.txt'],
        maxFileSize: 1024 * 1024,
        followSymlinks: false,
        scanCompressed: false,
        deepScan: false,
        pattern: []
      };

      const artifacts = await parser.parseFileSystem(tempDir, config);

      expect(artifacts.length).toBeGreaterThan(0);
      expect(artifacts.some(a => a.raw === '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toBe(true);
      expect(artifacts.some(a => a.raw === 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4')).toBe(true);
      
      // Check that artifacts have correct file source
      artifacts.forEach(artifact => {
        expect(artifact.source.path).toBe(testFile);
        expect(artifact.source.type).toBe('file_system');
      });
    });

    it('should respect file type filters', async () => {
      const textFile = path.join(tempDir, 'test.txt');
      const jsonFile = path.join(tempDir, 'test.json');
      
      fs.writeFileSync(textFile, '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
      fs.writeFileSync(jsonFile, '{"address": "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy"}');

      const config = {
        includePaths: [],
        excludePaths: [],
        fileTypes: ['.txt'], // Only scan .txt files
        maxFileSize: 1024 * 1024,
        followSymlinks: false,
        scanCompressed: false,
        deepScan: false,
        pattern: []
      };

      const artifacts = await parser.parseFileSystem(tempDir, config);

      expect(artifacts.length).toBe(1);
      expect(artifacts[0].raw).toBe('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
      expect(artifacts[0].source.path).toBe(textFile);
    });

    it('should respect file size limits', async () => {
      const smallFile = path.join(tempDir, 'small.txt');
      const largeFile = path.join(tempDir, 'large.txt');
      
      fs.writeFileSync(smallFile, '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
      fs.writeFileSync(largeFile, 'x'.repeat(2048) + '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy');

      const config = {
        includePaths: [],
        excludePaths: [],
        fileTypes: ['.txt'],
        maxFileSize: 1024, // 1KB limit
        followSymlinks: false,
        scanCompressed: false,
        deepScan: false,
        pattern: []
      };

      const artifacts = await parser.parseFileSystem(tempDir, config);

      expect(artifacts.length).toBe(1);
      expect(artifacts[0].raw).toBe('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
      expect(artifacts[0].source.path).toBe(smallFile);
    });

    it('should respect excluded paths', async () => {
      const normalFile = path.join(tempDir, 'normal.txt');
      const excludedDir = path.join(tempDir, 'excluded');
      const excludedFile = path.join(excludedDir, 'excluded.txt');
      
      fs.mkdirSync(excludedDir);
      fs.writeFileSync(normalFile, '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
      fs.writeFileSync(excludedFile, '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy');

      const config = {
        includePaths: [],
        excludePaths: ['excluded'],
        fileTypes: ['.txt'],
        maxFileSize: 1024 * 1024,
        followSymlinks: false,
        scanCompressed: false,
        deepScan: false,
        pattern: []
      };

      const artifacts = await parser.parseFileSystem(tempDir, config);

      expect(artifacts.length).toBe(1);
      expect(artifacts[0].raw).toBe('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
      expect(artifacts[0].source.path).toBe(normalFile);
    });

    it('should handle recursive directory scanning', async () => {
      const subDir = path.join(tempDir, 'subdir');
      const deepDir = path.join(subDir, 'deep');
      
      fs.mkdirSync(subDir);
      fs.mkdirSync(deepDir);
      
      const rootFile = path.join(tempDir, 'root.txt');
      const subFile = path.join(subDir, 'sub.txt');
      const deepFile = path.join(deepDir, 'deep.txt');
      
      fs.writeFileSync(rootFile, '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
      fs.writeFileSync(subFile, '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy');
      fs.writeFileSync(deepFile, 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4');

      const config = {
        includePaths: [],
        excludePaths: [],
        fileTypes: ['.txt'],
        maxFileSize: 1024 * 1024,
        followSymlinks: false,
        scanCompressed: false,
        deepScan: false,
        pattern: []
      };

      const artifacts = await parser.parseFileSystem(tempDir, config);

      expect(artifacts.length).toBe(3);
      const paths = artifacts.map(a => a.source.path).sort();
      expect(paths).toEqual([rootFile, subFile, deepFile].sort());
    });

    it('should handle non-existent directory', async () => {
      const nonExistentDir = path.join(tempDir, 'does-not-exist');

      const config = {
        includePaths: [],
        excludePaths: [],
        fileTypes: ['.txt'],
        maxFileSize: 1024 * 1024,
        followSymlinks: false,
        scanCompressed: false,
        deepScan: false,
        pattern: []
      };

      await expect(parser.parseFileSystem(nonExistentDir, config))
        .rejects.toThrow('Path does not exist');
    });

    it('should handle file as input instead of directory', async () => {
      const testFile = path.join(tempDir, 'test.txt');
      fs.writeFileSync(testFile, 'content');

      const config = {
        includePaths: [],
        excludePaths: [],
        fileTypes: ['.txt'],
        maxFileSize: 1024 * 1024,
        followSymlinks: false,
        scanCompressed: false,
        deepScan: false,
        pattern: []
      };

      await expect(parser.parseFileSystem(testFile, config))
        .rejects.toThrow('Path is not a directory');
    });

    it('should filter out duplicate artifacts', async () => {
      const testFile = path.join(tempDir, 'duplicates.txt');
      fs.writeFileSync(testFile, `1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
Some text
1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
More text
1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa`);

      const config = {
        includePaths: [],
        excludePaths: [],
        fileTypes: ['.txt'],
        maxFileSize: 1024 * 1024,
        followSymlinks: false,
        scanCompressed: false,
        deepScan: false,
        pattern: []
      };

      const artifacts = await parser.parseFileSystem(tempDir, config);

      expect(artifacts.length).toBe(1);
      expect(artifacts[0].raw).toBe('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    });
  });

  describe('Pattern Detection Edge Cases', () => {
    it('should handle Bitcoin addresses with surrounding punctuation', () => {
      const input = 'Address: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa, another: 3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy.';
      const artifacts = parser.parseDirectInput(input);

      expect(artifacts).toHaveLength(2);
      expect(artifacts[0].raw).toBe('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
      expect(artifacts[1].raw).toBe('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy');
    });

    it('should detect seed phrases with extra whitespace', () => {
      const input = '  abandon   abandon abandon    abandon abandon abandon abandon abandon abandon abandon abandon about  ';
      const artifacts = parser.parseDirectInput(input);

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].type).toBe(ArtifactType.SEED_PHRASE);
    });

    it('should handle mixed case in hex private keys', () => {
      const input = 'E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855';
      const artifacts = parser.parseDirectInput(input);

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].type).toBe(ArtifactType.PRIVATE_KEY);
      expect(artifacts[0].subtype).toBe('Raw Hex Private Key');
    });
  });
});
