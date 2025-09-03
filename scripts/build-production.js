#!/usr/bin/env node

/**
 * Production Build Script for Crypto Key Validator
 * Handles pre-build validation, building, and post-build testing
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist-packages');
const BUILD_RESOURCES = path.join(PROJECT_ROOT, 'build-resources');

class ProductionBuilder {
    constructor() {
        this.startTime = Date.now();
        this.errors = [];
        this.warnings = [];
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const colors = {
            INFO: '\x1b[36m',    // Cyan
            SUCCESS: '\x1b[32m', // Green
            WARNING: '\x1b[33m', // Yellow
            ERROR: '\x1b[31m',   // Red
            RESET: '\x1b[0m'     // Reset
        };
        
        console.log(`${colors[level] || ''}[${timestamp}] ${level}: ${message}${colors.RESET}`);
    }

    async validatePrerequisites() {
        this.log('🔍 Validating build prerequisites...', 'INFO');
        
        // Check if dist directories exist and are built
        const requiredDirs = [
            'app-electron/dist',
            'core-engine/dist'
        ];
        
        for (const dir of requiredDirs) {
            const fullPath = path.join(PROJECT_ROOT, dir);
            if (!fs.existsSync(fullPath)) {
                this.errors.push(`Missing required directory: ${dir}. Run 'pnpm build' first.`);
            }
        }
        
        // Check package.json
        const packagePath = path.join(PROJECT_ROOT, 'package.json');
        if (!fs.existsSync(packagePath)) {
            this.errors.push('Missing package.json file');
        } else {
            const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            if (!pkg.build) {
                this.errors.push('Missing build configuration in package.json');
            }
        }
        
        // Check for icons (warn if missing)
        const iconPath = path.join(BUILD_RESOURCES, 'icon.png');
        if (!fs.existsSync(iconPath)) {
            this.warnings.push('Missing icon.png - using default Electron icon');
        }
        
        // Check Node.js version
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        if (majorVersion < 16) {
            this.errors.push(`Node.js version ${nodeVersion} is too old. Minimum required: 16.x`);
        }
        
        if (this.errors.length > 0) {
            this.log('❌ Prerequisite validation failed:', 'ERROR');
            this.errors.forEach(error => this.log(`  - ${error}`, 'ERROR'));
            return false;
        }
        
        if (this.warnings.length > 0) {
            this.log('⚠️  Build warnings:', 'WARNING');
            this.warnings.forEach(warning => this.log(`  - ${warning}`, 'WARNING'));
        }
        
        this.log('✅ Prerequisites validated successfully', 'SUCCESS');
        return true;
    }

    async runCommand(command, description) {
        this.log(`🔨 ${description}`, 'INFO');
        try {
            const startTime = Date.now();
            const output = execSync(command, { 
                cwd: PROJECT_ROOT,
                stdio: 'pipe',
                encoding: 'utf8'
            });
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            this.log(`✅ ${description} completed in ${duration}s`, 'SUCCESS');
            return { success: true, output };
        } catch (error) {
            this.log(`❌ ${description} failed: ${error.message}`, 'ERROR');
            return { success: false, error: error.message };
        }
    }

    async buildApplication(target = 'linux') {
        this.log(`🚀 Starting production build for ${target}...`, 'INFO');
        
        // Clean previous builds
        if (fs.existsSync(DIST_DIR)) {
            this.log('🧹 Cleaning previous builds...', 'INFO');
            fs.rmSync(DIST_DIR, { recursive: true, force: true });
        }
        
        // Build core and app
        let result = await this.runCommand('pnpm run build', 'Building application');
        if (!result.success) {
            return false;
        }
        
        // Run electron-builder
        const builderCommand = `pnpm run build:${target}`;
        result = await this.runCommand(builderCommand, `Packaging for ${target}`);
        if (!result.success) {
            return false;
        }
        
        return true;
    }

    async validateBuild() {
        this.log('🔍 Validating build artifacts...', 'INFO');
        
        if (!fs.existsSync(DIST_DIR)) {
            this.log('❌ Build output directory does not exist', 'ERROR');
            return false;
        }
        
        const buildFiles = fs.readdirSync(DIST_DIR);
        if (buildFiles.length === 0) {
            this.log('❌ No build artifacts found', 'ERROR');
            return false;
        }
        
        this.log(`✅ Found ${buildFiles.length} build artifact(s):`, 'SUCCESS');
        buildFiles.forEach(file => {
            const filePath = path.join(DIST_DIR, file);
            const stats = fs.statSync(filePath);
            const sizeKB = (stats.size / 1024).toFixed(1);
            this.log(`  📦 ${file} (${sizeKB} KB)`, 'INFO');
        });
        
        return true;
    }

    async testBuildFunctionality() {
        this.log('🧪 Testing build functionality...', 'INFO');
        
        // Test core engine functionality
        try {
            const testScript = `
                const { CryptoKeyValidatorEngine } = require('./core-engine/dist/engine/CryptoKeyValidatorEngine.js');
                const config = {
                    security: { enableMemoryProtection: true, clearClipboardAfter: 30, enableAuditLog: false, requireAuthentication: false, maxIdleTime: 300, enableEncryption: false },
                    scanning: { includePaths: [], excludePaths: [], fileTypes: ['.txt'], maxFileSize: 1048576, followSymlinks: false, scanCompressed: false, deepScan: false, pattern: [] },
                    reporting: { includePrivateKeys: false, truncateKeys: true, includeBalances: false, includeMetadata: true, format: 'json' },
                    ui: { theme: 'dark', language: 'en', animations: false, notifications: false, autoSave: false, maxResultsDisplay: 10 },
                    offline: { blockchainDataPath: '/tmp', enableLocalNodes: false, syncInterval: 24, maxCacheSize: 128, enableCaching: false }
                };
                
                async function test() {
                    const engine = new CryptoKeyValidatorEngine(config);
                    await engine.initialize();
                    const result = await engine.processDirectInput('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4');
                    await engine.shutdown();
                    console.log('✅ Core functionality test passed');
                }
                test().catch(console.error);
            `;
            
            const result = await this.runCommand(`node -e "${testScript}"`, 'Testing core engine');
            if (!result.success) {
                this.log('❌ Core engine test failed', 'ERROR');
                return false;
            }
            
            this.log('✅ Build functionality tests passed', 'SUCCESS');
            return true;
        } catch (error) {
            this.log(`❌ Functionality test failed: ${error.message}`, 'ERROR');
            return false;
        }
    }

    generateBuildReport() {
        const buildTime = ((Date.now() - this.startTime) / 1000).toFixed(2);
        const report = {
            timestamp: new Date().toISOString(),
            buildTime: `${buildTime}s`,
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            success: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings,
            artifacts: []
        };
        
        if (fs.existsSync(DIST_DIR)) {
            const files = fs.readdirSync(DIST_DIR);
            report.artifacts = files.map(file => {
                const filePath = path.join(DIST_DIR, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    size: stats.size,
                    sizeFormatted: `${(stats.size / 1024 / 1024).toFixed(2)} MB`
                };
            });
        }
        
        const reportPath = path.join(PROJECT_ROOT, 'build-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        return report;
    }

    async build(target = 'linux') {
        this.log('🏗️  Starting Crypto Key Validator production build', 'INFO');
        
        // Validate prerequisites
        if (!await this.validatePrerequisites()) {
            return false;
        }
        
        // Build application
        if (!await this.buildApplication(target)) {
            return false;
        }
        
        // Validate build
        if (!await this.validateBuild()) {
            return false;
        }
        
        // Test functionality
        if (!await this.testBuildFunctionality()) {
            return false;
        }
        
        // Generate report
        const report = this.generateBuildReport();
        
        this.log(`🎉 Production build completed successfully in ${report.buildTime}!`, 'SUCCESS');
        this.log(`📦 Build artifacts saved to: ${DIST_DIR}`, 'INFO');
        this.log(`📊 Build report saved to: build-report.json`, 'INFO');
        
        return true;
    }
}

// CLI interface
if (require.main === module) {
    const target = process.argv[2] || 'linux';
    const validTargets = ['linux', 'appimage', 'deb', 'rpm', 'snap', 'win', 'mac', 'all'];
    
    if (!validTargets.includes(target)) {
        console.error(`❌ Invalid target: ${target}`);
        console.error(`Valid targets: ${validTargets.join(', ')}`);
        process.exit(1);
    }
    
    const builder = new ProductionBuilder();
    builder.build(target)
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Build failed:', error);
            process.exit(1);
        });
}

module.exports = ProductionBuilder;
