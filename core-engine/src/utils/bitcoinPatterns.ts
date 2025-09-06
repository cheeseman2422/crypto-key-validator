/**
 * Shared Bitcoin regex patterns and wallet type definitions for artifact detection
 */

export const bitcoinPatterns = {
  legacyAddress: /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g,
  bech32Address: /\bbc1[a-z0-9]{39,59}\b/g,
  taprootAddress: /\bbc1p[a-z0-9]{58}\b/g,
  wifPrivateKey: /\b[5KL][1-9A-HJ-NP-Za-km-z]{50,51}\b/g,
  hexPrivateKey: /\b[a-fA-F0-9]{64}\b/g,
  seedPhrase: /\b([a-z]{3,8}\s+){11,23}[a-z]{3,8}\b/gi,
  walletSignatures: {
    bitcoin: /wallet\.dat|Bitcoin.*wallet/i,
    electrum: /electrum.*wallet|\.wallet/i,
    multibit: /multibit.*wallet|\.wallet/i,
    blockchain: /blockchain.*wallet/i
  }
};

export const bitcoinWalletTypes = [
  { name: 'Bitcoin Core Legacy', files: ['wallet.dat'], dirs: ['wallets'], crypto: 'bitcoin' },
  { name: 'Bitcoin Core Descriptor', extensions: ['.dat'], patterns: ['wallet_'], crypto: 'bitcoin' },
  { name: 'Electrum', files: ['default_wallet'], extensions: ['.wallet'], crypto: 'bitcoin' },
  { name: 'Bitcoin Exchange Export', extensions: ['.csv'], patterns: ['bitcoin', 'btc'], crypto: 'bitcoin' },
  { name: 'Blockchain.info Backup', extensions: ['.aes'], patterns: ['blockchain'], crypto: 'bitcoin' }
];
