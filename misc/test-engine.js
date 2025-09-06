const { CryptoKeyValidatorEngine } = require('./core-engine/dist/index.js');

console.log('🚀 Testing Crypto Key Validator Engine...');

// Simple configuration
const config = {
  security: {
    enableMemoryProtection: true,
    clearClipboardAfter: 30,
    enableAuditLog: false,
    requireAuthentication: false,
    maxIdleTime: 1800,
    enableEncryption: true
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
  ui: {
    theme: 'dark'
  },
  offline: {
    blockchainDataPath: '/tmp/blockchain'
  }
};

async function testEngine() {
  try {
    console.log('Creating engine...');
    const engine = new CryptoKeyValidatorEngine(config);
    
    console.log('Initializing engine...');
    await engine.initialize();
    
    console.log('Testing direct input...');
    const artifacts = await engine.processDirectInput('test input');
    
    console.log('Getting statistics...');
    const stats = engine.getStatistics();
    
    console.log('✅ Engine test successful!');
    console.log('Statistics:', JSON.stringify(stats, null, 2));
    
    console.log('Shutting down...');
    await engine.shutdown();
    
    console.log('🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testEngine();
