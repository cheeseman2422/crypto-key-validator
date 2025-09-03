# Application Icons

For production builds, add the following icon files to this directory:

## Required Icon Files:
- `icon.png` - 512x512 PNG (main application icon)
- `icon.ico` - Windows ICO format (16x16, 32x32, 48x48, 256x256)
- `icon.icns` - Mac ICNS format
- `tray.png` - 16x16 PNG (system tray icon)
- `tray@2x.png` - 32x32 PNG (high-DPI tray icon)

## Icon Design Guidelines:
- Use a cryptocurrency/security theme
- Include Bitcoin logo or key/lock symbols
- Ensure readability at small sizes
- Use consistent color scheme matching the app theme
- Consider using: 🔑 🔒 ₿ 🛡️ 🔍

## Icon Sizes for Different Platforms:

### Linux (AppImage/DEB/RPM):
- 512x512 PNG (main icon)
- 256x256 PNG
- 128x128 PNG
- 64x64 PNG
- 32x32 PNG
- 16x16 PNG

### Windows (NSIS/Portable):
- ICO file with embedded sizes: 16, 32, 48, 256
- 512x512 PNG for installer

### macOS (DMG):
- ICNS file with multiple sizes
- 512x512 PNG for DMG background

## Generating Icons:
You can use tools like:
- ImageMagick: `convert icon-512.png -resize 256x256 icon-256.png`
- Online converters for ICO/ICNS formats
- Electron Icon Maker tools
