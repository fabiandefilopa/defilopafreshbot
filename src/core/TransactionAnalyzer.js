/**
 * Analyzes transactions to determine type (RECEIVE/WITHDRAW/UNKNOWN)
 * Detection is based exclusively on SOL balance changes (not SPL tokens)
 */
export class TransactionAnalyzer {
  constructor(solanaService) {
    this.solanaService = solanaService;
  }

  /**
   * Get transaction type for a specific wallet
   * @param {string} walletAddress - Wallet to analyze
   * @param {object} transaction - Transaction object
   * @returns {Promise<'RECEIVE'|'WITHDRAW'|'UNKNOWN'>}
   */
  async getTransactionType(walletAddress, transaction) {
    try {
      const accountKeys = transaction.transaction.message.accountKeys.map(k =>
        typeof k === 'string' ? k : k.pubkey.toString()
      );

      const walletIndex = accountKeys.indexOf(walletAddress);
      if (walletIndex === -1) return 'UNKNOWN';

      const preBalance = transaction.meta.preBalances[walletIndex];
      const postBalance = transaction.meta.postBalances[walletIndex];
      const diff = postBalance - preBalance;

      // Threshold for significant amount (0.000001 SOL = 1000 lamports)
      const threshold = 1000;

      if (diff > threshold) {
        return 'RECEIVE';
      } else if (diff < -threshold) {
        return 'WITHDRAW';
      }

      return 'UNKNOWN';
    } catch (error) {
      console.error(`Error analyzing transaction: ${error.message}`);
      return 'UNKNOWN';
    }
  }

  /**
   * Get destination wallet from a withdraw transaction
   * @param {string} sourceWallet - Source wallet
   * @param {object} transaction - Transaction object
   * @returns {Promise<string|null>} Destination wallet address
   */
  async getWithdrawDestination(sourceWallet, transaction) {
    try {
      const accountKeys = transaction.transaction.message.accountKeys.map(k =>
        typeof k === 'string' ? k : k.pubkey.toString()
      );

      const sourceIndex = accountKeys.indexOf(sourceWallet);
      if (sourceIndex === -1) return null;

      const preBalances = transaction.meta.preBalances;
      const postBalances = transaction.meta.postBalances;

      // Find which account received SOL
      for (let i = 0; i < accountKeys.length; i++) {
        if (i === sourceIndex) continue;

        const address = accountKeys[i];

        // Skip system programs
        if (this.solanaService.isSystemProgram(address)) continue;

        const gain = postBalances[i] - preBalances[i];
        if (gain > 1000) { // Received significant amount
          return address;
        }
      }

      return null;
    } catch (error) {
      console.error(`Error getting withdraw destination: ${error.message}`);
      return null;
    }
  }

  /**
   * Get the SOL amounts for receives and withdraws in transactions
   * @param {string} walletAddress
   * @param {Array} receiveTxs - Receive transactions
   * @param {Array} withdrawTxs - Withdraw transactions
   * @returns {Promise<object>} {totalReceived, totalWithdrawn}
   */
  async getTransactionAmounts(walletAddress, receiveTxs, withdrawTxs) {
    let totalReceived = 0;
    let totalWithdrawn = 0;

    // Calculate total received
    for (const tx of receiveTxs) {
      const accountKeys = tx.transaction.message.accountKeys.map(k =>
        typeof k === 'string' ? k : k.pubkey.toString()
      );
      const walletIndex = accountKeys.indexOf(walletAddress);
      if (walletIndex !== -1) {
        const diff = tx.meta.postBalances[walletIndex] - tx.meta.preBalances[walletIndex];
        totalReceived += diff;
      }
    }

    // Calculate total withdrawn
    for (const tx of withdrawTxs) {
      const accountKeys = tx.transaction.message.accountKeys.map(k =>
        typeof k === 'string' ? k : k.pubkey.toString()
      );
      const walletIndex = accountKeys.indexOf(walletAddress);
      if (walletIndex !== -1) {
        const diff = tx.meta.preBalances[walletIndex] - tx.meta.postBalances[walletIndex];
        totalWithdrawn += diff;
      }
    }

    return { totalReceived, totalWithdrawn };
  }

  /**
   * Verify if a wallet is a final fresh destination
   * STRICT: Must have EXACTLY 1 transaction total, and it must be a receive
   * @param {string} walletAddress
   * @returns {Promise<object>} Verification result
   */
  async verifyFinalWallet(walletAddress) {
    // First, get TOTAL transaction count
    const totalTxCount = await this.solanaService.getTotalTransactionCount(walletAddress);

    console.log(`       Total TX count: ${totalTxCount}`);

    // Virgin wallet (no transactions)
    if (totalTxCount === 0) {
      return {
        isFinal: true,
        reason: 'Virgin wallet (no transactions)',
        txCount: 0,
        receives: 0
      };
    }

    // If more than 1 transaction, NOT fresh
    if (totalTxCount > 1) {
      return {
        isFinal: false,
        reason: `Not fresh: wallet has ${totalTxCount} total transactions (only 1 allowed)`,
        txCount: totalTxCount,
        receives: 0,
        withdraws: 0
      };
    }

    // Exactly 1 transaction - verify it's a RECEIVE
    const transactions = await this.solanaService.getFirstTransactions(walletAddress, 1);

    if (transactions.length === 0) {
      return {
        isFinal: false,
        reason: 'Error: count says 1 TX but fetch returned 0',
        txCount: 0,
        receives: 0
      };
    }

    const type = await this.getTransactionType(walletAddress, transactions[0]);

    if (type === 'RECEIVE') {
      return {
        isFinal: true,
        reason: `Fresh wallet: EXACTLY 1 transaction (receive)`,
        txCount: 1,
        receives: 1
      };
    }

    return {
      isFinal: false,
      reason: `Not fresh: first TX is ${type}, not a receive`,
      txCount: 1,
      receives: 0,
      withdraws: type === 'WITHDRAW' ? 1 : 0
    };
  }

  /**
   * Analyze pattern of first N transactions with dynamic limit adjustment
   * @param {string} walletAddress
   * @param {number} limit - Number of first transactions to analyze
   * @returns {Promise<object>} Pattern analysis result
   */
  async analyzeFirstTransactions(walletAddress, limit = 3) {
    const transactions = await this.solanaService.getFirstTransactions(
      walletAddress,
      limit
    );

    if (transactions.length === 0) {
      return {
        pattern: 'VIRGIN',
        receives: 0,
        withdraws: 0,
        reason: 'No transactions found (virgin wallet)'
      };
    }

    const receives = [];
    const withdraws = [];

    for (const tx of transactions) {
      const type = await this.getTransactionType(walletAddress, tx);
      if (type === 'RECEIVE') receives.push(tx);
      if (type === 'WITHDRAW') withdraws.push(tx);
    }

    // PRIORITY 1: Wallet with ONLY 1 receive and NO withdraws = FRESH!
    if (receives.length === 1 && withdraws.length === 0) {
      return {
        pattern: 'ONLY_RECEIVING',
        receives: 1,
        withdraws: 0,
        reason: `Fresh wallet: 1 receive, 0 withdraws`
      };
    }

    // Pattern 2: More receives but NO withdraws = ONLY_RECEIVING (but may not be final)
    if (receives.length > 1 && withdraws.length === 0) {
      return {
        pattern: 'ONLY_RECEIVING',
        receives: receives.length,
        withdraws: 0,
        reason: `Only receiving: ${receives.length} receives, 0 withdraws`
      };
    }

    // Pattern 3: HOP DETECTION - Must send MOST of the received amount
    if (receives.length >= 1 && withdraws.length === 1) {
      // Calculate amounts
      const amounts = await this.getTransactionAmounts(walletAddress, receives, withdraws);
      const receivedLamports = amounts.totalReceived;
      const withdrawnLamports = amounts.totalWithdrawn;

      // Check if withdrawn amount is at least 80% of received amount
      // This means they're sending MOST of the SOL (accounting for fees)
      const withdrawnPercentage = (withdrawnLamports / receivedLamports) * 100;

      console.log(`       Amounts: Received ${receivedLamports / 1e9} SOL, Withdrawn ${withdrawnLamports / 1e9} SOL (${withdrawnPercentage.toFixed(1)}%)`);

      if (withdrawnPercentage >= 80) {
        const withdrawDest = await this.getWithdrawDestination(
          walletAddress,
          withdraws[0]
        );
        return {
          pattern: 'HOP',
          receives: receives.length,
          withdraws: 1,
          nextWallet: withdrawDest,
          reason: `Hop pattern: ${receives.length} receive(s) + 1 withdraw (${withdrawnPercentage.toFixed(0)}% transferred)`
        };
      } else {
        return {
          pattern: 'OTHER',
          receives: receives.length,
          withdraws: withdraws.length,
          reason: `Partial withdraw: only ${withdrawnPercentage.toFixed(0)}% transferred (not a hop)`
        };
      }
    }

    return {
      pattern: 'OTHER',
      receives: receives.length,
      withdraws: withdraws.length,
      reason: `Mixed pattern: ${receives.length} receives, ${withdraws.length} withdraws`
    };
  }

  /**
   * Analyze wallet with dynamic transaction limit to find optimal hop pattern
   * Tries increasing transaction limits to find the correct hop pattern
   * @param {string} walletAddress
   * @param {number} maxTxToTry - Maximum transactions to try analyzing
   * @returns {Promise<object>} Best pattern analysis result
   */
  async analyzeWithDynamicLimit(walletAddress, maxTxToTry = 10) {
    console.log(`    🔎 Dynamic analysis: trying up to ${maxTxToTry} txs...`);

    // Start with just 2 transactions (most hops will be: 1 receive + 1 withdraw)
    // Then try 3, then 5 if needed
    const limitsToTry = [2, 3, 5, Math.min(10, maxTxToTry)];

    for (const limit of limitsToTry) {
      const analysis = await this.analyzeFirstTransactions(walletAddress, limit);

      console.log(`       Limit ${limit}: ${analysis.pattern} (${analysis.receives}R/${analysis.withdraws}W)`);

      // PRIORITY: If we found ONLY_RECEIVING with 1 receive, it's FRESH - return immediately
      if (analysis.pattern === 'ONLY_RECEIVING' && analysis.receives === 1) {
        console.log(`       ✓ FRESH: 1 receive, 0 withdraws`);
        return analysis;
      }

      // If we found a HOP pattern, return it
      if (analysis.pattern === 'HOP') {
        console.log(`       ✓ Found HOP pattern with ${limit} tx limit`);
        return analysis;
      }

      // If ONLY_RECEIVING but more than 1 receive, continue checking
      if (analysis.pattern === 'ONLY_RECEIVING' && analysis.receives > 1) {
        console.log(`       → Multiple receives detected, checking with more txs...`);
        continue;
      }

      // If VIRGIN, no need to continue
      if (analysis.pattern === 'VIRGIN') {
        return analysis;
      }

      // If OTHER pattern, likely not fresh - but try with more txs to be sure
      if (analysis.pattern === 'OTHER') {
        console.log(`       → OTHER pattern, trying with more txs...`);
        continue;
      }
    }

    // If no clear pattern found, use the last analysis
    const finalAnalysis = await this.analyzeFirstTransactions(walletAddress, maxTxToTry);
    console.log(`       ✗ Final analysis: ${finalAnalysis.pattern}`);
    return finalAnalysis;
  }
}

export default TransactionAnalyzer;
