import { PRIVACY_CASH } from '../constants/privacyCash.js';

export class PrivacyCashDetector {
  constructor(privacyCashService) {
    this.service = privacyCashService;
  }

  computeTolerance(depositLamports) {
    const pctTolerance = Math.floor(depositLamports * PRIVACY_CASH.TOLERANCE_PERCENT);
    return Math.max(PRIVACY_CASH.MIN_TOLERANCE_LAMPORTS, pctTolerance);
  }

  findSubsetSum(candidates, targetLamports, toleranceLamports) {
    const sorted = [...candidates].sort((a, b) => b.amountLamports - a.amountLamports);

    const lower = targetLamports - toleranceLamports;
    const upper = targetLamports;

    let exactMatch = null;
    let fuzzyMatch = null;
    let fuzzyDelta = Infinity;

    const maxDepth = PRIVACY_CASH.SUBSET_MAX_SIZE;

    const backtrack = (startIdx, currentSum, picked) => {
      if (exactMatch) return;

      if (currentSum > upper) return;

      if (currentSum >= lower && currentSum <= upper) {
        if (currentSum === targetLamports) {
          exactMatch = [...picked];
          return;
        }
        const delta = targetLamports - currentSum;
        if (delta < fuzzyDelta) {
          fuzzyDelta = delta;
          fuzzyMatch = [...picked];
        }
      }

      if (picked.length >= maxDepth) return;

      for (let i = startIdx; i < sorted.length; i++) {
        const item = sorted[i];
        const newSum = currentSum + item.amountLamports;
        if (newSum > upper) continue;
        picked.push(item);
        backtrack(i + 1, newSum, picked);
        picked.pop();
        if (exactMatch) return;
      }
    };

    backtrack(0, 0, []);

    return exactMatch || fuzzyMatch || null;
  }

  async detectRecipients(depositSignature, progressTracker = null) {
    if (progressTracker) progressTracker.addLog(`Fetching input transaction...`);
    const inputTx = await this.service.fetchTransaction(depositSignature);
    if (!inputTx) throw new Error('Input transaction not found');

    const parsed = this.service.parseTransactTx(
      { signature: depositSignature, blockTime: inputTx.blockTime, slot: inputTx.slot },
      inputTx
    );
    if (!parsed) throw new Error('Input tx does not interact with Privacy Cash pool');
    if (parsed.direction !== 'deposit') throw new Error('Input tx is not a deposit — use function 2 instead');

    const depositLamports = parsed.amountLamports;
    const depositTime = parsed.blockTime;
    const senderWallet = parsed.signer;

    const startSec = depositTime;
    const endSec = depositTime + PRIVACY_CASH.FUNC1_FORWARD_WINDOW_SEC;

    if (progressTracker) progressTracker.addLog(`Loading pool activity (+5min window)...`);
    const activity = await this.service.loadPoolActivity(startSec, endSec, progressTracker);

    const withdrawals = activity.filter(
      t => t.direction === 'withdrawal' && t.signature !== depositSignature
    );

    if (withdrawals.length === 0) {
      return {
        sender: senderWallet,
        depositSOL: parsed.amountSOL,
        recipients: [],
        bridged: true,
        matchedWithdrawals: []
      };
    }

    const tolerance = this.computeTolerance(depositLamports);
    const matched = this.findSubsetSum(withdrawals, depositLamports, tolerance);

    if (!matched) {
      return {
        sender: senderWallet,
        depositSOL: parsed.amountSOL,
        recipients: [],
        bridged: true,
        matchedWithdrawals: []
      };
    }

    const recipients = matched.map(w => ({
      wallet: w.recipient,
      amountSOL: w.amountSOL,
      signature: w.signature,
      blockTime: w.blockTime
    }));

    return {
      sender: senderWallet,
      depositSOL: parsed.amountSOL,
      recipients,
      bridged: false,
      matchedWithdrawals: matched
    };
  }

  async detectSender(withdrawalSignature, progressTracker = null) {
    if (progressTracker) progressTracker.addLog(`Fetching input transaction...`);
    const inputTx = await this.service.fetchTransaction(withdrawalSignature);
    if (!inputTx) throw new Error('Input transaction not found');

    const parsed = this.service.parseTransactTx(
      { signature: withdrawalSignature, blockTime: inputTx.blockTime, slot: inputTx.slot },
      inputTx
    );
    if (!parsed) throw new Error('Input tx does not interact with Privacy Cash pool');
    if (parsed.direction !== 'withdrawal') throw new Error('Input tx is not a withdrawal — use function 1 instead');

    const withdrawalLamports = parsed.amountLamports;
    const withdrawalTime = parsed.blockTime;
    const recipientWallet = parsed.recipient;

    const startSec = withdrawalTime - PRIVACY_CASH.FUNC2_WINDOW_SEC;
    const endSec = withdrawalTime + PRIVACY_CASH.FUNC2_WINDOW_SEC;

    if (progressTracker) progressTracker.addLog(`Loading pool activity (±3min window)...`);
    const activity = await this.service.loadPoolActivity(startSec, endSec, progressTracker);

    const deposits = activity.filter(t => t.direction === 'deposit');
    const otherWithdrawals = activity.filter(
      t => t.direction === 'withdrawal' && t.signature !== withdrawalSignature
    );

    if (deposits.length === 0) {
      return {
        recipient: recipientWallet,
        withdrawalSOL: parsed.amountSOL,
        senders: [],
        bridged: true
      };
    }

    const candidates = [];
    for (const deposit of deposits) {
      const remaining = deposit.amountLamports - withdrawalLamports;
      if (remaining < 0) {
        const tolerance = this.computeTolerance(deposit.amountLamports);
        if (Math.abs(remaining) <= tolerance) {
          candidates.push({
            deposit,
            matchedWithdrawals: [parsed],
            delta: Math.abs(remaining)
          });
        }
        continue;
      }
      if (remaining === 0) {
        candidates.push({ deposit, matchedWithdrawals: [parsed], delta: 0 });
        continue;
      }

      const tolerance = this.computeTolerance(deposit.amountLamports);
      const subset = this.findSubsetSum(otherWithdrawals, remaining, tolerance);
      if (subset) {
        const totalSum = subset.reduce((s, w) => s + w.amountLamports, 0) + withdrawalLamports;
        const delta = deposit.amountLamports - totalSum;
        candidates.push({
          deposit,
          matchedWithdrawals: [parsed, ...subset],
          delta
        });
      }
    }

    if (candidates.length === 0) {
      return {
        recipient: recipientWallet,
        withdrawalSOL: parsed.amountSOL,
        senders: [],
        bridged: true
      };
    }

    candidates.sort((a, b) => {
      const aExact = a.delta === 0 ? 0 : 1;
      const bExact = b.delta === 0 ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      const aTime = Math.abs(a.deposit.blockTime - withdrawalTime);
      const bTime = Math.abs(b.deposit.blockTime - withdrawalTime);
      return aTime - bTime;
    });

    const best = candidates[0];

    const coRecipients = best.matchedWithdrawals
      .filter(w => w.signature !== withdrawalSignature)
      .map(w => ({
        wallet: w.recipient,
        amountSOL: w.amountSOL,
        signature: w.signature,
        blockTime: w.blockTime
      }));

    return {
      recipient: recipientWallet,
      withdrawalSOL: parsed.amountSOL,
      senders: [{
        wallet: best.deposit.signer,
        amountSOL: best.deposit.amountSOL,
        signature: best.deposit.signature,
        blockTime: best.deposit.blockTime
      }],
      coRecipients,
      matchedWithdrawals: best.matchedWithdrawals,
      bridged: false
    };
  }

  async detectAllInRange(startSec, endSec, progressTracker = null) {
    const paddedEnd = endSec + PRIVACY_CASH.FUNC1_FORWARD_WINDOW_SEC;

    if (progressTracker) progressTracker.addLog(`Loading pool activity for range + 5min padding...`);
    const activity = await this.service.loadPoolActivity(startSec, paddedEnd, progressTracker);

    const depositsInRange = activity.filter(
      t => t.direction === 'deposit' && t.blockTime >= startSec && t.blockTime <= endSec
    );

    const pairs = [];
    let processed = 0;

    for (const deposit of depositsInRange) {
      processed++;
      if (progressTracker && processed % 3 === 0) {
        progressTracker.addLog(`Matching deposit ${processed}/${depositsInRange.length}...`);
      }

      const windowEnd = deposit.blockTime + PRIVACY_CASH.FUNC1_FORWARD_WINDOW_SEC;
      const candidateWithdrawals = activity.filter(
        t => t.direction === 'withdrawal' &&
             t.blockTime >= deposit.blockTime &&
             t.blockTime <= windowEnd
      );

      if (candidateWithdrawals.length === 0) {
        pairs.push({
          sender: deposit.signer,
          depositSOL: deposit.amountSOL,
          depositTime: deposit.blockTime,
          depositSignature: deposit.signature,
          recipients: [],
          bridged: true
        });
        continue;
      }

      const tolerance = this.computeTolerance(deposit.amountLamports);
      const matched = this.findSubsetSum(candidateWithdrawals, deposit.amountLamports, tolerance);

      if (!matched) {
        pairs.push({
          sender: deposit.signer,
          depositSOL: deposit.amountSOL,
          depositTime: deposit.blockTime,
          depositSignature: deposit.signature,
          recipients: [],
          bridged: true
        });
        continue;
      }

      pairs.push({
        sender: deposit.signer,
        depositSOL: deposit.amountSOL,
        depositTime: deposit.blockTime,
        depositSignature: deposit.signature,
        recipients: matched.map(w => ({
          wallet: w.recipient,
          amountSOL: w.amountSOL,
          signature: w.signature,
          blockTime: w.blockTime
        })),
        bridged: false
      });
    }

    return {
      startSec,
      endSec,
      totalDeposits: depositsInRange.length,
      pairs
    };
  }
}

export default PrivacyCashDetector;
