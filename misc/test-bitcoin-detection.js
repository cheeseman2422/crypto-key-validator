const { CryptoKeyValidatorEngine } = require('./core-engine/dist/index.js');

console.log('🔍 Testing Bitcoin Artifact Detection...');

// Simple configuration
const config = {
  security: {
    enableMemoryProtection: false,
    clearClipboardAfter: 30,
    enableAuditLog: false,
    requireAuthentication: false,
    maxIdleTime: 1800,
    enableEncryption: false
  },
  scanning: {
    includePaths: [],
    excludePaths: ['/tmp'],
    fileTypes: ['.dat', '.wallet'],
    maxFileSize: 10 * 1024 * 1024,
    followSymlinks: false,
    scanCompressed: false,
    deepScan: false,
    pattern: []
  },
  reporting: {
    includePrivateKeys: false,
    truncateKeys: true,
    includeBalances: false,
    includeMetadata: true,
    format: 'JSON'
  },
  ui: { theme: 'dark' },
  offline: { blockchainDataPath: '/tmp/blockchain' }
};

// Test cases with real Bitcoin data examples
const testCases = [
  {
    name: 'Bitcoin Legacy Address',
    input: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    expectedType: 'address',
    expectedSubtype: 'Legacy Address (P2PKH/P2SH)'
  },
  {
    name: 'Bitcoin Legacy P2SH Address', 
    input: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
    expectedType: 'address',
    expectedSubtype: 'Legacy Address (P2PKH/P2SH)'
  },
  {
    name: 'Bitcoin Bech32 Address',
    input: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
    expectedType: 'address', 
    expectedSubtype: 'Bech32 Address (P2WPKH/P2WSH)'
  },
  {
    name: 'Bitcoin Taproot Address',
    input: 'bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297',
    expectedType: 'address',
    expectedSubtype: 'Taproot Address (P2TR)'
  },
  {
    name: 'Bitcoin WIF Private Key',
    input: '5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ',
    expectedType: 'private_key',
    expectedSubtype: 'WIF Private Key'
  },
  {
    name: 'Bitcoin Raw Hex Private Key',
    input: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    expectedType: 'private_key',
    expectedSubtype: 'Raw Hex Private Key'
  },
  {
    name: 'Bitcoin 12-word Seed Phrase',
    input: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    expectedType: 'seed_phrase',
    expectedSubtype: 'BIP39 Seed Phrase (12 words)'
  },
  {
    name: 'Multiple artifacts in text',
    input: `1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4
5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ`,
    expectedCount: 3
  }
];

async function testBitcoinDetection() {
  try {
    const engine = new CryptoKeyValidatorEngine(config);
    await engine.initialize();
    
    console.log('\n🧪 Running Bitcoin Detection Tests...\n');
    let passed = 0;
    let total = 0;
    
    for (const testCase of testCases) {
      total++;
      console.log(`Test ${total}: ${testCase.name}`);
      console.log(`Input: "${testCase.input.substring(0, 50)}${testCase.input.length > 50 ? '...' : ''}"`);
      
      try {
        const artifacts = await engine.processDirectInput(testCase.input);
        
        if (testCase.expectedCount) {
          if (artifacts.length === testCase.expectedCount) {
            console.log(`✅ PASS: Found ${artifacts.length} artifacts as expected`);
            passed++;
          } else {
            console.log(`❌ FAIL: Expected ${testCase.expectedCount} artifacts, got ${artifacts.length}`);
          }
        } else if (artifacts.length === 1) {
          const artifact = artifacts[0];
          if (artifact.type === testCase.expectedType && artifact.subtype === testCase.expectedSubtype) {
            console.log(`✅ PASS: Detected as ${artifact.subtype}`);
            passed++;
          } else {
            console.log(`❌ FAIL: Expected ${testCase.expectedSubtype}, got ${artifact.subtype}`);
          }
        } else {
          console.log(`❌ FAIL: Expected 1 artifact, got ${artifacts.length}`);
        }
        
        // Show what was found
        artifacts.forEach((artifact, i) => {
          console.log(`   [${i+1}] Type: ${artifact.type}, Subtype: ${artifact.subtype}`);
        });
        
      } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
      }
      
      console.log('');
    }
    
    console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('🎉 All Bitcoin detection tests PASSED!');
    } else {
      console.log('⚠️  Some tests failed. Check the implementation.');
    }
    
    await engine.shutdown();
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

testBitcoinDetection();
