import * as fs from 'fs';
import * as path from 'path';
import { Database } from 'sqlite3';
import { Level } from 'level';

import {
  BalanceInfo,
  BalanceProvider,
  BalanceSource,
  CryptocurrencyType,
  UTXO,
  BalanceCheckError
} from '../types';

export class OfflineBalanceChecker implements BalanceProvider {
  name = 'OfflineBalanceChecker';
  supportedCryptocurrencies: CryptocurrencyType[] = [];
  isOnline = false;

  private blockchainDataPath: string;
  private utxoCache: Map<string, UTXO[]> = new Map();
  private balanceCache: Map<string, BalanceInfo> = new Map();
  private bitcoinDb?: Database;
  private ethereumDb?: Level<string, any>;

  constructor(blockchainDataPath: string) {
    this.blockchainDataPath = blockchainDataPath;
    this.initializeSupportedCryptocurrencies();
  }

  private initializeSupportedCryptocurrencies() {
    this.supportedCryptocurrencies = [
      { name: 'Bitcoin', symbol: 'BTC', network: 'mainnet', coinType: 0 },
      { name: 'Ethereum', symbol: 'ETH', network: 'mainnet', coinType: 60 },
      { name: 'Litecoin', symbol: 'LTC', network: 'mainnet', coinType: 2 }
    ];
  }

  /**
   * Initialize the offline balance checker with blockchain data
   */
  async initialize(): Promise<void> {
    try {
      await this.initializeBitcoinDatabase();
      await this.initializeEthereumDatabase();
      // OfflineBalanceChecker initialized
    } catch (error) {
      console.error('Failed to initialize OfflineBalanceChecker:', error);
      throw new Error(`Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Initialize Bitcoin UTXO database from chainstate
   */
  private async initializeBitcoinDatabase(): Promise<void> {
    const bitcoinDbPath = path.join(this.blockchainDataPath, 'bitcoin', 'utxo.db');
    
    if (!fs.existsSync(bitcoinDbPath)) {
      // Bitcoin UTXO database not found at: bitcoinDbPath
      return;
    }

    return new Promise((resolve, reject) => {
      this.bitcoinDb = new Database(bitcoinDbPath, (err) => {
        if (err) {
          reject(new Error(`Failed to open Bitcoin database: ${err.message}`));
        } else {
          // Bitcoin UTXO database opened
          resolve();
        }
      });
    });
  }

  /**
   * Initialize Ethereum database
   */
  private async initializeEthereumDatabase(): Promise<void> {
    const ethereumDbPath = path.join(this.blockchainDataPath, 'ethereum', 'accounts.db');
    
    if (!fs.existsSync(ethereumDbPath)) {
      // Ethereum database not found at: ethereumDbPath
      return;
    }

    try {
      this.ethereumDb = new Level(ethereumDbPath, { valueEncoding: 'json' });
      console.log('Ethereum database opened successfully');
    } catch (error) {
      console.error('Failed to open Ethereum database:', error);
    }
  }

  /**
   * Get balance for a single address
   */
  async getBalance(address: string, cryptocurrency: CryptocurrencyType): Promise<BalanceInfo> {
    const cacheKey = `${cryptocurrency.symbol}-${address}`;
    
    // Check cache first
    if (this.balanceCache.has(cacheKey)) {
      const cached = this.balanceCache.get(cacheKey)!;
      // Return cached if less than 5 minutes old
      if (Date.now() - cached.lastUpdated.getTime() < 5 * 60 * 1000) {
        return cached;
      }
    }

    try {
      let balanceInfo: BalanceInfo;

      switch (cryptocurrency.name.toLowerCase()) {
        case 'bitcoin':
        case 'litecoin':
          balanceInfo = await this.getBitcoinBalance(address, cryptocurrency);
          break;
        case 'ethereum':
          balanceInfo = await this.getEthereumBalance(address, cryptocurrency);
          break;
        default:
          throw new BalanceCheckError(
            `Unsupported cryptocurrency: ${cryptocurrency.name}`,
            address,
            cryptocurrency.name
          );
      }

      // Cache the result
      this.balanceCache.set(cacheKey, balanceInfo);
      return balanceInfo;

    } catch (error) {
      throw new BalanceCheckError(
        `Failed to get balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
        address,
        cryptocurrency.name
      );
    }
  }

  /**
   * Get Bitcoin balance from UTXO set
   */
  private async getBitcoinBalance(address: string, cryptocurrency: CryptocurrencyType): Promise<BalanceInfo> {
    if (!this.bitcoinDb) {
      // Return empty balance if no database
      return this.createEmptyBalance(cryptocurrency.symbol);
    }

    return new Promise((resolve, reject) => {
      const query = `
        SELECT txid, vout, amount, confirmations, script_pubkey
        FROM utxos 
        WHERE address = ?
      `;

      this.bitcoinDb!.all(query, [address], (err, rows: any[]) => {
        if (err) {
          reject(new BalanceCheckError(`Database query failed: ${err.message}`, address, cryptocurrency.name));
          return;
        }

        const utxos: UTXO[] = rows.map(row => ({
          txid: row.txid,
          vout: row.vout,
          amount: row.amount.toString(),
          confirmations: row.confirmations,
          scriptPubKey: row.script_pubkey,
          address: address
        }));

        const totalBalance = utxos.reduce((sum, utxo) => sum + parseFloat(utxo.amount), 0);
        const confirmedBalance = utxos
          .filter(utxo => utxo.confirmations >= 6)
          .reduce((sum, utxo) => sum + parseFloat(utxo.amount), 0);
        const unconfirmedBalance = totalBalance - confirmedBalance;

        const balanceInfo: BalanceInfo = {
          balance: totalBalance.toFixed(8),
          confirmed: confirmedBalance.toFixed(8),
          unconfirmed: unconfirmedBalance.toFixed(8),
          currency: cryptocurrency.symbol,
          lastUpdated: new Date(),
          transactionCount: utxos.length,
          utxos: utxos,
          source: BalanceSource.LOCAL_BLOCKCHAIN
        };

        resolve(balanceInfo);
      });
    });
  }

  /**
   * Get Ethereum balance from account database
   */
  private async getEthereumBalance(address: string, cryptocurrency: CryptocurrencyType): Promise<BalanceInfo> {
    if (!this.ethereumDb) {
      return this.createEmptyBalance(cryptocurrency.symbol);
    }

    try {
      const accountData = await this.ethereumDb.get(address.toLowerCase());
      
      const balance = accountData?.balance || '0';
      const nonce = accountData?.nonce || 0;

      return {
        balance: this.weiToEther(balance),
        confirmed: this.weiToEther(balance),
        unconfirmed: '0',
        currency: cryptocurrency.symbol,
        lastUpdated: new Date(),
        transactionCount: nonce,
        source: BalanceSource.LOCAL_BLOCKCHAIN
      };
    } catch (error) {
      // Address not found in database means zero balance
      if ((error as any).code === 'LEVEL_NOT_FOUND') {
        return this.createEmptyBalance(cryptocurrency.symbol);
      }
      throw error;
    }
  }

  /**
   * Get balances for multiple addresses
   */
  async getMultipleBalances(addresses: string[], cryptocurrency: CryptocurrencyType): Promise<BalanceInfo[]> {
    const results: BalanceInfo[] = [];
    
    // Process in batches to avoid overwhelming the database
    const batchSize = 50;
    
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      const batchPromises = batch.map(address => 
        this.getBalance(address, cryptocurrency).catch(error => {
          console.warn(`Failed to get balance for ${address}:`, error);
          return this.createEmptyBalance(cryptocurrency.symbol);
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Create empty balance info
   */
  private createEmptyBalance(currency: string): BalanceInfo {
    return {
      balance: '0',
      confirmed: '0',
      unconfirmed: '0',
      currency,
      lastUpdated: new Date(),
      transactionCount: 0,
      source: BalanceSource.DERIVED_EMPTY
    };
  }

  /**
   * Convert Wei to Ether
   */
  private weiToEther(wei: string): string {
    const weiAmount = BigInt(wei);
    const etherAmount = Number(weiAmount) / Math.pow(10, 18);
    return etherAmount.toFixed(18);
  }

  /**
   * Get summary statistics
   */
  async getStatistics(): Promise<{
    totalAddresses: number;
    totalBalance: string;
    cacheHitRate: number;
    supportedCurrencies: string[];
  }> {
    const totalAddresses = this.balanceCache.size;
    const supportedCurrencies = this.supportedCryptocurrencies.map(c => c.symbol);
    
    // Calculate total balance across all cached addresses (in BTC equivalent for simplicity)
    let totalBtcEquivalent = 0;
    for (const balance of this.balanceCache.values()) {
      if (balance.currency === 'BTC') {
        totalBtcEquivalent += parseFloat(balance.balance);
      }
      // Add conversion rates for other currencies if needed
    }

    return {
      totalAddresses,
      totalBalance: totalBtcEquivalent.toFixed(8) + ' BTC (equivalent)',
      cacheHitRate: 0, // Would need to track hits/misses to calculate this
      supportedCurrencies
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.balanceCache.clear();
    this.utxoCache.clear();
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.bitcoinDb) {
      promises.push(new Promise((resolve, reject) => {
        this.bitcoinDb!.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }));
    }

    if (this.ethereumDb) {
      promises.push(this.ethereumDb.close());
    }

    await Promise.all(promises);
    console.log('OfflineBalanceChecker closed successfully');
  }
}

/**
 * Utility class for managing blockchain data synchronization
 */
export class BlockchainDataManager {
  private dataPath: string;

  constructor(dataPath: string) {
    this.dataPath = dataPath;
  }

  /**
   * Check if blockchain data exists for a cryptocurrency
   */
  hasDataFor(cryptocurrency: string): boolean {
    const cryptoPath = path.join(this.dataPath, cryptocurrency.toLowerCase());
    return fs.existsSync(cryptoPath);
  }

  /**
   * Get data status for all supported cryptocurrencies
   */
  getDataStatus(): { [key: string]: { exists: boolean; size?: number; lastModified?: Date } } {
    const status: { [key: string]: { exists: boolean; size?: number; lastModified?: Date } } = {};
    const cryptos = ['bitcoin', 'ethereum', 'litecoin'];

    for (const crypto of cryptos) {
      const cryptoPath = path.join(this.dataPath, crypto);
      if (fs.existsSync(cryptoPath)) {
        const stats = fs.statSync(cryptoPath);
        status[crypto] = {
          exists: true,
          size: stats.size,
          lastModified: stats.mtime
        };
      } else {
        status[crypto] = { exists: false };
      }
    }

    return status;
  }

  /**
   * Estimate the size needed for blockchain data
   */
  getEstimatedSizeRequirements(): { [key: string]: string } {
    return {
      bitcoin: '~5-10 GB (pruned UTXO set)',
      ethereum: '~2-5 GB (account states)',
      litecoin: '~1-2 GB (pruned UTXO set)'
    };
  }
}

export default OfflineBalanceChecker;
