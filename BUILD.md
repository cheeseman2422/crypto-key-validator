# Production Build Guide

This guide covers how to create production-ready distributions of the Crypto Key Validator application.

## Build System Overview

The application uses a sophisticated build system that includes:
- **Automated validation** of prerequisites and dependencies
-- **Multi-platform support** (Linux, Windows, macOS)
-- **Multiple package formats** (AppImage, DEB, RPM, Snap, NSIS, DMG)
-- **Post-build testing** to ensure functionality
-- **Comprehensive reporting** with build metrics

## Quick Start

### Basic Build Commands

```bash
pnpm run dist # Bitcoin-only validator

# Build specific formats
pnpm run build:appimage  # Linux AppImage
pnpm run build:deb      # Debian package
pnpm run build:rpm      # Red Hat package
pnpm run build:snap     # Ubuntu Snap
pnpm run build:win      # Windows NSIS installer + portable
pnpm run build:mac      # macOS DMG + ZIP

# Build for all platforms
pnpm run build:all
```

### Production Build Script

For enhanced validation and reporting, use the production build script:

```bash
# Linux production build with validation
pnpm run build:production

# Specific format with validation
pnpm run build:production:appimage
pnpm run build:production:deb

# Or use the script directly
node scripts/build-production.js [target]
```

Available targets: `linux`, `appimage`, `deb`, `rpm`, `snap`, `win`, `mac`, `all`

## Build Requirements

### System Prerequisites

- **Node.js**: Version 16.x or higher
- **pnpm**: Latest version recommended
- **Python**: For native dependencies (node-gyp)
- **Build tools**: 
  - Linux: `build-essential`
  - Windows: Visual Studio Build Tools
  - macOS: Xcode Command Line Tools

### Platform-Specific Requirements

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get install build-essential libnss3-dev libatk-bridge2.0-dev libdrm2 libgtk-3-dev
```

#### Linux (CentOS/RHEL/Fedora)
```bash
sudo yum groupinstall "Development Tools"
sudo yum install nss-devel atk-devel gtk3-devel
```

#### Windows
- Visual Studio 2019 Build Tools or newer
- Windows SDK

#### macOS
- Xcode Command Line Tools
- For code signing: Apple Developer account and certificates

## Build Configuration

The build is configured in `package.json` under the `build` section:

### Key Configuration Options

```json
{
  "build": {
    "appId": "com.forensics.crypto-key-validator",
    "productName": "Crypto Key Validator",
    "compression": "maximum",
    "directories": {
      "output": "dist-packages",
      "buildResources": "build-resources"
    }
  }
}
```

### Customization

- **Application ID**: Change `appId` for different distributions
- **Product Name**: Modify `productName` for branding
- **Output Directory**: Change `directories.output` for different output path
- **Compression**: Options are `store`, `normal`, `maximum`

## Build Artifacts

### Linux Builds

| Format | Description | Size | Installation |
|--------|-------------|------|--------------|
| **AppImage** | Universal Linux binary | ~150MB | `chmod +x *.AppImage && ./app.AppImage` |
| **DEB** | Debian/Ubuntu package | ~50MB | `sudo dpkg -i *.deb` |
| **RPM** | Red Hat/Fedora package | ~50MB | `sudo rpm -i *.rpm` |
| **Snap** | Ubuntu Snap package | ~60MB | `sudo snap install *.snap --dangerous` |

### Windows Builds

| Format | Description | Size | Installation |
|--------|-------------|------|--------------|
| **NSIS** | Windows installer | ~60MB | Run `.exe` installer |
| **Portable** | Portable executable | ~150MB | Extract and run |

### macOS Builds

| Format | Description | Size | Installation |
|--------|-------------|------|--------------|
| **DMG** | macOS disk image | ~80MB | Mount and drag to Applications |
| **ZIP** | Compressed app bundle | ~60MB | Extract to Applications folder |

## Icons and Assets

### Icon Requirements

Add these files to `build-resources/`:

- `icon.png` - 512x512 main application icon
- `icon.ico` - Windows ICO format
- `icon.icns` - macOS ICNS format
- `tray.png` - 16x16 system tray icon
- `tray@2x.png` - 32x32 high-DPI tray icon

### Creating Icons

1. **Design a 512x512 PNG** with your application logo
2. **Use online converters** or tools like ImageMagick:
   ```bash
   # Create ICO file
   convert icon.png -define icon:auto-resize=256,64,48,32,16 icon.ico
   
   # Create smaller sizes
   convert icon.png -resize 256x256 icon-256.png
   convert icon.png -resize 16x16 tray.png
   ```

## Build Validation

The production build script performs comprehensive validation:

### Pre-Build Checks ✅

- Verifies Node.js version compatibility
- Ensures all required directories exist
- Validates package.json configuration
- Checks for application icons (warns if missing)
- Confirms dependencies are installed

### Post-Build Testing 🧪

- Tests core engine initialization
- Validates Bitcoin address processing
- Verifies artifact validation functionality
- Checks build artifact integrity
- Measures performance metrics

### Build Reporting 📊

After each build, a detailed report is generated (`build-report.json`):

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "buildTime": "45.2s",
  "nodeVersion": "v18.17.0",
  "platform": "linux",
  "success": true,
  "artifacts": [
    {
      "name": "Crypto Key Validator-1.0.0.AppImage",
      "sizeFormatted": "147.3 MB"
    }
  ],
  "warnings": [],
  "errors": []
}
```

## Troubleshooting

### Common Issues

#### 1. "Missing required directory" Error
```bash
# Solution: Build the application first
pnpm run build
```

#### 2. "electron-builder not found"
```bash
# Solution: Install dependencies
pnpm install
```

#### 3. "Native dependencies failed"
```bash
# Solution: Rebuild native modules
pnpm run rebuild
# or
npm rebuild
```

#### 4. "Code signing failed" (macOS)
```bash
# Solution: Disable code signing for development
export CSC_IDENTITY_AUTO_DISCOVERY=false
```

#### 5. Permission errors on Linux
```bash
# Solution: Fix permissions
chmod +x dist-packages/*.AppImage
```

### Build Performance

| System | Typical Build Time | Memory Usage |
|--------|-------------------|--------------|
| Linux (8GB RAM, SSD) | 30-60 seconds | ~2GB |
| Windows (16GB RAM) | 45-90 seconds | ~3GB |
| macOS (M1, 16GB) | 25-45 seconds | ~2GB |

### Optimizing Build Speed

1. **Use SSD storage** for faster I/O
2. **Close other applications** to free up memory
3. **Use `compression: "normal"`** instead of maximum
4. **Exclude unnecessary files** in build configuration
5. **Cache node_modules** between builds

## Distribution

### Linux Distribution

#### AppImage (Recommended)
- **Pros**: Universal, no installation required, portable
- **Cons**: Larger file size, no automatic updates
- **Best for**: General distribution, development testing

#### DEB Packages
- **Pros**: Native package management, smaller size
- **Cons**: Debian/Ubuntu only
- **Best for**: Debian/Ubuntu users, enterprise deployment

#### RPM Packages
- **Pros**: Native package management, Red Hat ecosystem
- **Cons**: RHEL/Fedora/CentOS only
- **Best for**: Red Hat enterprise environments

#### Snap Packages
- **Pros**: Sandboxed, automatic updates, cross-distro
- **Cons**: Slower startup, requires snapd
- **Best for**: Ubuntu users, security-conscious deployment

### Windows Distribution

#### NSIS Installer (Recommended)
- **Pros**: Professional installer, system integration
- **Cons**: Requires administrator privileges
- **Best for**: End-user distribution

#### Portable Version
- **Pros**: No installation required, works on locked systems
- **Cons**: No system integration, larger size
- **Best for**: Forensics work, restricted environments

### macOS Distribution

#### DMG (Recommended)
- **Pros**: Native macOS experience, easy installation
- **Cons**: Requires developer certificate for distribution
- **Best for**: Mac App Store or direct distribution

## Security Considerations

### Code Signing

For production distribution:

#### Windows
```bash
# Set certificate details
export CSC_LINK="path/to/certificate.p12"
export CSC_KEY_PASSWORD="certificate_password"
```

#### macOS
```bash
# Set Apple Developer details
export CSC_LINK="Developer ID Application: Your Name (TEAMID)"
export CSC_KEY_PASSWORD="keychain_password"
```

### Notarization (macOS)

For macOS Catalina and later:
```bash
export APPLE_ID="your-apple-id@email.com"
export APPLE_ID_PASS="app-specific-password"
export APPLE_TEAM_ID="your-team-id"
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Build and Release

on:
  push:
    tags: ['v*']

jobs:
  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm run build:production:appimage
      - uses: actions/upload-artifact@v3
        with:
          name: linux-builds
          path: dist-packages/
```

## Version Management

Update version in multiple locations:
1. `package.json` - Main version
2. `app-electron/package.json` - Electron app version  
3. `core-engine/package.json` - Core engine version

Use consistent versioning:
```bash
# Update all package versions
pnpm version patch  # or minor, major
```

## Release Checklist

- [ ] Update version numbers
- [ ] Update CHANGELOG.md
- [ ] Test core functionality
- [ ] Run full build suite
- [ ] Test on target platforms
- [ ] Verify installer/package functionality
- [ ] Check application starts correctly
- [ ] Validate Bitcoin address processing
- [ ] Test filesystem scanning
- [ ] Review build report
- [ ] Create GitHub release
- [ ] Upload build artifacts
- [ ] Update documentation

---

## Support

For build issues:
1. Check this documentation
2. Review build logs in `build-report.json`
3. Enable verbose logging: `DEBUG=electron-builder pnpm run build`
4. Create GitHub issue with build logs and system information
