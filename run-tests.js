#!/usr/bin/env node

console.log('🧪 CryptoKeyFinder - Comprehensive Test Suite');
console.log('=============================================\n');

const CryptoEngine = require('./app-electron/src/main/cryptoEngine');
const FileScanner = require('./app-electron/src/main/fileScanner');
const fs = require('fs').promises;
const path = require('path');

let testResults = {
    passed: 0,
    failed: 0,
    total: 0
};

function logTest(testName, passed, details = '') {
    testResults.total++;
    if (passed) {
        testResults.passed++;
        console.log(`✅ PASS: ${testName}`);
        if (details) console.log(`   ${details}`);
    } else {
        testResults.failed++;
        console.log(`❌ FAIL: ${testName}`);
        if (details) console.log(`   ERROR: ${details}`);
    }
}

async function testCryptoEngine() {
    console.log('\n🔐 Testing Crypto Engine...');
    console.log('============================');
    
    const cryptoEngine = new CryptoEngine();
    
    // Test 1: Bitcoin WIF validation
    try {
        const testWIF = 'L1SNz6saQzurB2hjryytnZGvbJ9bn1mxfqS17pELqWp43mYA4f2y';
        const result = cryptoEngine.validateBitcoinPrivateKey(testWIF);
        logTest('Bitcoin WIF Validation', result.valid === true, 
            `Generated ${Object.keys(result.addresses || {}).length} address types`);
    } catch (error) {
        logTest('Bitcoin WIF Validation', false, error.message);
    }
    
    // Test 2: Bitcoin address validation
    try {
        const testAddr = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
        const result = cryptoEngine.validateBitcoinAddress(testAddr);
        logTest('Bitcoin Address Validation', result.valid === true && result.addressType === 'P2PKH_LEGACY');
    } catch (error) {
        logTest('Bitcoin Address Validation', false, error.message);
    }
    
    // Test 3: Ethereum address validation
    try {
        const testEthAddr = '0x742d35cc6db6c4335f24c19b5261be20e4cdb1f5';
        const result = cryptoEngine.validateEthereumAddress(testEthAddr);
        logTest('Ethereum Address Validation', result.valid === true);
    } catch (error) {
        logTest('Ethereum Address Validation', false, error.message);
    }
    
    // Test 4: BIP39 seed phrase validation
    try {
        const testSeed = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
        const result = cryptoEngine.validateBIP39Mnemonic(testSeed);
        logTest('BIP39 Seed Validation', result.valid === true && result.wordCount === 12,
            `Generated BTC and ETH addresses: ${!!result.addresses}`);
    } catch (error) {
        logTest('BIP39 Seed Validation', false, error.message);
    }
    
    // Test 5: Auto-detection
    try {
        const testInputs = [
            'L1SNz6saQzurB2hjryytnZGvbJ9bn1mxfqS17pELqWp43mYA4f2y',
            '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
            '0x742d35cc6db6c4335f24c19b5261be20e4cdb1f5',
            'invalid_input_here'
        ];
        
        const results = cryptoEngine.batchValidate(testInputs);
        const validResults = results.filter(r => r.valid).length;
        logTest('Auto-Detection Batch Validation', validResults === 3 && results.length === 4,
            `${validResults}/4 inputs correctly identified and validated`);
    } catch (error) {
        logTest('Auto-Detection Batch Validation', false, error.message);
    }
    
    // Test 6: Invalid input handling
    try {
        const result = cryptoEngine.validateCryptoInput('clearly_not_crypto_data_123');
        logTest('Invalid Input Handling', result.valid === false && result.type === 'UNKNOWN');
    } catch (error) {
        logTest('Invalid Input Handling', false, error.message);
    }
}

async function testFileScanner() {
    console.log('\n🔍 Testing File Scanner...');
    console.log('===========================');
    
    const fileScanner = new FileScanner();
    const testDir = path.join(__dirname, 'test-files');
    
    // Create test directory and files
    try {
        await fs.mkdir(testDir, { recursive: true });
        
        // Create test files with crypto content
        const testFiles = [
            {
                name: 'wallet.dat',
                content: 'Some wallet data with Bitcoin key: L1SNz6saQzurB2hjryytnZGvbJ9bn1mxfqS17pELqWp43mYA4f2y'
            },
            {
                name: 'addresses.txt',
                content: 'Bitcoin addresses: 1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2\nEthereum: 0x742d35cc6db6c4335f24c19b5261be20e4cdb1f5'
            },
            {
                name: 'seed.txt',
                content: 'My seed phrase: abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
            },
            {
                name: 'normal.txt',
                content: 'This is just normal text with no crypto content.'
            }
        ];
        
        for (const file of testFiles) {
            await fs.writeFile(path.join(testDir, file.name), file.content);
        }
        
        logTest('Test File Creation', true, `Created ${testFiles.length} test files`);
    } catch (error) {
        logTest('Test File Creation', false, error.message);
        return;
    }
    
    // Test 1: Directory scanning
    try {
        const results = await fileScanner.scanDirectory(testDir, {
            maxFileSize: 1024 * 1024,
            recursive: true,
            fileTypes: ['txt', 'dat'],
            includeHidden: false
        });
        
        logTest('Directory Scanning', results.length > 0, 
            `Found ${results.length} crypto artifacts in test files`);
    } catch (error) {
        logTest('Directory Scanning', false, error.message);
    }
    
    // Test 2: Pattern recognition
    try {
        const testContent = `
        Bitcoin WIF: L1SNz6saQzurB2hjryytnZGvbJ9bn1mxfqS17pELqWp43mYA4f2y
        Bitcoin Address: 1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2  
        Ethereum Address: 0x742d35cc6db6c4335f24c19b5261be20e4cdb1f5
        Seed: abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
        Invalid: this_is_not_crypto_data
        `;
        
        await fs.writeFile(path.join(testDir, 'pattern-test.txt'), testContent);
        const results = await fileScanner.scanFile(path.join(testDir, 'pattern-test.txt'), {
            maxFileSize: 1024 * 1024,
            fileTypes: ['txt']
        });
        
        const patternTypes = [...new Set(results.map(r => r.type))];
        logTest('Pattern Recognition', patternTypes.length >= 3,
            `Detected ${patternTypes.length} different crypto pattern types`);
    } catch (error) {
        logTest('Pattern Recognition', false, error.message);
    }
    
    // Test 3: Confidence scoring
    try {
        const walletFile = path.join(testDir, 'bitcoin-wallet.dat');
        await fs.writeFile(walletFile, 'Bitcoin private key: L1SNz6saQzurB2hjryytnZGvbJ9bn1mxfqS17pELqWp43mYA4f2y');
        
        const results = await fileScanner.scanFile(walletFile, {
            maxFileSize: 1024 * 1024,
            fileTypes: ['dat']
        });
        
        const hasHighConfidence = results.some(r => r.confidence > 80);
        logTest('Confidence Scoring', hasHighConfidence,
            `Max confidence: ${Math.max(...results.map(r => r.confidence))}%`);
    } catch (error) {
        logTest('Confidence Scoring', false, error.message);
    }
    
    // Test 4: Quick wallet scan
    try {
        const quickResults = await fileScanner.quickWalletScan(testDir);
        logTest('Quick Wallet Scan', quickResults.results.length > 0,
            `Found ${quickResults.results.length} wallet-related artifacts`);
    } catch (error) {
        logTest('Quick Wallet Scan', false, error.message);
    }
    
    // Cleanup test files
    try {
        await fs.rmdir(testDir, { recursive: true });
        logTest('Test Cleanup', true, 'Removed test files');
    } catch (error) {
        logTest('Test Cleanup', false, error.message);
    }
}

async function testElectronApp() {
    console.log('\n⚡ Testing Electron App Structure...');
    console.log('====================================');
    
    // Test 1: Required files exist
    const requiredFiles = [
        'app-electron/main.js',
        'app-electron/package.json',
        'app-electron/src/renderer/index.html',
        'app-electron/src/preload/preload.js',
        'app-electron/src/main/cryptoEngine.js',
        'app-electron/src/main/fileScanner.js'
    ];
    
    for (const file of requiredFiles) {
        try {
            await fs.access(path.join(__dirname, file));
            logTest(`File exists: ${file}`, true);
        } catch (error) {
            logTest(`File exists: ${file}`, false, 'File not found');
        }
    }
    
    // Test 2: Package.json dependencies
    try {
        const packagePath = path.join(__dirname, 'app-electron/package.json');
        const packageData = JSON.parse(await fs.readFile(packagePath, 'utf8'));
        
        const requiredDeps = ['electron', 'bitcoinjs-lib', 'ethers', 'bip39', 'bip32', 'ecpair'];
        const hasDeps = requiredDeps.every(dep => packageData.dependencies[dep]);
        
        logTest('Package Dependencies', hasDeps,
            `${Object.keys(packageData.dependencies).length} dependencies installed`);
    } catch (error) {
        logTest('Package Dependencies', false, error.message);
    }
    
    // Test 3: HTML structure
    try {
        const htmlPath = path.join(__dirname, 'app-electron/src/renderer/index.html');
        const htmlContent = await fs.readFile(htmlPath, 'utf8');
        
        const hasButtons = [
            'startFileScan',
            'selectCustomPath', 
            'quickScan',
            'validateUserInput',
            'demoValidation'
        ].every(fn => htmlContent.includes(fn));
        
        logTest('HTML UI Structure', hasButtons, 'All required buttons and functions present');
    } catch (error) {
        logTest('HTML UI Structure', false, error.message);
    }
}

async function testLaunchScripts() {
    console.log('\n🚀 Testing Launch Scripts...');
    console.log('=============================');
    
    // Test launch scripts exist and are executable
    const scripts = ['run.sh', 'launch-cryptokeyfinder.sh'];
    
    for (const script of scripts) {
        try {
            const scriptPath = path.join(__dirname, script);
            const stats = await fs.stat(scriptPath);
            const isExecutable = (stats.mode & parseInt('111', 8)) !== 0;
            
            logTest(`Launch Script: ${script}`, isExecutable, 
                isExecutable ? 'Executable' : 'Not executable');
        } catch (error) {
            logTest(`Launch Script: ${script}`, false, 'File not found');
        }
    }
}

async function runAllTests() {
    console.log('Starting comprehensive test suite...\n');
    
    await testCryptoEngine();
    await testFileScanner();
    await testElectronApp();
    await testLaunchScripts();
    
    console.log('\n' + '='.repeat(50));
    console.log('🧪 TEST SUMMARY:');
    console.log('='.repeat(50));
    console.log(`✅ PASSED: ${testResults.passed}/${testResults.total}`);
    console.log(`❌ FAILED: ${testResults.failed}/${testResults.total}`);
    console.log(`📊 SUCCESS RATE: ${((testResults.passed/testResults.total)*100).toFixed(1)}%`);
    
    if (testResults.failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! Application is solid and ready for use.');
    } else {
        console.log(`\n⚠️  ${testResults.failed} tests failed. Review errors above.`);
    }
    
    console.log('\n🚀 To run the application: ./run.sh');
}

// Run the test suite
runAllTests().catch(console.error);
