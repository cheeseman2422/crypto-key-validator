#!/usr/bin/env node

const { CryptoKeyValidatorEngine } = require('./core-engine/dist/index.js');

console.log('🚀 Crypto Key Validator - Demo Suite\n');

// Configuration for demo
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
    excludePaths: [],
    fileTypes: ['.dat', '.wallet', '.json'],
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

// Demo Bitcoin artifacts
const demoArtifacts = [
  {
    name: 'Bitcoin Legacy Address (P2PKH)',
    input: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    description: 'Genesis block coinbase address'
  },
  {
    name: 'Bitcoin P2SH Address',
    input: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
    description: 'Pay-to-Script-Hash address'
  },
  {
    name: 'Bitcoin Bech32 Address (SegWit)',
    input: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
    description: 'Native SegWit address'
  },
  {
    name: 'Bitcoin Taproot Address (P2TR)',
    input: 'bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297',
    description: 'Taproot address'
  },
  {
    name: 'Bitcoin WIF Private Key',
    input: '5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ',
    description: 'Wallet Import Format private key'
  },
  {
    name: 'Bitcoin Raw Hex Private Key',
    input: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    description: '64-character hex private key'
  },
  {
    name: 'Bitcoin BIP39 Seed Phrase',
    input: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    description: '12-word mnemonic seed phrase'
  }
];

async function runDemo() {
  console.log('🎯 Demonstrating Bitcoin-only cryptocurrency validation:\n');

  try {
    const engine = new CryptoKeyValidatorEngine(config);
    await engine.initialize();
    
    console.log('✅ Engine initialized successfully\n');
    
    let totalProcessed = 0;
    let totalValid = 0;
    
    for (const demo of demoArtifacts) {
      console.log(`🔍 ${demo.name}`);
      console.log(`📝 ${demo.description}`);
      console.log(`💼 Input: ${demo.input.substring(0, 60)}${demo.input.length > 60 ? '...' : ''}`);
      
      try {
        const artifacts = await engine.processDirectInput(demo.input);
        totalProcessed++;
        
        if (artifacts.length > 0) {
          const artifact = artifacts[0];
          console.log(`✅ Detected: ${artifact.subtype}`);
          console.log(`🔗 Type: ${artifact.type}`);
          console.log(`📊 Status: ${artifact.validationStatus}`);
          
          if (artifact.validationStatus === 'valid') {
            totalValid++;
          }
        } else {
          console.log('❌ Not detected');
        }
        
      } catch (error) {
        console.log(`⚠️  Processing error: ${error.message}`);
      }
      
      console.log(''); // Empty line
    }
    
    console.log('📈 Demo Summary:');
    console.log(`   Processed: ${totalProcessed}/${demoArtifacts.length} artifacts`);
    console.log(`   Valid: ${totalValid} artifacts`);
    console.log(`   Success Rate: ${((totalValid / totalProcessed) * 100).toFixed(1)}%`);
    
    const stats = engine.getStatistics();
    console.log('\\n📊 Engine Statistics:');
    console.log(`   Total Artifacts: ${stats.totalArtifacts}`);
    console.log(`   Valid Artifacts: ${stats.validArtifacts}`);
    console.log(`   Balance Info: ${stats.totalBalance}`);
    
    await engine.shutdown();
    console.log('\\n🎉 Demo completed successfully!');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runDemo().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}
