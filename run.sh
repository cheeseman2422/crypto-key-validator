#!/bin/bash
echo "🔐 CryptoKeyFinder - Real Crypto Validation"
echo "==========================================="
echo ""
echo "Choose an option:"
echo "1. Demo real crypto validation"
echo "2. Run file system scanner"
echo "3. Start Electron GUI"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo "🔬 Running real crypto validation demo..."
        node demo-crypto-validation.js
        ;;
    2)
        echo "🔍 Running real crypto scanner..."
        node real-crypto-scan.js
        ;;
    3)
        echo "🚀 Starting Electron GUI..."
        cd app-electron && npm start
        ;;
    *)
        echo "❌ Invalid choice. Running demo..."
        node demo-crypto-validation.js
        ;;
esac
