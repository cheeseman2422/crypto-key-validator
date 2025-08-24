#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

function runNodeScript(script, args = []) {
  const scriptPath = path.join(__dirname, script);
  const child = spawn(process.execPath, [scriptPath, ...args], { stdio: 'inherit' });
  child.on('exit', (code) => process.exit(code));
}

function printHelp() {
  console.log(`\nCrypto Key Validator (ckv) - CLI\n\nUsage:\n  ckv demo                      Run validation demo\n  ckv scan [mode|path <dir>|direct <input>]\n                                Run real scanner (modes: quick [default], full, path, direct)\n  ckv report                    Generate sample reports (HTML/JSON/CSV)\n  ckv validate <input>          Validate a single key/address/mnemonic\n  ckv help                      Show this help\n\nExamples:\n  ckv scan                      # Quick scan (Documents/Desktop/Downloads)\n  ckv scan full                 # Full home directory scan\n  ckv scan path /data           # Scan specific path\n  ckv scan direct "KwDiBf89..." # Validate input directly via scanner\n  ckv validate "abandon ..."    # Validate mnemonic\n  ckv demo                      # Run demo suite\n`);
}

const [cmd, ...rest] = process.argv.slice(2);

switch ((cmd || 'scan').toLowerCase()) {
  case 'demo':
    runNodeScript('demo-crypto-validation.js', rest);
    break;
  case 'scan': {
    const [mode, ...args] = rest;
    if (!mode || mode === 'quick') {
      runNodeScript('real-crypto-scan.js', []);
    } else if (mode === 'full') {
      runNodeScript('real-crypto-scan.js', ['full']);
    } else if (mode === 'path' && args[0]) {
      runNodeScript('real-crypto-scan.js', ['path', args[0]]);
    } else if (mode === 'direct' && args.length) {
      runNodeScript('real-crypto-scan.js', ['direct', ...args]);
    } else {
      printHelp();
    }
    break;
  }
  case 'report':
    runNodeScript('generate-sample-report.js', rest);
    break;
  case 'validate':
    if (!rest.length) {
      console.error('Error: Missing input to validate');
      printHelp();
      process.exit(1);
    }
    // Reuse demo validator path that calls real engine
    runNodeScript('demo-crypto-validation.js', []);
    console.log('\nTip: For direct validation, you can also use:');
    console.log('  ckv scan direct <input>');
    break;
  case 'help':
  default:
    printHelp();
}

