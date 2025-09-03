#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('📊 Crypto Key Validator - Sample Report Generator\n');

// Sample data structure matching our artifacts
const sampleData = {
  reportMetadata: {
    generatedAt: new Date().toISOString(),
    tool: 'Crypto Key Validator',
    version: '1.0.0',
    scanType: 'sample_data',
    bitcoinOnly: true
  },
  summary: {
    totalArtifacts: 4,
    validArtifacts: 4,
    addressCount: 2,
    privateKeyCount: 1,
    seedPhraseCount: 1,
    balanceTotal: 'N/A (offline mode)'
  },
  artifacts: [
    {
      id: 'sample-001',
      type: 'address',
      subtype: 'Legacy Address (P2PKH/P2SH)',
      raw: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      validationStatus: 'valid',
      metadata: {
        cryptocurrency: { name: 'Bitcoin', symbol: 'BTC', network: 'mainnet' },
        confidence: 0.95,
        addressType: 'P2PKH'
      },
      source: { type: 'direct_input', path: 'sample_data' },
      createdAt: new Date().toISOString()
    },
    {
      id: 'sample-002', 
      type: 'address',
      subtype: 'Taproot Address (P2TR)',
      raw: 'bc1p***truncated***',
      validationStatus: 'valid',
      metadata: {
        cryptocurrency: { name: 'Bitcoin', symbol: 'BTC', network: 'mainnet' },
        confidence: 0.98,
        addressType: 'P2TR'
      },
      source: { type: 'direct_input', path: 'sample_data' },
      createdAt: new Date().toISOString()
    },
    {
      id: 'sample-003',
      type: 'private_key', 
      subtype: 'WIF Private Key',
      raw: '5***truncated***', // Truncated for security
      validationStatus: 'valid',
      metadata: {
        cryptocurrency: { name: 'Bitcoin', symbol: 'BTC', network: 'mainnet' },
        confidence: 0.99
      },
      source: { type: 'file_system', path: '/sample/wallet.dat' },
      createdAt: new Date().toISOString()
    },
    {
      id: 'sample-004',
      type: 'seed_phrase',
      subtype: 'BIP39 Seed Phrase (12 words)',
      raw: 'abandon abandon ***truncated***', // Truncated for security
      validationStatus: 'valid', 
      metadata: {
        cryptocurrency: { name: 'Bitcoin', symbol: 'BTC', network: 'mainnet' },
        confidence: 0.97,
        entropy: 128
      },
      source: { type: 'file_system', path: '/sample/recovery.txt' },
      createdAt: new Date().toISOString()
    }
  ]
};

function generateJSONReport() {
  const filename = 'sample-report.json';
  fs.writeFileSync(filename, JSON.stringify(sampleData, null, 2));
  console.log(`✅ Generated JSON report: ${filename}`);
}

function generateCSVReport() {
  const filename = 'sample-report.csv';
  const headers = 'ID,Type,Subtype,Status,Cryptocurrency,Network,Source,Created';
  const rows = sampleData.artifacts.map(artifact => 
    [
      artifact.id,
      artifact.type,
      artifact.subtype,
      artifact.validationStatus,
      artifact.metadata.cryptocurrency.name,
      artifact.metadata.cryptocurrency.network,
      artifact.source.type,
      artifact.createdAt.split('T')[0] // Date only
    ].join(',')
  );
  
  const csvContent = [headers, ...rows].join('\\n');
  fs.writeFileSync(filename, csvContent);
  console.log(`✅ Generated CSV report: ${filename}`);
}

function generateHTMLReport() {
  const filename = 'sample-report.html';
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Crypto Key Validator Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; }
        .summary { background: white; margin: 20px 0; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .artifacts { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .artifact { border: 1px solid #ddd; margin: 10px 0; padding: 10px; border-radius: 4px; }
        .valid { border-left: 4px solid #28a745; }
        .bitcoin-only { color: #f39c12; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Crypto Key Validator Report</h1>
        <p>Generated: ${sampleData.reportMetadata.generatedAt}</p>
        <p><span class="bitcoin-only">Bitcoin-Only Analysis</span> | Offline Mode</p>
    </div>
    
    <div class="summary">
        <h2>📊 Summary</h2>
        <table>
            <tr><th>Total Artifacts</th><td>${sampleData.summary.totalArtifacts}</td></tr>
            <tr><th>Valid Artifacts</th><td>${sampleData.summary.validArtifacts}</td></tr>
            <tr><th>Addresses Found</th><td>${sampleData.summary.addressCount}</td></tr>
            <tr><th>Private Keys Found</th><td>${sampleData.summary.privateKeyCount}</td></tr>
            <tr><th>Seed Phrases Found</th><td>${sampleData.summary.seedPhraseCount}</td></tr>
            <tr><th>Balance Total</th><td>${sampleData.summary.balanceTotal}</td></tr>
        </table>
    </div>
    
    <div class="artifacts">
        <h2>🔐 Artifacts Found</h2>
        ${sampleData.artifacts.map(artifact => `
            <div class="artifact valid">
                <h3>${artifact.subtype}</h3>
                <p><strong>Type:</strong> ${artifact.type}</p>
                <p><strong>Status:</strong> ${artifact.validationStatus}</p>
                <p><strong>Network:</strong> ${artifact.metadata.cryptocurrency.name} ${artifact.metadata.cryptocurrency.network}</p>
                <p><strong>Source:</strong> ${artifact.source.type}</p>
                <p><strong>Raw:</strong> ${artifact.raw}</p>
            </div>
        `).join('')}
    </div>
    
    <div class="summary">
        <h2>ℹ️ Information</h2>
        <p>This is a sample report demonstrating the output format of the Crypto Key Validator.</p>
        <p><strong>Bitcoin-Only:</strong> This tool exclusively analyzes Bitcoin artifacts and does not support other cryptocurrencies.</p>
        <p><strong>Offline Mode:</strong> Balance checking is disabled for security and offline operation.</p>
        <p><strong>Security:</strong> In real reports, private keys and seed phrases would be truncated for security.</p>
    </div>
</body>
</html>`;
  
  fs.writeFileSync(filename, html);
  console.log(`✅ Generated HTML report: ${filename}`);
}

async function generateReports() {
  console.log('🔄 Generating sample reports in multiple formats...\n');
  
  try {
    generateJSONReport();
    generateCSVReport();
    generateHTMLReport();
    
    console.log('\n📁 Files created:');
    ['sample-report.json', 'sample-report.csv', 'sample-report.html'].forEach(file => {
      if (fs.existsSync(file)) {
        const stats = fs.statSync(file);
        console.log(`   ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
      }
    });
    
    console.log('\n🎉 Sample reports generated successfully!');
    console.log('💡 Open sample-report.html in a web browser to view the formatted report.');
    
  } catch (error) {
    console.error('❌ Report generation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  generateReports().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}
