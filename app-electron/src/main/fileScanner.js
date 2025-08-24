const fs = require('fs').promises;
const path = require('path');
const { createReadStream } = require('fs');
const { createInterface } = require('readline');

class FileScanner {
    constructor() {
        // Regex patterns for finding Bitcoin artifacts only
        this.patterns = {
            // Bitcoin WIF private keys
            wifUncompressed: /\b5[1-9A-HJ-NP-Za-km-z]{50}\b/g,      // 51 chars
            wifCompressed:   /\b[KL][1-9A-HJ-NP-Za-km-z]{51}\b/g,   // 52 chars

            // 32-byte raw hex private keys
            rawPrivHex:      /\b[a-fA-F0-9]{64}\b/g,

            // Legacy and P2SH Base58 addresses
            bitcoinP2PKH: /\b1[1-9A-HJ-NP-Za-km-z]{25,34}\b/g,
            bitcoinP2SH:  /\b3[1-9A-HJ-NP-Za-km-z]{25,34}\b/g,

            // Bech32 (SegWit) and Bech32m (Taproot)
            bitcoinBech32:  /\bbc1q[ac-hj-np-z02-9]{39,60}\b/g,   // P2WPKH/P2WSH
            bitcoinTaproot: /\bbc1p[ac-hj-np-z02-9]{38,60}\b/g,   // P2TR

            // BIP32 extended keys (mainnet + testnet)
            bip32Xpub: /\b(?:xpub|tpub)[1-9A-HJ-NP-Za-km-z]{80,108}\b/g,
            bip32Xprv: /\b(?:xprv|tprv)[1-9A-HJ-NP-Za-km-z]{80,108}\b/g,

            // PSBT (base64)
            psbtBase64: /\bcHNidP[0-9A-Za-z+/=]{20,}\b/g,

            // Output script descriptors
            descriptors: /\b(?:wpkh|sh\(wpkh|sh|wsh|tr)\([^)]+?\)/g,

            // Wallet filenames
            walletDat: /\bwallet\.dat\b/gi
        };
        
        // File name/extension hints for Bitcoin
        this.cryptoFiles = [
            '.wallet', '.dat', '.json', '.txt', '.key', '.pem',
            'wallet.dat', 'bitcoin', 'btc', 'descriptor', 'psbt'
        ];
        
        // Default directories to scan (Bitcoin-focused)
        this.scanPaths = [
            path.join(require('os').homedir(), '.bitcoin'),
            path.join(require('os').homedir(), 'AppData/Roaming/Bitcoin'), // Windows
            path.join(require('os').homedir(), 'Library/Application Support/Bitcoin'), // Mac
            path.join(require('os').homedir(), 'Documents'),
            path.join(require('os').homedir(), 'Desktop'),
            path.join(require('os').homedir(), 'Downloads')
        ];
    }

    /**
     * Scan directories for cryptocurrency artifacts
     */
    async scanForCrypto(customPaths = null, options = {}) {
        const scanPaths = customPaths || this.scanPaths;
        const results = [];
        let scannedFiles = 0;
        let foundArtifacts = 0;

        const scanOptions = {
            maxFileSize: options.maxFileSize || 50 * 1024 * 1024, // 50MB max
            includeHidden: options.includeHidden || false,
            recursive: options.recursive !== false, // Default true
            fileTypes: options.fileTypes || ['txt', 'json', 'dat', 'wallet', 'key', 'pem', 'csv'],
            ...options
        };

        for (const scanPath of scanPaths) {
            try {
                const pathResults = await this.scanDirectory(scanPath, scanOptions);
                results.push(...pathResults);
                scannedFiles += pathResults.reduce((sum, r) => sum + (r.scannedFiles || 1), 0);
                foundArtifacts += pathResults.length;
                
                // Progress callback if provided
                if (options.onProgress) {
                    options.onProgress({
                        currentPath: scanPath,
                        scannedFiles,
                        foundArtifacts,
                        results: results.slice(-10) // Last 10 results
                    });
                }
            } catch (error) {
                console.log(`Skipping ${scanPath}: ${error.message}`);
            }
        }

        return {
            results,
            summary: {
                scannedFiles,
                foundArtifacts,
                scanPaths: scanPaths.length,
                patterns: Object.keys(this.patterns).length
            }
        };
    }

    /**
     * Scan a single directory recursively
     */
    async scanDirectory(dirPath, options) {
        const results = [];
        
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                
                // Skip hidden files unless specified
                if (!options.includeHidden && entry.name.startsWith('.')) {
                    continue;
                }
                
                if (entry.isDirectory() && options.recursive) {
                    // Recursively scan subdirectories
                    try {
                        const subResults = await this.scanDirectory(fullPath, options);
                        results.push(...subResults);
                    } catch (error) {
                        // Skip inaccessible directories
                        continue;
                    }
                } else if (entry.isFile()) {
                    // Scan individual files
                    const fileResults = await this.scanFile(fullPath, options);
                    results.push(...fileResults);
                }
            }
        } catch (error) {
            // Directory not accessible
            throw error;
        }
        
        return results;
    }

    /**
     * Scan individual file for crypto patterns
     */
    async scanFile(filePath, options) {
        const results = [];
        
        try {
            const stat = await fs.stat(filePath);
            
            // Skip if file too large
            if (stat.size > options.maxFileSize) {
                return results;
            }
            
            // Check file extension
            const ext = path.extname(filePath).toLowerCase().slice(1);
            if (options.fileTypes.length > 0 && !options.fileTypes.includes(ext) && !this.isCryptoRelatedFile(filePath)) {
                return results;
            }
            
            // Read raw file content (handle binary)
            const raw = await fs.readFile(filePath).catch(() => null);
            if (!raw) return results;

            // Try UTF-8, then sanitize binary to printable ASCII
            let content;
            try {
                content = raw.toString('utf8');
            } catch {
                content = raw.toString('binary');
            }
            if (/[^\x20-\x7E]/.test(content)) {
                content = content.replace(/[^\x20-\x7E]/g, ' ');
            }
            
            // Always flag wallet.dat explicitly
            const base = path.basename(filePath).toLowerCase();
            if (base === 'wallet.dat') {
                results.push({
                    type: 'walletDat',
                    data: filePath,
                    file: filePath,
                    size: stat.size,
                    modified: stat.mtime,
                    confidence: 95
                });
            }

            // Search for patterns
            for (const [patternName, regex] of Object.entries(this.patterns)) {
                const matches = content.match(regex);
                if (matches) {
                    for (const match of matches) {
                        results.push({
                            type: patternName,
                            data: match,
                            file: filePath,
                            size: stat.size,
                            modified: stat.mtime,
                            confidence: this.calculateConfidence(patternName, match, filePath)
                        });
                    }
                }
            }
            
        } catch (error) {
            // Skip files that can't be read
            return results;
        }
        
        return results;
    }

    /**
     * Check if file is crypto-related based on name/extension
     */
    isCryptoRelatedFile(filePath) {
        const fileName = path.basename(filePath).toLowerCase();
        const fullPath = filePath.toLowerCase();
        
        return this.cryptoFiles.some(pattern => 
            fileName.includes(pattern) || fullPath.includes(pattern)
        );
    }

    /**
     * Calculate confidence score for found artifact
     */
    calculateConfidence(patternType, match, filePath) {
        let confidence = 50; // Base confidence
        
        // Boost confidence based on pattern type
        if ((patternType === 'wifUncompressed' || patternType === 'wifCompressed') && /^[5KL]/.test(match)) {
            confidence += 30;
        } else if (patternType === 'rawPrivHex' && /^[a-fA-F0-9]{64}$/.test(match)) {
            confidence += 20;
        } else if (patternType === 'bitcoinP2PKH' || patternType === 'bitcoinP2SH') {
            confidence += 25;
        } else if (patternType === 'bitcoinBech32' || patternType === 'bitcoinTaproot') {
            confidence += 30;
        } else if (patternType === 'bip32Xpub' || patternType === 'bip32Xprv') {
            confidence += 25;
        } else if (patternType === 'psbtBase64' || patternType === 'descriptors') {
            confidence += 20;
        }
        
        // Boost confidence based on file context
        const fileName = path.basename(filePath).toLowerCase();
        if (fileName.includes('wallet') || fileName.includes('key') || fileName.includes('bitcoin') || fileName.includes('btc')) {
            confidence += 20;
        }
        
        // File extension bonus
        const ext = path.extname(filePath).toLowerCase();
        if (['.wallet', '.key', '.dat'].includes(ext)) {
            confidence += 10;
        }
        
        return Math.min(confidence, 95); // Cap at 95%
    }

    /**
     * Search specific directories with custom patterns
     */
    async searchCustom(searchPaths, patterns, options = {}) {
        const customScanner = new FileScanner();
        customScanner.patterns = { ...this.patterns, ...patterns };
        
        return await customScanner.scanForCrypto(searchPaths, options);
    }

    /**
     * Quick scan for wallet files only
     */
    async quickWalletScan(basePath = null) {
        const searchPath = basePath || require('os').homedir();
        
        const walletPatterns = {
            walletDat: this.patterns.walletDat,
            wifCompressed: this.patterns.wifCompressed,
            wifUncompressed: this.patterns.wifUncompressed,
            bip32Xprv: this.patterns.bip32Xprv
        };
        
        return await this.searchCustom([searchPath], walletPatterns, {
            fileTypes: ['dat', 'wallet', 'json', 'txt'],
            maxFileSize: 10 * 1024 * 1024, // 10MB
            recursive: true
        });
    }
}

module.exports = FileScanner;
