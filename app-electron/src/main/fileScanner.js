const fs = require('fs').promises;
const path = require('path');
const { createReadStream } = require('fs');
const { createInterface } = require('readline');

class FileScanner {
    constructor() {
        // Regex patterns for finding cryptocurrency data
        this.patterns = {
            // Bitcoin WIF private keys (51-52 chars, starts with K, L, or 5)
            bitcoinWIF: /\b[KL5][1-9A-HJ-NP-Za-km-z]{50,51}\b/g,
            
            // Bitcoin hex private keys (64 hex chars)
            bitcoinHex: /\b[0-9a-fA-F]{64}\b/g,
            
            // Bitcoin addresses
            bitcoinLegacy: /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g,
            bitcoinSegwit: /\bbc1[a-z0-9]{39,59}\b/g,
            
            // Ethereum addresses (0x + 40 hex chars)
            ethereumAddress: /\b0x[a-fA-F0-9]{40}\b/g,
            
            // Ethereum private keys (0x + 64 hex chars)
            ethereumPrivateKey: /\b0x[a-fA-F0-9]{64}\b/g,
            
            // BIP39 seed phrases (12-24 words)
            bip39Seeds: /\b(?:[a-z]{3,8}\s+){11,23}[a-z]{3,8}\b/gi,
            
            // Wallet file patterns
            walletFiles: /wallet\.dat|\.wallet|keystore|mnemonic|seed/i,
            
            // Base58 encoded data (potential crypto keys)
            base58: /\b[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{25,}\b/g
        };
        
        // Common crypto-related file extensions and names
        this.cryptoFiles = [
            '.wallet', '.dat', '.json', '.txt', '.key', '.pem',
            'wallet.dat', 'keystore', 'mnemonic.txt', 'seed.txt',
            'private_key', 'bitcoin', 'ethereum', 'crypto'
        ];
        
        // Directories to scan (common locations)
        this.scanPaths = [
            path.join(require('os').homedir(), '.bitcoin'),
            path.join(require('os').homedir(), '.ethereum'),
            path.join(require('os').homedir(), '.litecoin'),
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
            
            // Read and scan file content
            const content = await fs.readFile(filePath, 'utf8').catch(() => null);
            if (!content) return results; // Skip binary files
            
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
        if (patternType === 'bitcoinWIF' && /^[KL5]/.test(match)) {
            confidence += 30;
        } else if (patternType === 'ethereumAddress' && match.startsWith('0x')) {
            confidence += 25;
        } else if (patternType === 'bip39Seeds' && match.split(' ').length >= 12) {
            confidence += 35;
        }
        
        // Boost confidence based on file context
        const fileName = path.basename(filePath).toLowerCase();
        if (fileName.includes('wallet') || fileName.includes('key') || fileName.includes('crypto')) {
            confidence += 20;
        }
        
        if (fileName.includes('bitcoin') || fileName.includes('ethereum') || fileName.includes('btc') || fileName.includes('eth')) {
            confidence += 15;
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
            walletFiles: this.patterns.walletFiles,
            bitcoinWIF: this.patterns.bitcoinWIF,
            ethereumAddress: this.patterns.ethereumAddress
        };
        
        return await this.searchCustom([searchPath], walletPatterns, {
            fileTypes: ['dat', 'wallet', 'json', 'txt'],
            maxFileSize: 10 * 1024 * 1024, // 10MB
            recursive: true
        });
    }
}

module.exports = FileScanner;
