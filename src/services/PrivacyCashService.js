import { PublicKey } from '@solana/web3.js';
import { PRIVACY_CASH } from '../constants/privacyCash.js';

class PrivacyCashService {
  constructor(solanaService) {
    this.solana = solanaService;
    this.connection = solanaService.connection;
    this.poolPubkey = new PublicKey(PRIVACY_CASH.POOL_ADDRESS);
    this.txCache = new Map();
  }

  async fetchPoolSignaturesInRange(startSec, endSec) {
    const signatures = [];
    let before = undefined;

    while (true) {
      await this.solana.rateLimitedDelay();

      const batch = await this.solana.retryWithBackoff(async () => {
        return await this.connection.getSignaturesForAddress(this.poolPubkey, {
          limit: 1000,
          before
        });
      });

      if (batch.length === 0) break;

      let reachedBefore = false;
      for (const sig of batch) {
        if (!sig.blockTime) continue;
        if (sig.blockTime > endSec) continue;
        if (sig.blockTime < startSec) {
          reachedBefore = true;
          break;
        }
        if (sig.err) continue;
        signatures.push(sig);
      }

      if (reachedBefore) break;
      if (batch.length < 1000) break;
      before = batch[batch.length - 1].signature;
    }

    return signatures;
  }

  async fetchTransaction(signature) {
    if (this.txCache.has(signature)) return this.txCache.get(signature);

    await this.solana.rateLimitedDelay();
    const tx = await this.solana.retryWithBackoff(async () => {
      return await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed'
      });
    });

    if (tx) this.txCache.set(signature, tx);
    return tx;
  }

  async fetchTransactionsBatched(signatures, progressTracker = null, concurrency = 5) {
    const txs = [];
    for (let i = 0; i < signatures.length; i += concurrency) {
      const batch = signatures.slice(i, i + concurrency);
      const results = await Promise.all(batch.map(s => this.fetchTransaction(s.signature)));
      for (let j = 0; j < results.length; j++) {
        if (results[j]) txs.push({ sig: batch[j], tx: results[j] });
      }

      if (progressTracker) {
        const done = Math.min(i + concurrency, signatures.length);
        const pct = Math.round((done / signatures.length) * 100);
        progressTracker.addLog(`[${pct}%] Fetched ${done}/${signatures.length} txs`);
      }
    }
    return txs;
  }

  parseTransactTx(sig, tx) {
    if (!tx?.meta || tx.meta.err) return null;

    const message = tx.transaction.message;
    const accountKeys = message.accountKeys.map(k =>
      typeof k === 'string' ? k : k.pubkey.toString()
    );

    const poolIndex = accountKeys.indexOf(PRIVACY_CASH.POOL_ADDRESS);
    if (poolIndex === -1) return null;

    const prePool = tx.meta.preBalances[poolIndex];
    const postPool = tx.meta.postBalances[poolIndex];
    const poolDiff = postPool - prePool;

    if (poolDiff === 0) return null;

    const direction = poolDiff > 0 ? 'deposit' : 'withdrawal';
    const amountLamports = Math.abs(poolDiff);

    let pcInstruction = null;
    const instructions = message.instructions || [];
    for (const ix of instructions) {
      const programId = ix.programId?.toString?.() || ix.programId;
      if (programId === PRIVACY_CASH.PROGRAM_ID) {
        pcInstruction = ix;
        break;
      }
    }
    if (!pcInstruction) return null;

    const ixAccounts = (pcInstruction.accounts || []).map(a =>
      typeof a === 'string' ? a : a.toString()
    );

    const recipient = ixAccounts[PRIVACY_CASH.RECIPIENT_ACCOUNT_INDEX] || null;

    let signer = null;
    for (let i = 0; i < message.accountKeys.length; i++) {
      const key = message.accountKeys[i];
      const isSigner = typeof key === 'object' ? key.signer : false;
      if (isSigner) {
        signer = typeof key === 'string' ? key : key.pubkey.toString();
        break;
      }
    }

    return {
      signature: sig.signature,
      blockTime: sig.blockTime,
      direction,
      amountLamports,
      amountSOL: amountLamports / PRIVACY_CASH.LAMPORTS_PER_SOL,
      signer,
      recipient,
      slot: sig.slot
    };
  }

  async loadPoolActivity(startSec, endSec, progressTracker = null) {
    if (progressTracker) progressTracker.addLog(`Fetching pool signatures...`);
    const signatures = await this.fetchPoolSignaturesInRange(startSec, endSec);

    if (signatures.length === 0) return [];

    if (progressTracker) progressTracker.addLog(`Found ${signatures.length} signatures, fetching details...`);

    const rawTxs = await this.fetchTransactionsBatched(signatures, progressTracker);

    const parsed = [];
    for (const { sig, tx } of rawTxs) {
      const p = this.parseTransactTx(sig, tx);
      if (p) parsed.push(p);
    }

    parsed.sort((a, b) => a.blockTime - b.blockTime);
    return parsed;
  }

  clearCache() {
    this.txCache.clear();
  }
}

export default PrivacyCashService;
