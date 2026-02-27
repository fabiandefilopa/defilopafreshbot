import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

class SolanaService {
  constructor(rpcUrl) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.freshWalletCache = new Map();
    this.CACHE_TTL = 5 * 60 * 1000;

    // Rate limiting for Helius Free: 10 req/s
    // Use 5 req/s (200ms interval) to leave headroom and avoid 429s
    this.requestCount = 0;
    this.MIN_REQUEST_INTERVAL = 200;
    this.parallelBatchSize = 3;
    this._queue = Promise.resolve();
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Sequential rate limiter - ensures requests are spaced out even when called in parallel
   */
  async rateLimitedDelay() {
    this._queue = this._queue.then(() => this.delay(this.MIN_REQUEST_INTERVAL));
    await this._queue;
    this.requestCount++;
  }

  /**
   * Retry a function with exponential backoff for 429 errors
   */
  async retryWithBackoff(fn, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const is429 = error.message?.includes('429') || error.message?.includes('Too Many Requests');
        const isLastAttempt = attempt === maxRetries - 1;

        if (is429 && !isLastAttempt) {
          const backoffTime = Math.min(1000 * Math.pow(2, attempt), 8000); // Max 8s
          console.log(`⚠️  Rate limit hit (429), retrying in ${backoffTime}ms... (attempt ${attempt + 1}/${maxRetries})`);
          await this.delay(backoffTime);
          continue;
        }

        // If not 429, or last attempt, throw the error
        throw error;
      }
    }
  }

  async getWalletInfo(walletAddress) {
    try {
      const publicKey = new PublicKey(walletAddress);
      const balance = await this.connection.getBalance(publicKey);
      
      return {
        address: walletAddress,
        balanceLamports: balance,
        balanceSOL: balance / LAMPORTS_PER_SOL
      };
    } catch (error) {
      throw new Error(`Error obteniendo info: ${error.message}`);
    }
  }

  /**
   * Get total transaction count for a wallet
   * Optimized: Returns exact count only up to 100, returns '>100' for more
   * @param {string} walletAddress - Wallet to check
   * @returns {Promise<number>} Total number of transactions (or 100+ if more than 100)
   */
  async getTotalTransactionCount(walletAddress) {
    try {
      const publicKey = new PublicKey(walletAddress);

      // Get first batch (max 100)
      await this.rateLimitedDelay();
      const batch = await this.connection.getSignaturesForAddress(
        publicKey,
        { limit: 100 }
      );

      // If less than 100, that's the exact count
      if (batch.length < 100) {
        return batch.length;
      }

      // If exactly 100, there might be more
      // For fresh wallet detection, >1 is enough to disqualify
      // So we return 100 (which is definitely >1)
      return 100;
    } catch (error) {
      console.error(`Error getting transaction count: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get first N transactions of a wallet (chronologically ordered, oldest first)
   * Used by TransactionAnalyzer to analyze wallet patterns
   */
  async getFirstTransactions(walletAddress, limit = 5) {
    try {
      const publicKey = new PublicKey(walletAddress);

      // Get all signatures first
      let allSignatures = [];
      let before = undefined;

      // Fetch in batches until we have all or reach reasonable limit
      while (allSignatures.length < 1000) { // Safety limit
        await this.rateLimitedDelay();

        // Use retry logic for 429 errors
        const batch = await this.retryWithBackoff(async () => {
          return await this.connection.getSignaturesForAddress(
            publicKey,
            { limit: 100, before }
          );
        });

        if (batch.length === 0) break;

        allSignatures = allSignatures.concat(batch);
        before = batch[batch.length - 1].signature;

        // If we got less than requested, we reached the end
        if (batch.length < 100) break;
      }

      // Sort chronologically (oldest first)
      allSignatures.sort((a, b) => {
        if (!a.blockTime || !b.blockTime) return 0;
        return a.blockTime - b.blockTime;
      });

      // Take first N
      const firstN = allSignatures.slice(0, limit);

      // Get full transaction details in parallel batches
      const transactions = [];
      for (let i = 0; i < firstN.length; i += this.parallelBatchSize) {
        const batch = firstN.slice(i, i + this.parallelBatchSize);

        const txPromises = batch.map(async (sig) => {
          await this.rateLimitedDelay();
          return await this.getTransactionDetails(sig.signature);
        });

        const batchResults = await Promise.all(txPromises);
        transactions.push(...batchResults.filter(tx => tx !== null));
      }

      return transactions;
    } catch (error) {
      throw new Error(`Error getting first transactions: ${error.message}`);
    }
  }

  /**
   * Get recent transactions with optional time filter
   * @param {string} walletAddress - Wallet to query
   * @param {number} limit - Max number of transactions (0 = fetch all within time range)
   * @param {number} maxAgeHours - Max age in hours (default: 24 hours)
   */
  async getRecentTransactions(walletAddress, limit = 100, maxAgeHours = 24) {
    try {
      const publicKey = new PublicKey(walletAddress);
      const cutoffTime = maxAgeHours ? Math.floor(Date.now() / 1000) - (maxAgeHours * 60 * 60) : 0;

      let allSignatures = [];
      let before = undefined;
      let reachedTimeLimit = false;

      // If limit is 0 or very high, fetch all transactions within time range
      const shouldFetchAll = limit === 0 || limit > 500;
      const batchSize = 100; // Solana RPC max per request

      while (!reachedTimeLimit) {
        await this.rateLimitedDelay();

        // Use retry logic for 429 errors
        const batch = await this.retryWithBackoff(async () => {
          return await this.connection.getSignaturesForAddress(publicKey, {
            limit: batchSize,
            before
          });
        });

        if (batch.length === 0) break;

        // Filter by time
        for (const sig of batch) {
          if (maxAgeHours && sig.blockTime && sig.blockTime < cutoffTime) {
            reachedTimeLimit = true;
            break;
          }
          if (!maxAgeHours || !sig.blockTime || sig.blockTime >= cutoffTime) {
            allSignatures.push(sig);
          }
        }

        // If not fetching all, stop when we have enough
        if (!shouldFetchAll && allSignatures.length >= limit) {
          allSignatures = allSignatures.slice(0, limit);
          break;
        }

        // If we got less than batch size, we've reached the end
        if (batch.length < batchSize) break;

        // Continue from last signature
        before = batch[batch.length - 1].signature;
      }

      console.log(`⏰ Fetched ${allSignatures.length} txs (last ${maxAgeHours}h)`);
      return allSignatures;
    } catch (error) {
      throw new Error(`Error getting transactions: ${error.message}`);
    }
  }

  async getTransactionDetails(signature) {
    try {
      return await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Get outgoing SOL transactions using BALANCE CHANGES analysis
   * ONLY detects native SOL transfers (NOT SPL tokens)
   * Returns ALL outgoing transfers (fresh detection is done by FreshWalletDetector)
   * @param {string} walletAddress - Wallet to analyze
   * @param {number} limit - Max transactions to fetch (0 = fetch all within time range)
   * @param {number} maxAgeHours - Max age in hours (default: 24 hours)
   * @param {object} progressTracker - Optional progress tracker for real-time updates
   */
  async getOutgoingSOLTransactions(walletAddress, limit = 0, maxAgeHours = 24, progressTracker = null) {
    try {
      console.log(`🔍 Searching txs from ${walletAddress.slice(0, 8)}...`);

      const signatures = await this.getRecentTransactions(walletAddress, limit, maxAgeHours);
      console.log(`📋 ${signatures.length} transactions found`);

      if (signatures.length === 0) return [];

      const outgoingTxs = [];
      const processedRecipients = new Set();
      let processed = 0;

      // Process in parallel batches to maximize throughput while respecting rate limits
      for (let i = 0; i < signatures.length; i += this.parallelBatchSize) {
        const batch = signatures.slice(i, i + this.parallelBatchSize);

        // Fetch all transactions in this batch in parallel
        const txPromises = batch.map(async (sig) => {
          await this.rateLimitedDelay();
          const tx = await this.getTransactionDetails(sig.signature);
          return { sig, tx };
        });

        const results = await Promise.all(txPromises);

        // Process each result in the batch
        for (const { sig, tx } of results) {
          try {
            processed++;

            // Show progress every 10 transactions or at milestones
            if (processed % 10 === 0 || processed === signatures.length) {
              const progress = Math.round((processed / signatures.length) * 100);
              console.log(`   [${progress}%] Processing tx ${processed}/${signatures.length}...`);
              if (progressTracker) {
                progressTracker.addLog(`[${progress}%] Processing tx ${processed}/${signatures.length}...`);
              }
            }

            if (!tx?.meta || tx.meta.err) continue;

            const accountKeys = tx.transaction.message.accountKeys.map(k =>
              typeof k === 'string' ? k : k.pubkey.toString()
            );

            const sourceIndex = accountKeys.indexOf(walletAddress);
            if (sourceIndex === -1) continue;

            const preBalances = tx.meta.preBalances;
            const postBalances = tx.meta.postBalances;

            const sourcePreBalance = preBalances[sourceIndex];
            const sourcePostBalance = postBalances[sourceIndex];
            const sourceDiff = sourcePreBalance - sourcePostBalance;

            // If wallet lost SOL (ignoring small fees)
            if (sourceDiff < 10000) continue;

            // Find wallets that RECEIVED SOL
            for (let i = 0; i < accountKeys.length; i++) {
              if (i === sourceIndex) continue;

              const recipientAddress = accountKeys[i];

              if (this.isSystemProgram(recipientAddress)) continue;

              const recipientPreBalance = preBalances[i];
              const recipientPostBalance = postBalances[i];
              const recipientGain = recipientPostBalance - recipientPreBalance;

              if (recipientGain >= 1000) { // Min 0.000001 SOL
                const amountSOL = recipientGain / LAMPORTS_PER_SOL;

                const key = `${sig.signature}-${recipientAddress}`;
                if (processedRecipients.has(key)) continue;
                processedRecipients.add(key);

                // DON'T check if fresh here - FreshWalletDetector does that
                outgoingTxs.push({
                  signature: sig.signature,
                  timestamp: sig.blockTime ? new Date(sig.blockTime * 1000) : null,
                  amountSOL: amountSOL,
                  amountLamports: recipientGain,
                  from: walletAddress,
                  to: recipientAddress,
                  slot: sig.slot
                });
              }
            }

          } catch (txError) {
            console.error(`Error tx: ${txError.message}`);
            continue;
          }
        }
      }

      outgoingTxs.sort((a, b) => {
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return b.timestamp - a.timestamp;
      });

      console.log(`✅ Total outgoing txs: ${outgoingTxs.length}`);
      return outgoingTxs;
    } catch (error) {
      throw new Error(`Error analyzing: ${error.message}`);
    }
  }

  /**
   * Verificar si es un programa del sistema (no una wallet real)
   */
  isSystemProgram(address) {
    const systemPrograms = [
      '11111111111111111111111111111111', // System Program
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token Program
      'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL', // Associated Token
      'ComputeBudget111111111111111111111111111111', // Compute Budget
      'SysvarRent111111111111111111111111111111111', // Sysvar Rent
      'SysvarC1ock11111111111111111111111111111111', // Sysvar Clock
    ];
    return systemPrograms.includes(address);
  }

  clearCache() {
    this.freshWalletCache.clear();
  }
}

export default SolanaService;
