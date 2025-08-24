#!/usr/bin/env node

// Real cryptocurrency scanner - no fake data, uses actual scanning and validation
const CryptoEngine = require('./app-electron/src/main/cryptoEngine.js');
const FileScanner = require('./app-electron/src/main/fileScanner.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('\n🔐 CryptoKeyFinder - REAL Cryptocurrency Scanner');
console.log('================================================\n');

const cryptoEngine = new CryptoEngine();
const fileScanner = new FileScanner();

// Real scanning function
async function performRealScan(targetPaths = null, options = {}) {
    console.log('🔍 Starting REAL cryptocurrency scan...\n');
    
    // Default scan paths if none provided
    const scanPaths = targetPaths || [
        path.join(os.homedir(), 'Documents'),
        path.join(os.homedir(), 'Desktop'),
        path.join(os.homedir(), 'Downloads'),
        // Common crypto wallet locations
        path.join(os.homedir(), '.bitcoin'),
        path.join(os.homedir(), '.ethereum'),
        path.join(os.homedir(), 'AppData/Roaming/Bitcoin'), // Windows
        path.join(os.homedir(), 'Library/Application Support/Bitcoin'), // Mac
    ];

    const scanOptions = {
        includeHidden: false,
        recursive: true,
        maxFileSize: 50 * 1024 * 1024, // 50MB max
        fileTypes: ['txt', 'json', 'dat', 'wallet', 'key', 'pem', 'csv', 'log'],
        onProgress: (progress) => {
            process.stdout.write(`\r   Scanned: ${progress.scannedFiles} files, Found: ${progress.foundArtifacts} artifacts`);
        },
        ...options
    };

    try {
        // Perform the real scan
        const scanResult = await fileScanner.scanForCrypto(scanPaths, scanOptions);
        
        console.log(`\n\n📊 Real Scan Results:`);
        console.log(`   Total files scanned: ${scanResult.summary.scannedFiles}`);
        console.log(`   Crypto artifacts found: ${scanResult.summary.foundArtifacts}`);
        console.log(`   Scan paths checked: ${scanResult.summary.scanPaths}`);
        
        const realValidatedArtifacts = [];
        
        if (scanResult.results.length > 0) {
            console.log('\n🔬 Validating found artifacts with real crypto libraries...\n');
            
            for (let i = 0; i < scanResult.results.length; i++) {
                const artifact = scanResult.results[i];
                
                // Use real crypto validation
                const validation = cryptoEngine.validateCryptoInput(artifact.data);
                
                if (validation.valid) {
                    const validatedArtifact = {
                        id: `artifact_${i + 1}`,
                        originalPattern: artifact.type,
                        validationType: validation.type,
                        data: artifact.data,
                        file: artifact.file,
                        fileSize: artifact.size,
                        modified: artifact.modified,
                        confidence: artifact.confidence,
                        validation: validation,
                        timestamp: new Date().toISOString()
                    };
                    
                    realValidatedArtifacts.push(validatedArtifact);
                    
                    console.log(`✅ VALID: ${validation.type}`);
                    console.log(`   File: ${artifact.file}`);
                    console.log(`   Data: ${artifact.data.substring(0, 40)}...`);
                    console.log(`   Pattern Confidence: ${artifact.confidence}%`);
                    
                    if (validation.addresses) {
                        console.log(`   Generated Addresses:`);
                        Object.entries(validation.addresses).forEach(([type, addr]) => {
                            console.log(`     ${type}: ${addr}`);
                        });
                    }
                    if (validation.address) {
                        console.log(`   Address: ${validation.address}`);
                    }
                    console.log('');
                } else {
                    console.log(`❌ Pattern found but validation failed: ${artifact.type}`);
                    console.log(`   File: ${artifact.file}`);
                    console.log(`   Error: ${validation.error}`);
                    console.log('');
                }
            }
        } else {
            console.log('\n📝 No cryptocurrency artifacts found in scanned locations.');
            console.log('   This could mean:');
            console.log('   • No wallet files exist in common locations');
            console.log('   • Wallet files are in non-standard locations');
            console.log('   • Files are encrypted or in unsupported formats');
        }
        
        return {
            scanSummary: scanResult.summary,
            validatedArtifacts: realValidatedArtifacts,
            totalValidArtifacts: realValidatedArtifacts.length,
            scanTimestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error(`\n❌ Scan failed: ${error.message}`);
        return null;
    }
}

// Export real results to file
async function exportRealResults(results, format = 'json') {
    if (!results || results.validatedArtifacts.length === 0) {
        console.log('📝 No valid artifacts to export.');
        return;
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `crypto-scan-results-${timestamp}.${format}`;
    const filepath = path.join(__dirname, filename);
    
    try {
        if (format === 'json') {
            const exportData = {
                exportInfo: {
                    timestamp: new Date().toISOString(),
                    version: '1.0.0',
                    format: 'json',
                    generator: 'CryptoKeyFinder Real Scanner',
                    totalArtifacts: results.validatedArtifacts.length
                },
                scanSummary: results.scanSummary,
                artifacts: results.validatedArtifacts.map(artifact => ({
                    ...artifact,
                    // Truncate sensitive data for security
                    data: artifact.data.substring(0, 20) + '...[TRUNCATED]'
                }))
            };
            
            fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));
            
        } else if (format === 'csv') {
            const headers = ['ID', 'Type', 'File', 'Confidence', 'Valid', 'Timestamp'];
            const rows = results.validatedArtifacts.map(artifact => [
                artifact.id,
                artifact.validationType,
                artifact.file,
                `${artifact.confidence}%`,
                'YES',
                artifact.timestamp
            ]);
            
            const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
            fs.writeFileSync(filepath, csv);
        }
        
        console.log(`\n💾 Real results exported to: ${filename}`);
        console.log(`   Format: ${format.toUpperCase()}`);
        console.log(`   Valid artifacts: ${results.validatedArtifacts.length}`);
        
    } catch (error) {
        console.error(`❌ Export failed: ${error.message}`);
    }
}

// Main execution
(async () => {
    console.log('🎯 Options:');
    console.log('   1. Quick scan (Documents, Desktop, Downloads)');
    console.log('   2. Full home directory scan');
    console.log('   3. Custom path scan');
    console.log('   4. Direct input validation\n');
    
    const args = process.argv.slice(2);
    
    if (args[0] === 'direct' && args[1]) {
        // Direct validation mode
        console.log('🔬 Direct validation mode\n');
        const input = args.slice(1).join(' ');
        const result = cryptoEngine.validateCryptoInput(input);
        
        console.log(`Input: ${input}`);
        console.log(`Result: ${result.valid ? '✅ VALID' : '❌ INVALID'}`);
        if (result.valid) {
            console.log(`Type: ${result.type}`);
            if (result.addresses) {
                Object.entries(result.addresses).forEach(([type, addr]) => {
                    console.log(`${type}: ${addr}`);
                });
            }
        } else {
            console.log(`Error: ${result.error}`);
        }
        
    } else if (args[0] === 'full') {
        // Full home directory scan
        console.log('🏠 Full home directory scan mode\n');
        const results = await performRealScan([os.homedir()], { recursive: true });
        if (results) await exportRealResults(results, 'json');
        
    } else if (args[0] === 'path' && args[1]) {
        // Custom path scan
        console.log(`📂 Custom path scan: ${args[1]}\n`);
        const results = await performRealScan([args[1]]);
        if (results) await exportRealResults(results, 'json');
        
    } else {
        // Default quick scan
        console.log('⚡ Quick scan mode (common locations)\n');
        const quickPaths = [
            path.join(os.homedir(), 'Documents'),
            path.join(os.homedir(), 'Desktop'),
            path.join(os.homedir(), 'Downloads')
        ];
        
        const results = await performRealScan(quickPaths);
        if (results) await exportRealResults(results, 'json');
    }
    
    console.log('\n🎉 Scan complete!');
    console.log('\n💡 Usage examples:');
    console.log('   node real-crypto-scan.js                    # Quick scan');
    console.log('   node real-crypto-scan.js full               # Full home scan');
    console.log('   node real-crypto-scan.js path /custom/path  # Custom path');
    console.log('   node real-crypto-scan.js direct "L1aW4a..." # Validate input');
})();
