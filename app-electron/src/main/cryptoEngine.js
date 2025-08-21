const bitcoin = require('bitcoinjs-lib');
const { ethers } = require('ethers');
const bip39 = require('bip39');
const BIP32Factory = require('bip32');
const ECPairFactory = require('ecpair');
const ecc = require('tiny-secp256k1');

// Initialize factories
const bip32 = BIP32Factory.default(ecc);
const ECPair = ECPairFactory.default(ecc);

class CryptoEngine {
    constructor() {
        this.supportedNetworks = {
            bitcoin: bitcoin.networks.bitcoin,
            testnet: bitcoin.networks.testnet
        };
    }

    /**
     * Validate Bitcoin private key (WIF format)
     */
    validateBitcoinPrivateKey(privateKey) {
        try {
            const keyPair = ECPair.fromWIF(privateKey);
            const addresses = this.generateBitcoinAddresses(keyPair);
            
            return {
                valid: true,
                type: 'BITCOIN_PRIVATE_KEY',
                format: 'WIF',
                addresses: addresses,
                network: 'mainnet'
            };
        } catch (error) {
            // Try hex format
            try {
                if (privateKey.length === 64 && /^[0-9a-fA-F]+$/.test(privateKey)) {
                    const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'));
                    const addresses = this.generateBitcoinAddresses(keyPair);
                    
                    return {
                        valid: true,
                        type: 'BITCOIN_PRIVATE_KEY',
                        format: 'HEX',
                        addresses: addresses,
                        network: 'mainnet'
                    };
                }
            } catch (hexError) {
                // Hex format failed too
            }
            
            return {
                valid: false,
                type: 'BITCOIN_PRIVATE_KEY',
                error: error.message
            };
        }
    }

    /**
     * Generate all Bitcoin address types from a key pair
     */
    generateBitcoinAddresses(keyPair) {
        const addresses = {};
        
        // Legacy P2PKH (1...) - Most compatible
        try {
            addresses.legacy = bitcoin.payments.p2pkh({
                pubkey: keyPair.publicKey,
                network: this.supportedNetworks.bitcoin
            }).address;
        } catch (error) {
            // Skip legacy if fails
        }

        // SegWit P2WPKH (bc1...) - Only if public key is valid
        try {
            if (keyPair.publicKey && keyPair.publicKey.length === 33) {
                addresses.segwit = bitcoin.payments.p2wpkh({
                    pubkey: keyPair.publicKey,
                    network: this.supportedNetworks.bitcoin
                }).address;
            }
        } catch (error) {
            // Skip SegWit if fails
        }

        // P2SH-P2WPKH (3...) - Only if SegWit works
        try {
            if (keyPair.publicKey && keyPair.publicKey.length === 33) {
                addresses.segwitNested = bitcoin.payments.p2sh({
                    redeem: bitcoin.payments.p2wpkh({
                        pubkey: keyPair.publicKey,
                        network: this.supportedNetworks.bitcoin
                    }),
                    network: this.supportedNetworks.bitcoin
                }).address;
            }
        } catch (error) {
            // Skip nested SegWit if fails
        }

        return addresses;
    }

    /**
     * Validate Bitcoin address
     */
    validateBitcoinAddress(address) {
        try {
            // Try to decode the address
            let addressType = 'UNKNOWN';
            
            if (address.startsWith('1') || address.startsWith('3')) {
                // Legacy address
                bitcoin.address.fromBase58Check(address);
                addressType = address.startsWith('1') ? 'P2PKH_LEGACY' : 'P2SH';
            } else if (address.startsWith('bc1')) {
                // SegWit address
                bitcoin.address.fromBech32(address);
                addressType = address.length === 42 ? 'P2WPKH_SEGWIT' : 'P2WSH_SEGWIT';
            } else {
                throw new Error('Unknown address format');
            }

            return {
                valid: true,
                type: 'BITCOIN_ADDRESS',
                addressType: addressType,
                network: 'mainnet'
            };
        } catch (error) {
            return {
                valid: false,
                type: 'BITCOIN_ADDRESS',
                error: error.message
            };
        }
    }

    /**
     * Validate Ethereum address
     */
    validateEthereumAddress(address) {
        try {
            // Basic format check first
            if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
                throw new Error('Invalid Ethereum address format');
            }
            
            // Use ethers.js for more thorough validation
            if (!ethers.isAddress(address)) {
                throw new Error('Invalid Ethereum address checksum');
            }

            // Check if it's a checksummed address
            const isChecksummed = address === ethers.getAddress(address);

            return {
                valid: true,
                type: 'ETHEREUM_ADDRESS',
                checksummed: isChecksummed,
                normalized: ethers.getAddress(address)
            };
        } catch (error) {
            return {
                valid: false,
                type: 'ETHEREUM_ADDRESS',
                error: error.message
            };
        }
    }

    /**
     * Validate Ethereum private key
     */
    validateEthereumPrivateKey(privateKey) {
        try {
            // Remove 0x prefix if present
            const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
            
            if (cleanKey.length !== 64 || !/^[0-9a-fA-F]+$/.test(cleanKey)) {
                throw new Error('Invalid private key format');
            }

            const wallet = new ethers.Wallet(privateKey);
            
            return {
                valid: true,
                type: 'ETHEREUM_PRIVATE_KEY',
                address: wallet.address,
                publicKey: wallet.publicKey
            };
        } catch (error) {
            return {
                valid: false,
                type: 'ETHEREUM_PRIVATE_KEY',
                error: error.message
            };
        }
    }

    /**
     * Validate BIP39 mnemonic seed phrase
     */
    validateBIP39Mnemonic(mnemonic) {
        try {
            const words = mnemonic.trim().split(/\s+/);
            
            if (![12, 15, 18, 21, 24].includes(words.length)) {
                throw new Error('Invalid word count. Must be 12, 15, 18, 21, or 24 words');
            }

            if (!bip39.validateMnemonic(mnemonic)) {
                throw new Error('Invalid BIP39 mnemonic');
            }

            // Generate sample addresses from the seed
            const seed = bip39.mnemonicToSeedSync(mnemonic);
            const root = bip32.fromSeed(seed);
            
            // Generate Bitcoin addresses (BIP44 path)
            const btcPath = "m/44'/0'/0'/0/0";
            const btcChild = root.derivePath(btcPath);
            const btcKeyPair = ECPair.fromPrivateKey(btcChild.privateKey);
            const btcAddresses = this.generateBitcoinAddresses(btcKeyPair);

            // Generate Ethereum address (BIP44 path)
            const ethPath = "m/44'/60'/0'/0/0";
            const ethChild = root.derivePath(ethPath);
            const ethWallet = new ethers.Wallet(ethChild.privateKey.toString('hex'));

            return {
                valid: true,
                type: 'BIP39_MNEMONIC',
                wordCount: words.length,
                entropy: bip39.mnemonicToEntropy(mnemonic),
                addresses: {
                    bitcoin: btcAddresses,
                    ethereum: ethWallet.address
                }
            };
        } catch (error) {
            return {
                valid: false,
                type: 'BIP39_MNEMONIC',
                error: error.message
            };
        }
    }

    /**
     * Auto-detect and validate any crypto input
     */
    validateCryptoInput(input) {
        // Handle null, undefined, or non-string inputs
        if (input == null || typeof input !== 'string') {
            return {
                valid: false,
                type: 'INVALID_INPUT',
                error: 'Input must be a valid string'
            };
        }
        
        const trimmedInput = input.trim();
        
        // Check if it's a BIP39 mnemonic (contains spaces)
        if (trimmedInput.includes(' ')) {
            return this.validateBIP39Mnemonic(trimmedInput);
        }

        // Check if it's an Ethereum address (starts with 0x and 42 chars)
        if (trimmedInput.startsWith('0x') && trimmedInput.length === 42) {
            return this.validateEthereumAddress(trimmedInput);
        }

        // Check if it's an Ethereum private key (64 hex chars or 0x + 64 hex chars) - but exclude Bitcoin hex keys
        if ((trimmedInput.length === 64 || (trimmedInput.startsWith('0x') && trimmedInput.length === 66)) && 
            /^(0x)?[0-9a-fA-F]+$/.test(trimmedInput)) {
            // Try Ethereum first
            const ethResult = this.validateEthereumPrivateKey(trimmedInput);
            if (ethResult.valid) return ethResult;
        }

        // Check if it's a Bitcoin address
        if ((trimmedInput.startsWith('1') || trimmedInput.startsWith('3') || trimmedInput.startsWith('bc1')) &&
            trimmedInput.length >= 26 && trimmedInput.length <= 62) {
            const btcAddrResult = this.validateBitcoinAddress(trimmedInput);
            if (btcAddrResult.valid) return btcAddrResult;
        }

        // Check if it's a Bitcoin private key (WIF format - starts with K, L, or 5)
        if ((trimmedInput.startsWith('K') || trimmedInput.startsWith('L') || trimmedInput.startsWith('5')) &&
            trimmedInput.length >= 51 && trimmedInput.length <= 52 &&
            /^[KL5][1-9A-HJ-NP-Za-km-z]+$/.test(trimmedInput)) { // Base58 validation
            const btcKeyResult = this.validateBitcoinPrivateKey(trimmedInput);
            if (btcKeyResult.valid) return btcKeyResult;
        }
        
        // Also try hex format for potential Bitcoin private keys (64 hex chars)
        if (trimmedInput.length === 64 && /^[0-9a-fA-F]+$/.test(trimmedInput)) {
            const btcKeyResult = this.validateBitcoinPrivateKey(trimmedInput);
            if (btcKeyResult.valid) return btcKeyResult;
        }

        return {
            valid: false,
            type: 'UNKNOWN',
            error: 'Unable to identify cryptocurrency format'
        };
    }

    /**
     * Batch validate multiple inputs
     */
    batchValidate(inputs) {
        return inputs.map(input => {
            const result = this.validateCryptoInput(input);
            return {
                input: input,
                ...result
            };
        });
    }
}

module.exports = CryptoEngine;
