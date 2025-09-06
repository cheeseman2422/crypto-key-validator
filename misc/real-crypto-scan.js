#!/usr/bin/env node

const { CryptoKeyValidatorEngine } = require('./core-engine/dist/index.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🔍 Crypto Key Validator - Real Scanner');

// Simple configuration for CLI usage
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
    fileTypes: ['.dat', '.wallet', '.json', '.txt'],
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

async function scanDirect(input) {
  console.log(`\n📝 Processing direct input: "${input}"\n`);
  
  try {
    const engine = new CryptoKeyValidatorEngine(config);
    await engine.initialize();
    
    const artifacts = await engine.processDirectInput(input);
    
    if (artifacts.length === 0) {
      console.log('❌ No Bitcoin artifacts detected in the input.');
    } else {
      console.log(`✅ Found ${artifacts.length} Bitcoin artifact(s):\n`);
      
      artifacts.forEach((artifact, i) => {
        console.log(`[${i + 1}] ${artifact.subtype}`);
        console.log(`    Type: ${artifact.type}`);
        console.log(`    Status: ${artifact.validationStatus}`);
        console.log(`    Raw: ${artifact.raw.substring(0, 50)}${artifact.raw.length > 50 ? '...' : ''}`);
        console.log('');
      });
    }
    
    await engine.shutdown();
    
  } catch (error) {
    console.error('❌ Scan failed:', error.message);
    process.exit(1);
  }
}

async function scanPath(targetPath) {
  console.log(`\n📁 Scanning directory: ${targetPath}\n`);
  
  try {
    const engine = new CryptoKeyValidatorEngine(config);
    await engine.initialize();
    
    const artifacts = await engine.scanFileSystem(targetPath, {
      includePaths: [],
      excludePaths: ['/tmp', '/proc', '/sys', 'node_modules', '.git'],
      fileTypes: ['.txt', '.json', '.dat', '.wallet', '.key', '.csv', '.log'],
      maxFileSize: 5 * 1024 * 1024, // 5MB
      followSymlinks: false,
      scanCompressed: false,
      deepScan: false,
      pattern: []
    });
    
    if (artifacts.length === 0) {
      console.log('❌ No Bitcoin artifacts found in the scanned directory.');
    } else {
      console.log(`✅ Found ${artifacts.length} Bitcoin artifact(s):\n`);
      
      artifacts.forEach((artifact, i) => {
        console.log(`[${i + 1}] ${artifact.subtype}`);
        console.log(`    Type: ${artifact.type}`);
        console.log(`    Status: ${artifact.validationStatus}`);
        console.log(`    File: ${artifact.source.path}`);
        console.log(`    Raw: ${artifact.raw.substring(0, 50)}${artifact.raw.length > 50 ? '...' : ''}`);
        console.log('');
      });
    }
    
    await engine.shutdown();
    
  } catch (error) {
    console.error('❌ Directory scan failed:', error.message);
    process.exit(1);
  }
}

async function scanQuick() {
  const homeDir = os.homedir();
  const quickPaths = [
    path.join(homeDir, 'Documents'),
    path.join(homeDir, 'Desktop'), 
    path.join(homeDir, 'Downloads')
  ];
  
  console.log('\n📂 Quick scan of common directories:');
  quickPaths.forEach(p => console.log(`  - ${p}`));
  console.log();
  
  let totalArtifacts = 0;
  const engine = new CryptoKeyValidatorEngine(config);
  await engine.initialize();
  
  for (const dirPath of quickPaths) {
    if (!fs.existsSync(dirPath)) {
      console.log(`⚠️  Directory not found: ${dirPath}`);
      continue;
    }
    
    try {
      console.log(`🔍 Scanning: ${dirPath}`);
      const artifacts = await engine.scanFileSystem(dirPath, {
        includePaths: [],
        excludePaths: ['/tmp', '/proc', '/sys', 'node_modules', '.git'],
        fileTypes: ['.txt', '.json', '.dat', '.wallet', '.key', '.csv'],
        maxFileSize: 2 * 1024 * 1024, // 2MB for quick scan
        followSymlinks: false,
        scanCompressed: false,
        deepScan: false,
        pattern: []
      });
      
      if (artifacts.length > 0) {
        console.log(`✅ Found ${artifacts.length} artifact(s) in ${dirPath}`);
        totalArtifacts += artifacts.length;
      }
    } catch (error) {
      console.log(`❌ Error scanning ${dirPath}: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Quick scan summary: ${totalArtifacts} total Bitcoin artifacts found`);
  await engine.shutdown();
}

async function scanFull() {
  console.log('\n🏠 Full home directory scan');
  const homeDir = os.homedir();
  console.log(`🔍 Starting comprehensive scan of: ${homeDir}`);
  console.log('⚠️  This may take several minutes...');
  
  try {
    const engine = new CryptoKeyValidatorEngine(config);
    await engine.initialize();
    
    const artifacts = await engine.scanFileSystem(homeDir, {
      includePaths: [],
      excludePaths: ['/tmp', '/proc', '/sys', 'node_modules', '.git', '.cache', '.npm', '.electron', 'Library/Caches'],
      fileTypes: ['.txt', '.json', '.dat', '.wallet', '.key', '.csv', '.log', '.backup'],
      maxFileSize: 10 * 1024 * 1024, // 10MB for full scan
      followSymlinks: false,
      scanCompressed: false,
      deepScan: true,
      pattern: []
    });
    
    if (artifacts.length === 0) {
      console.log('❌ No Bitcoin artifacts found in home directory.');
    } else {
      console.log(`✅ Full scan completed! Found ${artifacts.length} Bitcoin artifact(s):\n`);
      
      // Group by file for better organization
      const byFile = {};
      artifacts.forEach(artifact => {
        const file = artifact.source.path;
        if (!byFile[file]) byFile[file] = [];
        byFile[file].push(artifact);
      });
      
      Object.entries(byFile).forEach(([filePath, fileArtifacts]) => {
        console.log(`📄 ${filePath}:`);
        fileArtifacts.forEach(artifact => {
          console.log(`  - ${artifact.subtype} (${artifact.type})`);
        });
        console.log('');
      });
    }
    
    await engine.shutdown();
    
  } catch (error) {
    console.error('❌ Full scan failed:', error.message);
    process.exit(1);
  }
}

async function main() {
  const [mode, ...args] = process.argv.slice(2);
  
  switch (mode) {
    case 'direct':
      if (args.length === 0) {
        console.error('❌ Error: No input provided for direct scanning');
        process.exit(1);
      }
      await scanDirect(args.join(' '));
      break;
      
    case 'path':
      if (args.length === 0) {
        console.error('❌ Error: No path provided');
        process.exit(1);
      }
      await scanPath(args[0]);
      break;
      
    case 'full':
      await scanFull();
      break;
      
    default:
      await scanQuick();
      break;
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}
