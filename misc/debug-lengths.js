#!/usr/bin/env node

const testCases = [
  { type: 'taproot', value: 'bc1pxwww0ct9ue7e8tdnlmug5m2tamfn7q06sahstg39ys4c9f3340qqxrz8k' },
  { type: 'testnet', value: 'mzBc4XEFSdzCDkTxwp9vQ7S03f1hzg7BZK' }
];

for (const test of testCases) {
  console.log(`${test.type}:`);
  console.log(`  Full: ${test.value}`);
  console.log(`  Length: ${test.value.length}`);
  
  if (test.type === 'taproot') {
    const afterPrefix = test.value.substring(4); // Remove "bc1p"
    console.log(`  After bc1p: ${afterPrefix}`);
    console.log(`  After prefix length: ${afterPrefix.length}`);
  }
  
  if (test.type === 'testnet') {
    const afterPrefix = test.value.substring(1); // Remove "m"  
    console.log(`  After m: ${afterPrefix}`);
    console.log(`  After prefix length: ${afterPrefix.length}`);
  }
  
  console.log('');
}
