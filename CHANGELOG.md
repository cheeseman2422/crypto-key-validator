# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2025-01-21

### Added
- **Unified CLI Interface** - New `ckv` command with subcommands: demo, scan, report, validate, help
- **Package.json Configuration** - Proper Node.js project setup with dependencies and scripts
- **GitHub Actions CI** - Automated testing on Node.js 16.x, 18.x, 20.x
- **Comprehensive Test Suite** - `npm test` runs validation tests for all core functionality
- **Enhanced Documentation** - Updated README with modern installation and usage instructions
- **Professional Structure** - Organized project structure with proper .gitignore and workflows

### Changed
- **Installation Process** - Now uses standard `npm install` instead of manual dependency installation
- **Usage Patterns** - Unified CLI replaces individual script calls (though legacy access still works)
- **Report Generation** - Fixed output paths to write reports in project directory
- **Dependencies** - Centralized in package.json with proper version pinning

### Technical Improvements
- **CI/CD Pipeline** - Automated testing and validation on every push/PR
- **Error Handling** - Better error messages and validation feedback
- **Code Organization** - Cleaner project structure with app-electron sources included
- **Cross-Platform** - Tested on multiple Node.js versions for compatibility

### Migration Guide
- **Before**: `node demo-crypto-validation.js`
- **After**: `ckv demo` or `npm run demo`

- **Before**: `node real-crypto-scan.js path /data`
- **After**: `ckv scan path /data`

- **Before**: Manual script execution
- **After**: `npm install && npm test` for full validation

## [1.0.0] - 2025-01-21

### Initial Release
- Real cryptocurrency validation using production libraries (bitcoinjs-lib, ethers.js, bip39)
- File system scanning with pattern recognition and confidence scoring  
- Multi-format reporting (JSON, CSV, HTML)
- Support for Bitcoin (WIF, addresses, hex keys), Ethereum (addresses, private keys), and BIP39 mnemonics
- Interactive demo mode and stress testing capabilities
- Professional forensic reporting with executive summaries and technical details
