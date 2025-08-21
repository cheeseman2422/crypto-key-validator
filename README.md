# 🔐 CryptoKey Validator

A professional-grade cryptocurrency forensics and validation toolkit for security researchers, investigators, and cryptocurrency enthusiasts. This tool performs real cryptocurrency key validation, address generation, and file system scanning using industry-standard cryptographic libraries.

## 🎯 What is CryptoKey Validator?

CryptoKey Validator is a comprehensive toolkit that provides:
- **Real cryptocurrency validation** using production-grade libraries
- **File system scanning** for cryptocurrency artifacts
- **Forensic reporting** with confidence scoring
- **Multi-format support** for Bitcoin, Ethereum, and BIP39 mnemonics
- **Professional output** in JSON, CSV, and HTML formats

## ✨ Features

### Core Validation Capabilities
- **Bitcoin Private Keys (WIF)** - Validates Wallet Import Format keys
- **Bitcoin Addresses** - Supports Legacy, SegWit, and nested SegWit formats
- **Ethereum Addresses** - EIP-55 checksum validation and normalization
- **BIP39 Seed Phrases** - Mnemonic validation with entropy calculation
- **Hex Private Keys** - Raw private key validation and conversion
- **HD Wallet Derivation** - Hierarchical deterministic wallet support

### Advanced Features
- **Real-time File Scanning** - Pattern recognition across file systems
- **Confidence Scoring** - Context-based artifact validation
- **Address Generation** - Derive addresses from private keys
- **Multiple Output Formats** - JSON, CSV, HTML reports
- **Interactive Demo Mode** - Test validation with sample data
- **Stress Testing** - Performance validation with large datasets

## 🚀 Installation

### Prerequisites
```bash
# Install Node.js (version 14+ required)
sudo apt update
sudo apt install nodejs npm

# Or use your preferred package manager
```

### Dependencies Installation
```bash
# Navigate to the crypto-key-validator directory
cd crypto-key-validator

# Install required Node.js packages
npm install bitcoinjs-lib ethers bip39 bip32 tiny-secp256k1
```

### Quick Setup
```bash
# Make scripts executable
chmod +x *.sh *.js

# Run quick setup verification
./quick-demo.sh
```

## 📱 Usage

### 1. Interactive Demo Mode
```bash
# Test validation with sample cryptocurrency data
node demo-crypto-validation.js
```
**Features:**
- Validates sample Bitcoin WIF keys
- Generates addresses from private keys
- Tests Ethereum address validation
- Verifies BIP39 mnemonic phrases

### 2. Real File System Scanner
```bash
# Quick scan of common cryptocurrency locations
node real-crypto-scan.js

# Full home directory scan (thorough but slower)
node real-crypto-scan.js full

# Scan specific directory
node real-crypto-scan.js path /path/to/scan

# Validate specific cryptocurrency data directly
node real-crypto-scan.js direct "KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn"
```

### 3. Interactive Runner
```bash
# Launch interactive menu system
./run.sh
```
**Menu Options:**
- Run real crypto scan
- Execute validation demo
- Generate sample reports
- Run stress tests
- Launch GUI application (if available)

### 4. Generate Sample Reports
```bash
# Create sample forensic reports
node generate-sample-report.js

# Output files:
# - sample-report.json (structured data)
# - sample-report.csv (spreadsheet format)  
# - sample-report.html (visual report)
```

### 5. Performance Testing
```bash
# Run comprehensive stress tests
node run-tests.js

# Execute performance benchmarks
node stress-tests.js
```

## 🔬 Supported Cryptocurrency Formats

### Bitcoin
- **WIF Private Keys**: `KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn`
- **Legacy Addresses**: `1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2`
- **SegWit Addresses**: `bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4`
- **Nested SegWit**: `3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy`
- **Hex Private Keys**: `0c28fca386c7a227600b2fe50b7cae11ec86d3bf1fbe471be89827e19d72aa1d`

### Ethereum
- **Addresses**: `0x742d35Cc6d0C042e59C6297e6A3F7D1d9E84d3e1`
- **Private Keys**: `0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d`
- **EIP-55 Checksum**: Automatic validation and normalization

### BIP39 Mnemonics
- **12-word phrases**: `abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about`
- **24-word phrases**: Full entropy validation supported
- **Entropy calculation**: Validates seed strength
- **Address derivation**: Generates Bitcoin/Ethereum addresses from seeds

## 🛠️ Technical Architecture

### Core Components
- **CryptoEngine** - Core validation logic using production libraries
- **FileScanner** - Pattern recognition and file system traversal
- **Real Scanner** - End-to-end scanning workflow
- **Report Generator** - Multi-format output creation

### Cryptographic Libraries Used
- `bitcoinjs-lib` - Bitcoin operations and validation
- `ethers.js` - Ethereum address/key handling
- `bip39` - Mnemonic validation and seed generation
- `bip32` - HD wallet derivation paths
- `tiny-secp256k1` - Elliptic curve cryptography
- `ecpair` - Bitcoin key pair operations

## 📊 Output Formats

### JSON Report
```json
{
  "scan_summary": {
    "total_files_scanned": 1250,
    "artifacts_found": 15,
    "high_confidence": 8,
    "medium_confidence": 4,
    "low_confidence": 3
  },
  "findings": [
    {
      "type": "bitcoin_wif",
      "value": "KwDiBf89...",
      "confidence": 0.95,
      "derived_address": "1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH"
    }
  ]
}
```

### CSV Report
```csv
Type,Value,Confidence,File_Path,Line_Number,Derived_Address
bitcoin_wif,KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn,0.95,/path/to/file,42,1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH
```

### HTML Report
Professional visual report with:
- Executive summary
- Detailed findings table
- Confidence distribution charts
- Technical validation details

## 🔍 Confidence Scoring System

- **High (0.8-1.0)**: Validated by crypto libraries with proper checksums
- **Medium (0.5-0.79)**: Pattern matches with context clues
- **Low (0.1-0.49)**: Weak pattern matches requiring manual review

## ⚠️ Security Considerations

### Privacy Protection
- **No Network Communication** - All validation performed locally
- **No Key Storage** - Private keys never saved to disk
- **Secure Memory** - Sensitive data cleared after processing

### Forensic Best Practices
- Run from isolated environment
- Create forensic images before scanning
- Document all findings with timestamps
- Verify results with multiple validation methods

## 🚨 Legal and Ethical Use

### Intended Use Cases
- Security research and penetration testing
- Digital forensics investigations
- Cryptocurrency recovery services
- Educational and training purposes
- Personal key validation and recovery

### Important Disclaimers
- **Authorization Required** - Only scan systems you own or have explicit permission to examine
- **Privacy Compliance** - Follow applicable data protection regulations
- **No Warranty** - Tool provided as-is for legitimate security purposes only
- **Legal Responsibility** - Users responsible for compliance with local laws

## 🤝 Contributing

We welcome contributions! Areas for improvement:
- Additional cryptocurrency format support
- Enhanced pattern recognition
- Performance optimizations
- New output formats
- Documentation improvements

## 🔧 Troubleshooting

### Common Issues

**"Module not found" errors**
```bash
npm install bitcoinjs-lib ethers bip39 bip32 tiny-secp256k1
```

**Permission denied on scripts**
```bash
chmod +x *.sh *.js
```

**Slow scanning performance**
```bash
# Use targeted scanning instead of full system scan
node real-crypto-scan.js path /specific/directory
```

**Invalid validation results**
```bash
# Verify with demo mode first
node demo-crypto-validation.js
```

## 📄 License

This project is open source and available for legitimate security research and educational purposes.

## 🔗 Resources

- [Bitcoin Developer Documentation](https://developer.bitcoin.org/)
- [Ethereum Developer Docs](https://ethereum.org/developers/)
- [BIP39 Standard](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)
- [Cryptographic Standards](https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines)

---

**⚡ Professional Cryptocurrency Forensics Made Simple**

*This tool performs real cryptocurrency validation using production-grade libraries - no fake demos or sample data!*
