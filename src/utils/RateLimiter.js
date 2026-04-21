const DAY_MS = 24 * 60 * 60 * 1000;

const LIMITS = {
  func1: { dailyCap: 20, cooldownMs: 0 },
  func2: { dailyCap: 20, cooldownMs: 0 },
  func3: { dailyCap: 3, cooldownMs: 3 * 60 * 1000 },
  fresh: { dailyCap: 10, cooldownMs: 0 }
};

const GLOBAL_MAX_CONCURRENT_FUNC3 = 2;

export class RateLimiter {
  constructor() {
    this.usage = new Map();
    this.globalFunc3Running = 0;
  }

  _getUser(chatId) {
    if (!this.usage.has(chatId)) {
      this.usage.set(chatId, { func1: [], func2: [], func3: [], fresh: [] });
    }
    return this.usage.get(chatId);
  }

  _prune(timestamps) {
    const cutoff = Date.now() - DAY_MS;
    while (timestamps.length > 0 && timestamps[0] < cutoff) {
      timestamps.shift();
    }
  }

  check(chatId, action) {
    const limit = LIMITS[action];
    if (!limit) return { allowed: true };

    const user = this._getUser(chatId);
    const stamps = user[action];
    this._prune(stamps);

    if (action === 'func3' && this.globalFunc3Running >= GLOBAL_MAX_CONCURRENT_FUNC3) {
      return {
        allowed: false,
        reason: 'global_busy',
        message: `⏳ *Too many scans running*\n\nTime-window scans are resource-intensive. ${this.globalFunc3Running} scans are currently running globally. Please try again in a minute.`
      };
    }

    if (limit.cooldownMs > 0 && stamps.length > 0) {
      const last = stamps[stamps.length - 1];
      const elapsed = Date.now() - last;
      if (elapsed < limit.cooldownMs) {
        const remaining = Math.ceil((limit.cooldownMs - elapsed) / 1000);
        return {
          allowed: false,
          reason: 'cooldown',
          message: `⏳ *Cooldown active*\n\nYou can run another time-window scan in *${remaining}s*.\n\n_This scan is expensive. Please wait between runs._`
        };
      }
    }

    if (stamps.length >= limit.dailyCap) {
      const oldest = stamps[0];
      const resetIn = oldest + DAY_MS - Date.now();
      const hours = Math.floor(resetIn / (60 * 60 * 1000));
      const mins = Math.floor((resetIn % (60 * 60 * 1000)) / (60 * 1000));
      return {
        allowed: false,
        reason: 'daily_cap',
        message: `🚫 *Daily limit reached*\n\nYou've used all *${limit.dailyCap}* ${this._actionLabel(action)} queries for today.\n\nResets in *${hours}h ${mins}m*.`
      };
    }

    return { allowed: true };
  }

  record(chatId, action) {
    const user = this._getUser(chatId);
    user[action].push(Date.now());
    if (action === 'func3') this.globalFunc3Running++;
  }

  release(action) {
    if (action === 'func3' && this.globalFunc3Running > 0) {
      this.globalFunc3Running--;
    }
  }

  _actionLabel(action) {
    return {
      func1: 'recipient lookup',
      func2: 'sender lookup',
      func3: 'time-window scan',
      fresh: 'fresh wallet scan'
    }[action] || action;
  }

  getStats(chatId) {
    const user = this._getUser(chatId);
    const stats = {};
    for (const [action, limit] of Object.entries(LIMITS)) {
      this._prune(user[action]);
      stats[action] = {
        used: user[action].length,
        cap: limit.dailyCap,
        remaining: limit.dailyCap - user[action].length
      };
    }
    return stats;
  }
}

export default RateLimiter;
