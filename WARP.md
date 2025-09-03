# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

The **Crypto Key Validator** is an offline-capable desktop application built with Electron that validates Bitcoin private keys, seed phrases, and wallet files, then checks their balances securely. The project is structured as a pnpm monorepo with two main components:

- **core-engine**: TypeScript library containing all Bitcoin validation logic
- **app-electron**: Electron + React GUI that consumes the core engine

**Bitcoin-Only Focus**: This project exclusively supports Bitcoin and its networks (mainnet, testnet, signet, regtest). Do not add support for other cryptocurrencies per project requirements.

## Repository Structure

```
crypto-key-validator/
├── core-engine/              # TypeScript validation library
│   ├── src/
│   │   ├── types/           # Type definitions
│   │   ├── validation/      # CryptoValidator - core validation logic
│   │   ├── balance/         # OfflineBalanceChecker - UTXO/balance checking
│   │   ├── parsing/         # InputParser - text/file parsing
│   │   ├── security/        # SecurityManager - memory protection
│   │   ├── engine/          # CryptoKeyValidatorEngine - main coordinator
│   │   └── utils/           # Utility functions
│   └── package.json         # Jest, TypeScript build config
├── app-electron/             # Electron desktop application
│   ├── src/
│   │   ├── main/           # Main Electron process
│   │   ├── renderer/       # React frontend with Tailwind CSS
│   │   └── preload/        # Secure IPC bridge
│   └── package.json        # Vite, Electron Builder config
├── cli.js                   # CLI wrapper script
├── test-*.js               # Integration test scripts
└── pnpm-workspace.yaml     # Workspace configuration
```

## Architecture

The application follows a clean separation of concerns:

1. **Core Engine** (`core-engine/`) - Pure TypeScript library
   - Exports validation functions that take raw input and return structured results
   - No UI dependencies, can be used standalone or in other applications
   - Handles Bitcoin key formats: WIF, hex, BIP39 mnemonics, all address types
   - Manages offline balance checking via local blockchain data

2. **Electron App** (`app-electron/`) - Desktop GUI wrapper
   - React-based renderer process with modern UI
   - Secure IPC communication between main and renderer processes
   - Consumes core-engine via direct import (not as separate service)
   - Handles filesystem scanning, user input, and result presentation

3. **Dependency Flow**: `app-electron` → `core-engine` (one-way dependency)

## Essential Commands

### Initial Setup
```bash
# Install all workspace dependencies
pnpm install

# Build all packages (required before running)
pnpm build
```

### Development Workflow

#### Core Engine Development
```bash
# Watch mode compilation (rebuild on changes)
cd core-engine
pnpm dev              # or: pnpm --filter core-engine dev

# Run unit tests
pnpm test             # or: pnpm --filter core-engine test

# Build production version
pnpm build            # or: pnpm --filter core-engine build
```

#### Electron App Development
```bash
# Start development with hot reload
cd app-electron
pnpm dev              # or: pnpm --filter app-electron dev

# Build individual components
pnpm build:main       # Main process
pnpm build:preload    # Preload script
pnpm build:renderer   # React renderer

# Create distribution packages
pnpm dist             # Creates AppImage/installer
```

#### Root-Level Commands
```bash
# Build everything
pnpm build

# Run all tests across workspaces
pnpm test

# Lint all code
pnpm lint

# Format all code
pnpm format
```

### CLI Usage
The project includes a CLI wrapper (`cli.js`) for testing and validation:

```bash
# Run validation demo
node cli.js demo

# Quick scan (Documents/Desktop/Downloads)
node cli.js scan

# Full home directory scan
node cli.js scan full

# Scan specific directory
node cli.js scan path /path/to/directory

# Validate input directly
node cli.js scan direct "your-bitcoin-key-here"

# Generate sample reports
node cli.js report

# Show help
node cli.js help
```

## Testing

### Unit Tests
- Jest is configured in `core-engine/` for TypeScript testing
- Tests should be placed in `__tests__/` directories alongside source files
- Run tests: `pnpm test` or `cd core-engine && pnpm test`

### Integration Tests
The repository includes several integration test scripts:
- `test-engine.js` - Tests core engine initialization and basic functionality
- `test-bitcoin-detection.js` - Tests Bitcoin address/key detection with real examples

```bash
# Run integration tests
node test-engine.js
node test-bitcoin-detection.js
```

### Manual Testing
1. Build the core engine: `cd core-engine && pnpm build`
2. Start Electron in development: `cd app-electron && pnpm dev`
3. Test with real Bitcoin keys, addresses, and seed phrases
4. Verify UI feedback and validation results

**Test with Bitcoin formats only**: WIF keys, hex keys, BIP39 mnemonics (12-24 words), all Bitcoin address types (1xxx, 3xxx, bc1xxx, bc1pxxx)

## Development Workflow

### Git Workflow (Important)
⚠️ **Never push code to GitHub without approval** - this is a strict project rule.

1. **Create feature branch**: Work on features in local branches
2. **Commit frequently**: Make small, focused commits locally
3. **Test before committing**: Run `pnpm lint && pnpm test`
4. **No automatic pushing**: Only push to GitHub when explicitly approved

### Adding New Features

#### Adding Bitcoin Key/Address Support
1. **Update InputParser** (`core-engine/src/parsing/InputParser.ts`) - Add detection patterns
2. **Extend CryptoValidator** (`core-engine/src/validation/CryptoValidator.ts`) - Implement validation logic
3. **Update OfflineBalanceChecker** (`core-engine/src/balance/OfflineBalanceChecker.ts`) - Add balance checking
4. **Add tests** - Create comprehensive test cases with real examples

#### Modifying Electron UI
1. **Renderer changes**: Modify React components in `app-electron/src/renderer/`
2. **IPC changes**: Update preload script and main process if needed
3. **Styling**: Use Tailwind CSS classes (configured in `tailwind.config.js`)

### Code Style
- **TypeScript strict mode** - All code must compile without errors
- **ESLint + Prettier** - Automatically enforced formatting
- **Security-first** - Use ESLint security plugin, handle sensitive data carefully
- **Comprehensive JSDoc** - Document all public APIs

## Project-Specific Considerations

### Bitcoin-Only Focus
- **Accept only Bitcoin-related PRs** - Reject any additions for other cryptocurrencies
- **Supported networks**: Bitcoin mainnet, testnet, signet, regtest
- **Address types**: P2PKH (1xxx), P2SH (3xxx), P2WPKH/P2WSH (bc1xxx), P2TR (bc1pxxx)
- **Key formats**: WIF, raw hex, BIP39 seed phrases

### Security Requirements
- **Offline operation** - No external API calls during validation
- **Memory protection** - Sensitive data should be encrypted in memory when possible
- **Secure cleanup** - Zero out key material after use
- **Audit logging** - Track access to sensitive operations

### Build Requirements
- **Node.js 18+** required
- **pnpm** preferred over npm for workspace management
- **Native dependencies** - sqlite3, keytar may require rebuild on different platforms

## Common Issues

### Build Problems
```bash
# Native module rebuild
pnpm rebuild

# Clean and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# TypeScript compilation errors
cd core-engine
pnpm clean && pnpm build
```

### Electron Issues
```bash
# Missing system libraries (Linux)
sudo apt install libgtk-3-0 libatk-bridge2.0-0 libcups2 libdrm2 libnss3

# AppImage permissions
chmod +x dist-packages/*.AppImage
```

### Development Setup
```bash
# First-time setup sequence
pnpm install                    # Install dependencies
cd core-engine && pnpm build   # Build core engine first
cd ../app-electron && pnpm dev # Start development server
```

## Configuration Files

- **TypeScript**: `tsconfig.json` (root), individual configs in each package
- **ESLint**: `.eslintrc.js` with security plugin enabled
- **Electron Builder**: Configuration in `app-electron/package.json` build section
- **Vite**: `app-electron/vite.config.js` for renderer process bundling
- **Tailwind**: `app-electron/tailwind.config.js` for styling

This documentation should help you work effectively with the crypto-key-validator codebase while maintaining its Bitcoin-focused security requirements.
