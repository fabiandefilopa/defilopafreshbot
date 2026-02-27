import { FreshWalletResult } from '../models/FreshWalletResult.js';
import { TransactionAnalyzer } from './TransactionAnalyzer.js';

/**
 * Detects fresh wallets with hop/loop logic
 */
export class FreshWalletDetector {
  constructor(solanaService, exchangeWallets, config = {}) {
    this.solanaService = solanaService;
    this.exchangeWallets = new Set(exchangeWallets); // Set for O(1) lookup
    this.maxHops = config.maxHops || 3;
    this.firstTxToAnalyze = config.firstTransactionsToAnalyze || 3;
    this.maxAgeHours = config.maxAgeHours || 96; // 4 days by default
    this.analyzer = new TransactionAnalyzer(solanaService);

    // Global cache to avoid re-analyzing same wallets across exchanges
    this.processedWalletsCache = new Map(); // wallet -> result
  }

  /**
   * Main detection logic with improved loop/hop support and dynamic analysis
   * @param {string} initialWallet - Wallet that received from exchange
   * @param {string} exchangeName - Name of source exchange
   * @param {object} txInfo - Initial transaction info (amount, signature, etc)
   * @param {number} maxTxToTry - Maximum transactions to analyze per wallet (default: 10)
   * @param {string} mode - Detection mode: 'simple' or 'hopping' (default: 'hopping')
   * @returns {Promise<FreshWalletResult>}
   */
  async detectFreshWallet(initialWallet, exchangeName, txInfo, maxTxToTry = 10, mode = 'hopping') {
    const path = [initialWallet];
    let currentWallet = initialWallet;
    let hops = 0;

    // SIMPLE MODE: Only check if wallet has EXACTLY 1 transaction total (must be a receive)
    if (mode === 'simple') {
      console.log(`  ⚡ Simple mode: Checking if wallet has exactly 1 transaction...`);

      // Use verifyFinalWallet which checks TOTAL transaction count
      const verification = await this.analyzer.verifyFinalWallet(currentWallet);

      console.log(`     Verification: ${verification.reason}`);

      // Only FRESH if exactly 1 transaction total and it's a receive
      if (verification.isFinal) {
        return new FreshWalletResult({
          isFresh: true,
          finalWallet: currentWallet,
          path,
          hops: 0,
          reason: `Fresh wallet (simple): ${verification.reason}`,
          exchange: exchangeName,
          amount: txInfo.amount,
          signature: txInfo.signature,
          timestamp: txInfo.timestamp
        });
      }

      // Not fresh in simple mode
      return new FreshWalletResult({
        isFresh: false,
        finalWallet: null,
        path,
        hops: 0,
        reason: `Not fresh (simple mode): ${verification.reason}`,
        exchange: exchangeName,
        amount: txInfo.amount,
        signature: txInfo.signature,
        timestamp: txInfo.timestamp
      });
    }

    // HOPPING MODE: Full analysis with hopping logic
    while (hops < this.maxHops) {
      console.log(`  🔍 Analyzing wallet ${currentWallet.slice(0, 8)}... (hop ${hops})`);

      // Use DYNAMIC analysis to find the correct hop pattern
      const analysis = await this.analyzer.analyzeWithDynamicLimit(
        currentWallet,
        maxTxToTry
      );

      console.log(`     Pattern: ${analysis.pattern} (${analysis.reason})`);

      // Case 1: Virgin wallet (no transactions)
      if (analysis.pattern === 'VIRGIN') {
        return new FreshWalletResult({
          isFresh: true,
          finalWallet: currentWallet,
          path,
          hops,
          reason: `Fresh wallet (virgin): ${analysis.reason}`,
          exchange: exchangeName,
          amount: txInfo.amount,
          signature: txInfo.signature,
          timestamp: txInfo.timestamp
        });
      }

      // Case 2: Only receiving transactions
      if (analysis.pattern === 'ONLY_RECEIVING') {
        // Always verify with TOTAL transaction count
        console.log(`     → Verifying if wallet has EXACTLY 1 total transaction...`);
        const verification = await this.analyzer.verifyFinalWallet(currentWallet);

        console.log(`     Final verification: ${verification.reason}`);

        if (verification.isFinal) {
          return new FreshWalletResult({
            isFresh: true,
            finalWallet: currentWallet,
            path,
            hops,
            reason: `Fresh wallet found after ${hops} hop(s): ${verification.reason}`,
            exchange: exchangeName,
            amount: txInfo.amount,
            signature: txInfo.signature,
            timestamp: txInfo.timestamp
          });
        } else {
          return new FreshWalletResult({
            isFresh: false,
            finalWallet: null,
            path,
            hops,
            reason: `Not fresh: ${verification.reason}`,
            exchange: exchangeName,
            amount: txInfo.amount,
            signature: txInfo.signature,
            timestamp: txInfo.timestamp
          });
        }
      }

      // Case 3: Hop pattern (N receives + 1 withdraw)
      if (analysis.pattern === 'HOP' && analysis.nextWallet) {
        // Check if next wallet is an exchange (circular reference)
        if (this.exchangeWallets.has(analysis.nextWallet)) {
          return new FreshWalletResult({
            isFresh: false,
            finalWallet: null,
            path,
            hops,
            reason: `Not fresh: hop ${hops} withdraws back to exchange`,
            exchange: exchangeName,
            amount: txInfo.amount,
            signature: txInfo.signature,
            timestamp: txInfo.timestamp
          });
        }

        // Check for circular loop (wallet already in path)
        if (path.includes(analysis.nextWallet)) {
          return new FreshWalletResult({
            isFresh: false,
            finalWallet: null,
            path,
            hops,
            reason: `Not fresh: circular hop detected (wallet ${analysis.nextWallet.slice(0, 8)} already in path)`,
            exchange: exchangeName,
            amount: txInfo.amount,
            signature: txInfo.signature,
            timestamp: txInfo.timestamp
          });
        }

        // Continue to next hop
        console.log(`     → Following hop to ${analysis.nextWallet.slice(0, 8)}...`);
        currentWallet = analysis.nextWallet;
        path.push(currentWallet);
        hops++;
        continue;
      }

      // Case 4: Other pattern (not fresh)
      return new FreshWalletResult({
        isFresh: false,
        finalWallet: null,
        path,
        hops,
        reason: `Not fresh: ${analysis.reason}`,
        exchange: exchangeName,
        amount: txInfo.amount,
        signature: txInfo.signature,
        timestamp: txInfo.timestamp
      });
    }

    // Max hops reached - verify if final wallet is still valid
    console.log(`  ⚠️  Max hops (${this.maxHops}) reached. Verifying final wallet...`);

    const finalVerification = await this.analyzer.verifyFinalWallet(currentWallet);

    if (finalVerification.isFinal) {
      return new FreshWalletResult({
        isFresh: true,
        finalWallet: currentWallet,
        path,
        hops,
        reason: `Fresh wallet found at max hops (${this.maxHops}): ${finalVerification.reason}`,
        exchange: exchangeName,
        amount: txInfo.amount,
        signature: txInfo.signature,
        timestamp: txInfo.timestamp
      });
    }

    return new FreshWalletResult({
      isFresh: false,
      finalWallet: null,
      path,
      hops,
      reason: `Max hops (${this.maxHops}) reached and final wallet invalid: ${finalVerification.reason}`,
      exchange: exchangeName,
      amount: txInfo.amount,
      signature: txInfo.signature,
      timestamp: txInfo.timestamp
    });
  }

  /**
   * Scan exchange wallet(s) for fresh wallet candidates
   * @param {string} exchangeName - Exchange to scan
   * @param {object} filter - Filter config {type: 'range'|'target', ...}
   * @param {number} limit - Not used for exchange wallets (fetches all within time range)
   * @param {object} progressTracker - Optional progress tracker for real-time updates
   * @param {string} mode - Detection mode: 'simple' or 'hopping' (default: 'hopping')
   * @returns {Promise<FreshWalletResult[]>}
   */
  async scanExchangeWallets(exchangeName, filter, limit = 0, progressTracker = null, mode = 'hopping') {
    const modeText = mode === 'simple' ? '⚡ SIMPLE' : '🔗 HOPPING';
    console.log(`\n🔍 Scanning ${exchangeName} wallets...`);
    console.log(`   Mode: ${modeText}`);
    console.log(`   Filter: ${JSON.stringify(filter)}`);
    console.log(`   Time range: Last ${this.maxAgeHours} hours\n`);

    if (progressTracker) {
      progressTracker.setPhase(`Phase 1/2: Collecting transactions from ${exchangeName}`);
    }

    const results = [];
    const exchangeWalletsList = Array.from(this.exchangeWallets);

    // First pass: collect all outgoing transactions from all exchange wallets
    console.log(`📊 Phase 1/2: Collecting outgoing transactions...`);
    const allOutgoingTxs = [];

    for (let i = 0; i < exchangeWalletsList.length; i++) {
      const exchangeWallet = exchangeWalletsList[i];
      const walletProgress = Math.round(((i + 1) / exchangeWalletsList.length) * 100);
      console.log(`\n📍 [${walletProgress}%] Wallet ${i + 1}/${exchangeWalletsList.length}: ${exchangeWallet.slice(0, 8)}...`);

      // Update progress tracker with current wallet being processed
      if (progressTracker) {
        progressTracker.addLog(`📍 ${exchangeName} - Wallet ${i + 1}/${exchangeWalletsList.length}`);
      }

      // Fetch ALL transactions within time range (limit = 0)
      const outgoingTxs = await this.solanaService.getOutgoingSOLTransactions(
        exchangeWallet,
        0, // 0 = fetch all transactions within time range
        this.maxAgeHours,
        progressTracker // Pass progress tracker for transaction processing updates
      );

      console.log(`   Found ${outgoingTxs.length} outgoing transactions`);

      // Filter by amount FIRST to reduce workload
      const filtered = outgoingTxs.filter(tx => this.matchesFilter(tx.amountSOL, filter));
      console.log(`   After filter: ${filtered.length} transactions match`);

      allOutgoingTxs.push(...filtered.map(tx => ({ ...tx, exchange: exchangeName })));
    }

    // Remove duplicates by wallet address (global cache check)
    const uniqueWallets = new Map();
    for (const tx of allOutgoingTxs) {
      if (!uniqueWallets.has(tx.to)) {
        uniqueWallets.set(tx.to, tx);
      }
    }

    const totalWallets = uniqueWallets.size;
    console.log(`\n✅ Phase 1 complete: ${totalWallets} unique wallets to analyze`);
    console.log(`📊 Phase 2/2: Analyzing fresh wallet patterns...\n`);

    if (progressTracker) {
      progressTracker.setPhase(`Phase 2/2: Analyzing ${totalWallets} wallets from ${exchangeName}`);
    }

    // Second pass: analyze each unique wallet
    const walletsToAnalyze = Array.from(uniqueWallets.values());
    let analyzed = 0;
    let skipped = 0;

    for (const tx of walletsToAnalyze) {
      analyzed++;
      const progress = Math.round((analyzed / totalWallets) * 100);

      // Update progress tracker
      if (progressTracker) {
        progressTracker.incrementWalletsScanned();
        progressTracker.setApiRequests(this.solanaService.requestCount);
      }

      // Check global cache first
      if (this.processedWalletsCache.has(tx.to)) {
        skipped++;
        const cachedResult = this.processedWalletsCache.get(tx.to);
        if (cachedResult.isFresh) {
          results.push(cachedResult);
          if (progressTracker) {
            progressTracker.incrementFreshWallets();
          }
        }
        if (analyzed % 10 === 0 || analyzed === totalWallets) {
          console.log(`[${progress}%] ${analyzed}/${totalWallets} analyzed (${skipped} from cache, ${results.length} fresh)`);
          if (progressTracker) {
            progressTracker.addLog(`${exchangeName} - [${progress}%] ${analyzed}/${totalWallets} analyzed (${skipped} from cache, ${results.length} fresh)`);
          }
        }
        continue;
      }

      // Show progress every 10 wallets or at the end
      if (analyzed % 10 === 0 || analyzed === totalWallets) {
        console.log(`[${progress}%] ${analyzed}/${totalWallets} analyzed (${skipped} from cache, ${results.length} fresh)`);
        if (progressTracker) {
          progressTracker.addLog(`${exchangeName} - [${progress}%] ${analyzed}/${totalWallets} analyzed (${skipped} from cache, ${results.length} fresh)`);
        }
      }

      console.log(`\n   💸 ${tx.amountSOL.toFixed(6)} SOL → ${tx.to.slice(0, 8)}...`);

      // Detect if fresh (with mode: simple or hopping)
      const result = await this.detectFreshWallet(
        tx.to,
        exchangeName,
        {
          amount: tx.amountSOL,
          signature: tx.signature,
          timestamp: tx.timestamp
        },
        10, // maxTxToTry
        mode // detection mode
      );

      // Cache the result
      this.processedWalletsCache.set(tx.to, result);

      if (result.isFresh) {
        console.log(`   ✅ FRESH: ${result.reason}`);
        results.push(result);
        if (progressTracker) {
          progressTracker.incrementFreshWallets();
          progressTracker.addLog(`✅ Fresh wallet found: ${tx.to.slice(0, 8)}... (${tx.amountSOL.toFixed(4)} SOL)`);
        }
      } else {
        console.log(`   ❌ Not fresh: ${result.reason}`);
      }
    }

    console.log(`\n✅ ${exchangeName} scan complete: ${results.length} fresh wallets found`);
    console.log(`📊 Stats: ${analyzed} analyzed, ${skipped} from cache\n`);

    if (progressTracker) {
      progressTracker.addLog(`✅ ${exchangeName} complete: ${results.length} fresh wallets`);
    }

    return results;
  }

  /**
   * Check if amount matches filter
   * @param {number} amount - Amount in SOL
   * @param {object} filter - Filter config
   * @returns {boolean}
   */
  matchesFilter(amount, filter) {
    if (filter.type === 'range') {
      return amount >= filter.min && amount <= filter.max;
    } else if (filter.type === 'target') {
      const tolerance = filter.value * filter.tolerance;
      return Math.abs(amount - filter.value) <= tolerance;
    }
    return false;
  }

  /**
   * Clear the processed wallets cache
   */
  clearCache() {
    this.processedWalletsCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cachedWallets: this.processedWalletsCache.size
    };
  }
}

export default FreshWalletDetector;
