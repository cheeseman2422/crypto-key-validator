#!/usr/bin/env node

// Quick test of enhanced Bitcoin pattern detection
const testPatterns = {
  // Bitcoin addresses to test
  bitcoin_address_legacy: ['1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'],
  bitcoin_address_p2sh: ['3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy'],
  bitcoin_address_bech32: ['bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'],
  bitcoin_address_taproot: ['bc1pxwww0ct9ue7e8tdnlmug5m2tamfn7q06sahstg39ys4c9f3340qqxrz8k'],
  bitcoin_testnet_address: ['mzBc4XEFSdzCDkTxwp9vQ7S03f1hzg7BZK', 'tb1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'],
  
  // Private keys to test
  bitcoin_private_key_wif: ['5KJvsngHeMpm884wtkJNzQGaCErckhHJBGFsvd3VyK5qMZXj3hS'],
  bitcoin_extended_key_xprv: ['xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi'],
  
  // Seed phrases to test
  bitcoin_seed_phrase_12: ['abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'],
  bitcoin_seed_phrase_24: ['abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art'],
  
  // BIP38 encrypted
  bitcoin_bip38_encrypted_key: ['6PYLtMnXvfG3oJde97zRyLYFZCYizPU5T3LwgdYJz1fRhh16bU7u6PPmY7']
};

const patterns = {
  bitcoin_address_legacy: [/\b1[a-km-zA-HJ-NP-Z1-9]{25,34}\b/g],
  bitcoin_address_p2sh: [/\b3[a-km-zA-HJ-NP-Z1-9]{25,34}\b/g],
  bitcoin_address_bech32: [/\bbc1q[a-z0-9]{38,62}\b/g],
  bitcoin_address_taproot: [/\bbc1p[a-z0-9]{56,58}\b/g],
  bitcoin_testnet_address: [/\b[mn][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g, /\b2[a-km-zA-HJ-NP-Z1-9]{25,34}\b/g, /\btb1[a-z0-9]{38,62}\b/g],
  bitcoin_private_key_wif: [/\b5[1-9A-HJ-NP-Za-km-z]{50}\b/g, /\b[KL][1-9A-HJ-NP-Za-km-z]{51}\b/g],
  bitcoin_extended_key_xprv: [/\bxprv[1-9A-HJ-NP-Za-km-z]{107,108}\b/g],
  bitcoin_seed_phrase_12: [/\b(?:[a-z]{3,8}\s+){11}[a-z]{3,8}\b/gi],
  bitcoin_seed_phrase_24: [/\b(?:[a-z]{3,8}\s+){23}[a-z]{3,8}\b/gi],
  bitcoin_bip38_encrypted_key: [/\b6P[1-9A-HJ-NP-Za-km-z]{56}\b/g]
};

console.log('🔍 Testing Enhanced Bitcoin Pattern Detection\n');

let totalTests = 0;
let passedTests = 0;

for (const [patternName, testCases] of Object.entries(testPatterns)) {
  console.log(`Testing ${patternName}:`);
  
  const patternList = patterns[patternName];
  if (!patternList) {
    console.log(`  ❌ No patterns defined for ${patternName}`);
    continue;
  }
  
  for (const testCase of testCases) {
    totalTests++;
    let matched = false;
    
    for (const pattern of patternList) {
      if (pattern.test(testCase)) {
        matched = true;
        break;
      }
    }
    
    if (matched) {
      console.log(`  ✅ ${testCase.substring(0, 20)}...`);
      passedTests++;
    } else {
      console.log(`  ❌ ${testCase.substring(0, 20)}... (FAILED)`);
    }
  }
  console.log('');
}

console.log(`\n📊 Test Results: ${passedTests}/${totalTests} patterns matched correctly`);

if (passedTests === totalTests) {
  console.log('✅ All enhanced Bitcoin patterns working correctly!');
  process.exit(0);
} else {
  console.log('❌ Some patterns failed - needs debugging');
  process.exit(1);
}
