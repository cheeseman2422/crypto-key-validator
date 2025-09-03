# Crypto Key Validator

A standalone desktop application for validating and analyzing cryptocurrency keys, built with Electron.

## Overview

The **Crypto Key Validator** is a comprehensive, offline-capable GUI application that validates cryptocurrency private keys, seed phrases, and wallet files, then checks their balances securely. It can scan filesystems, folders, and entire drives for cryptocurrency artifacts.

## Key Features

### 🔐 **Secure Offline Operation**
- Complete offline functionality with local blockchain data
- Secure memory management with encryption for sensitive data
- Air-gapped environment support
- No external API calls or data transmission


### 🔍 **Comprehensive Input Support**
- **Filesystem Scanning**: Deep scan of directories, drives, and specific file types
- **Direct Input**: Paste or type keys/phrases directly
- **Secure Processing**: All input is cryptographically validated before analysis



### 💰 **Bitcoin-Only Focus**
- **Bitcoin Legacy**: P2PKH addresses (1xxx)
- **Bitcoin SegWit**: P2SH-wrapped SegWit addresses (3xxx)
- **Bitcoin Bech32**: Native SegWit addresses (bc1xxx)
- **Bitcoin Taproot**: P2TR addresses (bc1pxxx)
- **All Bitcoin Networks**: Mainnet, Testnet, Signet, Regtest

### ✅ **Advanced Validation Engine**
- **Private Keys**: WIF format, hex format validation
- **Seed Phrases**: BIP39 mnemonic validation (12-24 words)
- **Wallet Files**: Bitcoin Core, Electrum, Exodus, MetaMask, Monero
- **Address Derivation**: HD wallet path derivation and address generation

### 📊 **Offline Balance Checking**
- Local blockchain database integration
- UTXO set parsing for Bitcoin-like chains
- Account state checking for Ethereum
- Cached balance data for air-gapped environments

### 🛡️ **Enterprise Security Features**
- Memory protection and secure data handling
- Private key truncation for reports
- Audit logging and access tracking
- Runtime security environment validation

## Architecture

The application is built as a monorepo with the following components:

```
CryptoKeyValidator/
├── core-engine/          # Core TypeScript library
│   ├── src/
│   │   ├── types/        # Type definitions
│   │   ├── validation/   # Crypto validation logic
│   │   ├── balance/      # Offline balance checking
│   │   ├── parsing/      # Input parsing and scanning
│   │   ├── security/     # Security and memory management
│   │   ├── engine/       # Main coordinator class
│   │   └── utils/        # Utility functions
│   └── package.json
├── app-electron/         # Electron GUI application
│   ├── src/
│   │   ├── main/         # Main Electron process
│   │   ├── renderer/     # React frontend with modern UI
│   │   └── preload/      # Secure IPC bridge
│   └── package.json
└── docs/                 # Documentation
```

## Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm
- For offline balance checking: blockchain data files

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CryptoKeyValidator
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Build the core engine**
   ```bash
   cd core-engine
   pnpm build
   cd ..
   ```

4. **Start development**
   ```bash
   cd app-electron  
   pnpm dev
   ```

### Building for Production

```bash
# Build all components
pnpm build

# Create distributables
cd app-electron
pnpm dist
```

## Usage

### Input Sources

#### 1. Filesystem Scanning  
Scan any directory or drive for cryptocurrency artifacts:
- File → Scan Directory...
- Select root directory to scan
- Configure scan options (file types, size limits, etc.)
- Deep scan option for binary files
- Supports scanning compressed files and archives
- Pattern recognition for various wallet formats

#### 2. Direct Input
Paste or type cryptocurrency data directly:

- Use the input area in the main interface
- Supports private keys, seed phrases, addresses
- Real-time validation as you type

### Artifact Types Detected

| Type | Examples | Validation |
|------|----------|------------|
| **Private Keys** | WIF format, raw hex | ✅ Format validation, address derivation |
| **Seed Phrases** | BIP39 12-24 words | ✅ Mnemonic validation, entropy check |
| **Wallet Files** | wallet.dat, *.wallet | ✅ File signature detection |
| **Addresses** | Bitcoin all types | ✅ Checksum validation |

### Balance Checking

The application supports offline balance checking through:

1. **Local Blockchain Data**: Pre-synchronized UTXO sets and account states
2. **Cached Data**: Previously downloaded balance information
3. **Derived Addresses**: Generate and check multiple address types

#### Setting Up Blockchain Data

For truly offline operation, you'll need local blockchain data:

```bash
# Bitcoin UTXO set (example structure)
blockchain-data/
├── bitcoin/
│   ├── utxo.db          # SQLite database with UTXO set
│   └── chainstate/      # Bitcoin Core chainstate
├── ethereum/
│   └── accounts.db      # LevelDB with account states
└── litecoin/
    └── utxo.db
```

*Note: Tools for blockchain data synchronization are planned for future releases.*

### Security Features

#### Memory Protection
- Sensitive data encrypted in memory
- Automatic cleanup on application exit
- Zero-overwrite of key material

#### Audit Trail
- All key access is logged
- Configurable audit retention
- Export audit logs for compliance

#### Environment Validation
- Detects development/debug environments
- Warns about potential security issues
- Runtime integrity checks

## Results and Reporting

### Dashboard View
- Summary statistics
- Risk assessment indicators
- Real-time scan progress
- Balance totals

### Results Explorer
- Filterable artifact grid
- Balance information display
- Validation status indicators
- Export capabilities

### Report Generation
- **JSON**: Machine-readable results
- **CSV**: Spreadsheet-compatible format
- **HTML**: Human-readable reports
- **Custom**: Configurable templates

## Configuration

The application uses a comprehensive configuration system:

```typescript
interface AppConfiguration {
  security: SecurityConfig;      // Memory protection, encryption
  scanning: ScanConfiguration;   // File types, size limits
  reporting: ReportConfiguration; // Output formats, content
  ui: UIConfiguration;           // Theme, language, animations
  offline: OfflineConfiguration; // Blockchain data settings
}
```

Key configuration options:
- **Security**: Enable memory protection, audit logging
- **Scanning**: File type filters, exclusion paths, size limits
- **UI**: Dark/light theme, animations, language
- **Offline**: Blockchain data path, caching settings



## Development

### Core Engine Development
```bash
cd core-engine
pnpm dev          # Watch mode compilation
pnpm test         # Run tests
pnpm lint         # Code linting
```

### Electron App Development  
```bash
cd app-electron
pnpm dev          # Start with hot reload
pnpm build:main   # Build main process
pnpm build:renderer # Build renderer process
```

### Adding New Cryptocurrencies

1. **Add patterns** in `core-engine/src/parsing/InputParser.ts`
2. **Implement validation** in `core-engine/src/validation/CryptoValidator.ts` 
3. **Add balance checking** in `core-engine/src/balance/OfflineBalanceChecker.ts`


## System Requirements

- **Operating System:** Windows 10+, macOS 12+, Linux (Ubuntu 22.04+, Fedora 36+, Debian 12+)
- **Node.js:** v18 or newer
- **Memory:** 2GB+ recommended
- **Disk Space:** 500MB+ (additional for blockchain data)
- **Graphics:** Hardware acceleration recommended for best performance

## Troubleshooting

### Common Issues

- **Missing system libraries (Linux):**
   - Install dependencies: `sudo apt install libgtk-3-0 libatk-bridge2.0-0 libcups2 libdrm2 libnss3 libxss1 libasound2 libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libpango-1.0-0 libpangocairo-1.0-0 libxext6 libxfixes3 libxkbcommon0 libxrender1 libxcb1 libxinerama1 libxshmfence1 libxau6 libxdmcp6`
- **Native module errors (sqlite3, keytar):**
   - Run: `pnpm rebuild` or `npm rebuild`
- **AppImage won’t launch:**
   - Make executable: `chmod +x CryptoKeyValidator*.AppImage`
   - Run from terminal for error output
- **Blank window or crash:**
   - Try: `pnpm dev` for debug output
   - Check logs in `app-electron/release/`

### Getting Help

- See `/docs` for detailed guides
- Open an issue on GitHub for bugs or feature requests

## Roadmap

### Version 1.1 (Planned)
- [ ] Hardware wallet integration (Ledger, Trezor)
- [ ] Blockchain data synchronization tools
- [ ] Advanced HD wallet discovery
- [ ] Multi-signature wallet support

### Version 1.2 (Future)
- [ ] Additional cryptocurrency support (Dogecoin, Zcash, etc.)
- [ ] Browser extension artifact parsing
- [ ] Advanced reporting templates
- [ ] API for programmatic access

## Contributing

We welcome contributions! Please see our contribution guidelines:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality  
4. Ensure all tests pass
5. Submit a pull request

### Code Style
- TypeScript with strict mode
- ESLint + Prettier formatting
- Comprehensive JSDoc comments
- Security-first coding practices

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: See `/docs` directory
- **Issues**: GitHub issue tracker
- **Security**: Report vulnerabilities privately

---

**Built for Secure, Offline Cryptocurrency Validation** 🛡️
