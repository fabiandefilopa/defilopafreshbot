/**
 * Result of fresh wallet detection
 */
export class FreshWalletResult {
  constructor({
    isFresh,
    finalWallet,
    path,
    reason,
    exchange,
    amount,
    signature,
    timestamp
  }) {
    this.isFresh = isFresh;           // boolean
    this.finalWallet = finalWallet;   // string (wallet address)
    this.path = path;                 // string[] (chain of wallets)
    this.reason = reason;             // string (explanation)
    this.exchange = exchange;         // string (exchange name)
    this.hops = path.length - 1;      // number of jumps
    this.amount = amount;             // number (SOL amount)
    this.signature = signature;       // string (tx signature)
    this.timestamp = timestamp;       // Date
  }

  toJSON() {
    return {
      isFresh: this.isFresh,
      finalWallet: this.finalWallet,
      path: this.path,
      reason: this.reason,
      exchange: this.exchange,
      hops: this.hops,
      amount: this.amount,
      signature: this.signature,
      timestamp: this.timestamp
    };
  }
}

export default FreshWalletResult;
