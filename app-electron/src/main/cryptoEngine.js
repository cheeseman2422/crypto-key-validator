const bitcoin = require('bitcoinjs-lib');
const bip39 = require('bip39');
const BIP32Factory = require('bip32');
const ECPairFactory = require('ecpair');
const ecc = require('tiny-secp256k1');
const bs58 = require('bs58');

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

        // SegWit P2WPKH (bc1q...) - Only if public key is valid
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

        // Taproot P2TR (bc1p...) - Only for compressed keys
        try {
            if (keyPair.publicKey && keyPair.publicKey.length === 33) {
                addresses.taproot = bitcoin.payments.p2tr({
                    internalPubkey: keyPair.publicKey.slice(1), // Remove prefix byte
                    network: this.supportedNetworks.bitcoin
                }).address;
            }
        } catch (error) {
            // Skip Taproot if fails
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
     * Validate Bitcoin extended public/private keys (xpub/xprv)
     */
    validateBitcoinExtendedKey(extKey) {
        try {
            const decoded = bs58.decode(extKey);
            if (decoded.length !== 82) {
                throw new Error('Invalid extended key length');
            }
            
            // Convert to Buffer to use readUInt32BE
            const buffer = Buffer.from(decoded);
            const version = buffer.readUInt32BE(0);
            const isPrivate = (version === 0x0488ADE4 || version === 0x04358394); // xprv/tprv
            const isPublic = (version === 0x0488B21E || version === 0x043587CF);  // xpub/tpub
            
            if (!isPrivate && !isPublic) {
                throw new Error('Invalid extended key version');
            }
            
            // Use bip32 to validate
            const node = bip32.fromBase58(extKey);
            
            return {
                valid: true,
                type: isPrivate ? 'BITCOIN_XPRV' : 'BITCOIN_XPUB',
                isPrivate: isPrivate,
                depth: node.depth,
                fingerprint: node.fingerprint.toString('hex'),
                network: version === 0x0488B21E || version === 0x0488ADE4 ? 'mainnet' : 'testnet'
            };
        } catch (error) {
            return {
                valid: false,
                type: 'BITCOIN_EXTENDED_KEY',
                error: error.message
            };
        }
    }
    
    /**
     * Validate Bitcoin PSBT (base64)
     */
    validateBitcoinPSBT(psbtBase64) {
        try {
            const psbt = bitcoin.Psbt.fromBase64(psbtBase64);
            
            return {
                valid: true,
                type: 'BITCOIN_PSBT',
                inputCount: psbt.data.inputs.length,
                outputCount: psbt.data.outputs.length
            };
        } catch (error) {
            return {
                valid: false,
                type: 'BITCOIN_PSBT',
                error: error.message
            };
        }
    }

    /**
     * Validate BIP39 mnemonic seed phrase (Bitcoin-focused)
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

            // Generate Bitcoin addresses from the seed
            const seed = bip39.mnemonicToSeedSync(mnemonic);
            const root = bip32.fromSeed(seed);
            
            // Generate Bitcoin addresses for multiple derivation paths
            const addresses = {};
            
            // BIP44 (m/44'/0'/0'/0/0)
            const btc44 = root.derivePath("m/44'/0'/0'/0/0");
            const keyPair44 = ECPair.fromPrivateKey(btc44.privateKey);
            addresses.bip44 = this.generateBitcoinAddresses(keyPair44);
            
            // BIP49 SegWit (m/49'/0'/0'/0/0)
            const btc49 = root.derivePath("m/49'/0'/0'/0/0");
            const keyPair49 = ECPair.fromPrivateKey(btc49.privateKey);
            addresses.bip49 = this.generateBitcoinAddresses(keyPair49);
            
            // BIP84 Native SegWit (m/84'/0'/0'/0/0)
            const btc84 = root.derivePath("m/84'/0'/0'/0/0");
            const keyPair84 = ECPair.fromPrivateKey(btc84.privateKey);
            addresses.bip84 = this.generateBitcoinAddresses(keyPair84);

            return {
                valid: true,
                type: 'BIP39_MNEMONIC',
                wordCount: words.length,
                entropy: bip39.mnemonicToEntropy(mnemonic),
                addresses: addresses
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
     * Auto-detect and validate Bitcoin-only input
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

        // Check if it's a Bitcoin address (1, 3, bc1q, bc1p)
        if ((trimmedInput.startsWith('1') || trimmedInput.startsWith('3') || trimmedInput.startsWith('bc1')) &&
            trimmedInput.length >= 26 && trimmedInput.length <= 62) {
            const btcAddrResult = this.validateBitcoinAddress(trimmedInput);
            if (btcAddrResult.valid) return btcAddrResult;
        }

        // Check if it's a Bitcoin WIF private key (K, L, 5)
        if ((trimmedInput.startsWith('K') || trimmedInput.startsWith('L') || trimmedInput.startsWith('5')) &&
            trimmedInput.length >= 51 && trimmedInput.length <= 52 &&
            /^[KL5][1-9A-HJ-NP-Za-km-z]+$/.test(trimmedInput)) {
            const btcKeyResult = this.validateBitcoinPrivateKey(trimmedInput);
            if (btcKeyResult.valid) return btcKeyResult;
        }
        
        // Check if it's a raw hex Bitcoin private key (64 hex chars)
        if (trimmedInput.length === 64 && /^[0-9a-fA-F]+$/.test(trimmedInput)) {
            const btcKeyResult = this.validateBitcoinPrivateKey(trimmedInput);
            if (btcKeyResult.valid) return btcKeyResult;
        }
        
        // Check if it's a Bitcoin extended key (xpub/xprv/tpub/tprv)
        if (/^(xpub|xprv|tpub|tprv)[1-9A-HJ-NP-Za-km-z]{80,108}$/.test(trimmedInput)) {
            const extKeyResult = this.validateBitcoinExtendedKey(trimmedInput);
            if (extKeyResult.valid) return extKeyResult;
        }
        
        // Check if it's a Bitcoin PSBT (base64 starting with cHNidP)
        if (trimmedInput.startsWith('cHNidP') && /^[A-Za-z0-9+/=]+$/.test(trimmedInput)) {
            const psbtResult = this.validateBitcoinPSBT(trimmedInput);
            if (psbtResult.valid) return psbtResult;
        }

        return {
            valid: false,
            type: 'UNKNOWN',
            error: 'Unable to identify Bitcoin format'
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
