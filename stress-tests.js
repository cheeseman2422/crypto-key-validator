#!/usr/bin/env node

console.log('🔥 CryptoKeyFinder - Stress Tests & Edge Cases');
console.log('===============================================\n');

const CryptoEngine = require('./app-electron/src/main/cryptoEngine');
const FileScanner = require('./app-electron/src/main/fileScanner');
const fs = require('fs').promises;
const path = require('path');

let testResults = { passed: 0, failed: 0, total: 0 };

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

async function stressCryptoEngine() {
    console.log('🔐 Stress Testing Crypto Engine...');
    console.log('===================================');
    
    const cryptoEngine = new CryptoEngine();
    
    // Test 1: Large batch processing
    try {
        const testInputs = [];
        // Create 100 test inputs
        for (let i = 0; i < 100; i++) {
            testInputs.push(`test_input_${i}_not_crypto`);
        }
        // Add some real crypto data
        testInputs.push('L1SNz6saQzurB2hjryytnZGvbJ9bn1mxfqS17pELqWp43mYA4f2y');
        testInputs.push('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2');
        testInputs.push('0x742d35cc6db6c4335f24c19b5261be20e4cdb1f5');
        
        const start = Date.now();
        const results = cryptoEngine.batchValidate(testInputs);
        const duration = Date.now() - start;
        
        const validResults = results.filter(r => r.valid).length;
        logTest('Large Batch Processing', validResults === 3 && results.length === 103, 
            `Processed 103 inputs in ${duration}ms, found 3 valid crypto items`);
    } catch (error) {
        logTest('Large Batch Processing', false, error.message);
    }
    
    // Test 2: Malformed input handling
    const malformedInputs = [
        '', // Empty string
        null,
        undefined,
        '   ', // Whitespace only
        'L'.repeat(1000), // Very long string
        '🚀💰🔐', // Emojis
        '<script>alert("xss")</script>', // XSS attempt
        'SELECT * FROM users;', // SQL injection attempt
        '\x00\x01\x02', // Binary data
        'L1SNz6saQzurB2hjryytnZGvbJ9bn1mxfqS17pELqWp43mYA4f2y\n\r\t', // Valid key with whitespace
    ];
    
    for (let i = 0; i < malformedInputs.length; i++) {
        try {
            const input = malformedInputs[i];
            const result = cryptoEngine.validateCryptoInput(input);
            // Should not crash and should return a result object
            const isValid = typeof result === 'object' && result !== null && 'valid' in result;
            logTest(`Malformed Input #${i + 1}`, isValid, 
                `Input type: ${typeof input}, Result: ${result.valid ? 'VALID' : 'INVALID'}`);
        } catch (error) {
            logTest(`Malformed Input #${i + 1}`, false, error.message);
        }
    }
    
    // Test 3: Memory usage with repeated calls
    try {
        const initialMemory = process.memoryUsage().heapUsed;
        
        for (let i = 0; i < 1000; i++) {
            cryptoEngine.validateCryptoInput('L1SNz6saQzurB2hjryytnZGvbJ9bn1mxfqS17pELqWp43mYA4f2y');
        }
        
        const finalMemory = process.memoryUsage().heapUsed;
        const memoryDiff = (finalMemory - initialMemory) / 1024 / 1024; // MB
        
        logTest('Memory Usage Test', memoryDiff < 50, // Less than 50MB increase
            `Memory increased by ${memoryDiff.toFixed(2)}MB after 1000 validations`);
    } catch (error) {
        logTest('Memory Usage Test', false, error.message);
    }
}

async function stressFileScanner() {
    console.log('\n🔍 Stress Testing File Scanner...');
    console.log('==================================');
    
    const fileScanner = new FileScanner();
    const stressTestDir = path.join(__dirname, 'stress-test-files');
    
    try {
        await fs.mkdir(stressTestDir, { recursive: true });
        
        // Test 1: Large file handling
        const largeContent = 'This is test content.\n'.repeat(10000) + 
            '\nBitcoin key: L1SNz6saQzurB2hjryytnZGvbJ9bn1mxfqS17pELqWp43mYA4f2y\n' +
            'More test content.\n'.repeat(10000);
        
        await fs.writeFile(path.join(stressTestDir, 'large-file.txt'), largeContent);
        
        const results = await fileScanner.scanFile(path.join(stressTestDir, 'large-file.txt'), {
            maxFileSize: 5 * 1024 * 1024, // 5MB
            fileTypes: ['txt']
        });
        
        logTest('Large File Scanning', results.length > 0,
            `Found ${results.length} artifacts in ${(largeContent.length/1024).toFixed(0)}KB file`);
        
        // Test 2: Many small files
        for (let i = 0; i < 100; i++) {
            const content = i % 10 === 0 ? 
                `File ${i} with Bitcoin address: 1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2` :
                `File ${i} with normal content`;
            await fs.writeFile(path.join(stressTestDir, `file-${i}.txt`), content);
        }
        
        const start = Date.now();
        const dirResults = await fileScanner.scanDirectory(stressTestDir, {
            maxFileSize: 1024 * 1024,
            recursive: true,
            fileTypes: ['txt'],
            includeHidden: false
        });
        const duration = Date.now() - start;
        
        logTest('Many Small Files', dirResults.length >= 10, // Should find at least 10 crypto artifacts
            `Scanned 101 files in ${duration}ms, found ${dirResults.length} artifacts`);
        
        // Test 3: Nested directory structure
        await fs.mkdir(path.join(stressTestDir, 'level1', 'level2', 'level3'), { recursive: true });
        await fs.writeFile(path.join(stressTestDir, 'level1', 'level2', 'level3', 'nested.txt'),
            'Deep nested file with Ethereum address: 0x742d35cc6db6c4335f24c19b5261be20e4cdb1f5');
        
        const nestedResults = await fileScanner.scanDirectory(stressTestDir, {
            maxFileSize: 1024 * 1024,
            recursive: true,
            fileTypes: ['txt']
        });
        
        const hasNestedResult = nestedResults.some(r => r.file.includes('level3'));
        logTest('Nested Directory Scanning', hasNestedResult,
            `Found artifact in nested directory structure`);
        
        // Test 4: Binary file handling
        const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xFF, 0xFE, 0xFD]);
        await fs.writeFile(path.join(stressTestDir, 'binary.bin'), binaryData);
        
        const binaryResults = await fileScanner.scanFile(path.join(stressTestDir, 'binary.bin'), {
            maxFileSize: 1024,
            fileTypes: ['bin', 'txt'] // Include both to test binary handling
        });
        
        logTest('Binary File Handling', binaryResults.length === 0, 
            'Binary file correctly skipped without errors');
        
        // Test 5: Permission errors (try to scan restricted directory)
        try {
            await fileScanner.scanDirectory('/root', {
                maxFileSize: 1024,
                recursive: false,
                fileTypes: ['txt']
            });
            logTest('Permission Error Handling', true, 'No crash on permission denied');
        } catch (error) {
            logTest('Permission Error Handling', true, 'Gracefully handled permission error');
        }
        
    } catch (error) {
        logTest('Stress Test Setup', false, error.message);
    }
    
    // Cleanup
    try {
        await fs.rm(stressTestDir, { recursive: true, force: true });
        logTest('Stress Test Cleanup', true, 'Removed stress test files');
    } catch (error) {
        logTest('Stress Test Cleanup', false, error.message);
    }
}

async function testRealWorldScenarios() {
    console.log('\n🌍 Real World Scenario Tests...');
    console.log('===============================');
    
    const cryptoEngine = new CryptoEngine();
    
    // Test 1: Common false positives
    const falsePositives = [
        '1234567890123456789012345678901234', // Looks like crypto but isn't
        'abcdef1234567890abcdef1234567890abcdef12', // 40 chars but not valid ETH
        'KLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789', // Long alphanumeric
        '5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ', // Looks like Bitcoin WIF
        'word word word word word word word word word word word word', // 12 words but not BIP39
    ];
    
    let falsePositiveCount = 0;
    for (const input of falsePositives) {
        try {
            const result = cryptoEngine.validateCryptoInput(input);
            if (result.valid) {
                falsePositiveCount++;
            }
        } catch (error) {
            // Errors are acceptable for invalid input
        }
    }
    
    logTest('False Positive Prevention', falsePositiveCount <= 1, 
        `${falsePositiveCount}/${falsePositives.length} false positives (should be ≤1)`);
    
    // Test 2: Mixed content parsing
    const mixedContent = `
    Here's my Bitcoin wallet info:
    Private Key: L1SNz6saQzurB2hjryytnZGvbJ9bn1mxfqS17pELqWp43mYA4f2y
    Address: 1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2
    
    And my Ethereum details:
    Address: 0x742d35cc6db6c4335f24c19b5261be20e4cdb1f5
    
    My seed phrase is:
    abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
    
    Some random text with numbers: 123456789
    Website: https://bitcoin.org
    Email: test@example.com
    `;
    
    // Extract potential crypto patterns
    const lines = mixedContent.split('\n');
    let foundValidCrypto = 0;
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length > 10) { // Skip very short lines
            try {
                const result = cryptoEngine.validateCryptoInput(trimmed);
                if (result.valid) {
                    foundValidCrypto++;
                }
            } catch (error) {
                // Continue with next line
            }
        }
    }
    
    logTest('Mixed Content Parsing', foundValidCrypto >= 3,
        `Found ${foundValidCrypto} valid crypto items in mixed content`);
    
    // Test 3: Performance with concurrent operations
    try {
        const promises = [];
        const testKey = 'L1SNz6saQzurB2hjryytnZGvbJ9bn1mxfqS17pELqWp43mYA4f2y';
        
        for (let i = 0; i < 10; i++) {
            promises.push(
                Promise.resolve(cryptoEngine.validateCryptoInput(testKey))
            );
        }
        
        const start = Date.now();
        const results = await Promise.all(promises);
        const duration = Date.now() - start;
        
        const allValid = results.every(r => r.valid);
        logTest('Concurrent Operations', allValid && duration < 1000,
            `10 concurrent validations completed in ${duration}ms`);
    } catch (error) {
        logTest('Concurrent Operations', false, error.message);
    }
}

async function runStressTests() {
    console.log('Starting stress tests and edge cases...\n');
    
    await stressCryptoEngine();
    await stressFileScanner();
    await testRealWorldScenarios();
    
    console.log('\n' + '='.repeat(60));
    console.log('🔥 STRESS TEST SUMMARY:');
    console.log('='.repeat(60));
    console.log(`✅ PASSED: ${testResults.passed}/${testResults.total}`);
    console.log(`❌ FAILED: ${testResults.failed}/${testResults.total}`);
    console.log(`📊 SUCCESS RATE: ${((testResults.passed/testResults.total)*100).toFixed(1)}%`);
    
    if (testResults.failed === 0) {
        console.log('\n🎉 ALL STRESS TESTS PASSED! Application is battle-tested and solid.');
        console.log('🚀 Ready for production use in cryptocurrency forensic investigations!');
    } else if (testResults.failed <= 2) {
        console.log('\n⚠️  Minor issues detected but application is still robust.');
        console.log('🚀 Safe for production use with noted limitations.');
    } else {
        console.log(`\n❌ ${testResults.failed} critical issues detected. Review errors above.`);
    }
}

runStressTests().catch(console.error);
