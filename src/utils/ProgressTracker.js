/**
 * Progress Tracker for real-time scan updates
 * Captures important logs and provides periodic updates
 */
export class ProgressTracker {
  constructor() {
    this.logs = [];
    this.lastLog = null;
    this.stats = {
      walletsScanned: 0,
      freshWalletsFound: 0,
      currentExchange: '',
      currentPhase: '',
      totalWallets: 0,
      apiRequests: 0,
      isPhase1: false,
      isPhase2: false
    };
    this.startTime = null;
  }

  /**
   * Start tracking progress
   */
  start(totalWallets, exchanges) {
    this.startTime = Date.now();
    this.stats.totalWallets = totalWallets;
    this.stats.currentPhase = 'Initializing';
    this.addLog(`🚀 Starting scan: ${totalWallets} wallet(s) across ${exchanges} exchange(s)`);
  }

  /**
   * Add a log entry
   */
  addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      message,
      type,
      timestamp,
      time: Date.now()
    };

    this.logs.push(logEntry);
    this.lastLog = logEntry;

    // Keep only last 50 logs to avoid memory issues
    if (this.logs.length > 50) {
      this.logs.shift();
    }
  }

  /**
   * Update current phase
   */
  setPhase(phase) {
    this.stats.currentPhase = phase;
    this.addLog(`📊 ${phase}`);

    // Track which phase we're in for different update intervals
    if (phase.includes('Phase 1')) {
      this.stats.isPhase1 = true;
      this.stats.isPhase2 = false;
    } else if (phase.includes('Phase 2')) {
      this.stats.isPhase1 = false;
      this.stats.isPhase2 = true;
    }
  }

  /**
   * Check if we're in phase 1 (transaction collection)
   */
  isInPhase1() {
    return this.stats.isPhase1 === true;
  }

  /**
   * Check if we're in phase 2 (fresh wallet analysis)
   */
  isInPhase2() {
    return this.stats.isPhase2 === true;
  }

  /**
   * Update current exchange being scanned
   */
  setCurrentExchange(exchange) {
    this.stats.currentExchange = exchange;
    this.addLog(`🔍 Scanning ${exchange}...`);
  }

  /**
   * Increment wallets scanned counter
   */
  incrementWalletsScanned(count = 1) {
    this.stats.walletsScanned += count;
  }

  /**
   * Increment fresh wallets found counter
   */
  incrementFreshWallets(count = 1) {
    this.stats.freshWalletsFound += count;
  }

  /**
   * Update API request count
   */
  setApiRequests(count) {
    this.stats.apiRequests = count;
  }

  /**
   * Get elapsed time in seconds
   */
  getElapsedTime() {
    if (!this.startTime) return 0;
    return ((Date.now() - this.startTime) / 1000).toFixed(1);
  }

  /**
   * Get progress percentage
   */
  getProgress() {
    if (this.stats.totalWallets === 0) return 0;
    return Math.round((this.stats.walletsScanned / this.stats.totalWallets) * 100);
  }

  /**
   * Get last log message
   */
  getLastLog() {
    return this.lastLog;
  }

  /**
   * Get formatted status message for Telegram
   */
  getStatusMessage() {
    const lastLogText = this.lastLog ? this.lastLog.message : 'Starting...';

    // Phase 1: Show last log (wallet being scanned with exchange name)
    if (this.isInPhase1()) {
      return `${lastLogText}`;
    }

    // Phase 2: Show only progress percentage with format from console
    if (this.isInPhase2()) {
      // Extract percentage and counts from last log if it's a progress log
      // Format: ExchangeName - [X%] analyzed/total analyzed (cached, fresh)
      const logMatch = lastLogText.match(/(.+?)\s+-\s+\[(\d+)%\]\s+(\d+)\/(\d+)\s+analyzed\s+\((\d+)\s+from cache,\s+(\d+)\s+fresh\)/);

      if (logMatch) {
        const [, exchange, percentage, analyzed, total, cached, fresh] = logMatch;

        // If cached is 0, don't show "from cache" part
        if (cached === '0') {
          return `${exchange} - [${percentage}%] ${analyzed}/${total} analyzed (${fresh} fresh)`;
        } else {
          return `${exchange} - [${percentage}%] ${analyzed}/${total} analyzed (${cached} from cache, ${fresh} fresh)`;
        }
      }

      // If log doesn't match the progress format, keep the last valid message
      // Don't change to fallback - just return the current log
      return lastLogText;
    }

    // Default message
    return lastLogText;
  }

  /**
   * Get recent logs (last N)
   */
  getRecentLogs(count = 5) {
    return this.logs.slice(-count);
  }

  /**
   * Clear all logs and reset stats
   */
  reset() {
    this.logs = [];
    this.lastLog = null;
    this.stats = {
      walletsScanned: 0,
      freshWalletsFound: 0,
      currentExchange: '',
      currentPhase: '',
      totalWallets: 0,
      apiRequests: 0
    };
    this.startTime = null;
  }
}

export default ProgressTracker;
