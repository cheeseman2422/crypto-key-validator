#!/bin/bash

echo "🚀 CryptoKeyFinder Launcher"
echo "=========================="
echo ""

# Check if we're in the right directory
if [ ! -d "app-electron" ]; then
    echo "❌ Error: Please run from CryptoKeyValidator directory"
    exit 1
fi

echo "🔍 Checking application status..."
echo ""

# Check key files
echo "✅ Main process: $(ls app-electron/main.js 2>/dev/null && echo "EXISTS" || echo "MISSING")"
echo "✅ HTML renderer: $(ls app-electron/src/renderer/index.html 2>/dev/null && echo "EXISTS" || echo "MISSING")" 
echo "✅ Package config: $(ls app-electron/package.json 2>/dev/null && echo "EXISTS" || echo "MISSING")"
echo "✅ Sample reports: $(ls sample-report.html 2>/dev/null && echo "EXISTS" || echo "MISSING")"

echo ""
echo "💎 CryptoKeyFinder Application Features:"
echo "   🔐 Bitcoin, Ethereum, Litecoin validation"
echo "   🔑 BIP39 seed phrase validation"
echo "   📊 Professional forensic reports (JSON, CSV, HTML, TXT)"
echo "   🛡️ Offline balance checking capability"
echo "   🎨 Modern desktop interface"
echo "   🔒 Security-first architecture"

echo ""
echo "🔄 Starting CryptoKeyFinder..."
echo ""

# Change to app directory and launch
cd app-electron

# Check if node_modules exists, install if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Launch the application
echo "🚀 Launching CryptoKeyFinder Desktop Application..."
npm start

echo ""
echo "✨ CryptoKeyFinder session complete!"
