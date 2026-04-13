import { STATES } from '../constants/states.js';

/**
 * User session state model for Telegram bot
 */
export class UserSession {
  constructor(chatId) {
    this.chatId = chatId;
    this.state = STATES.IDLE;
    this.selectedExchanges = [];  // Array of selected exchange keys (e.g., ['binance', 'okx'])
    this.scanType = null;          // Scan type: 'simple' | 'hopping'
    this.filter = null;            // Filter config: {type: 'range'|'target', min, max, value, tolerance}
    this.timeRange = null;         // Time range in hours: 3 | 6 | 12 | 24 (1 day) | 48 (2 days) | 72 (3 days) | custom (max 72)

    // Privacy Cash Scanner state
    this.pcFunction = null;        // 'func1' | 'func2' | 'func3'
    this.pcDate = null;            // Date object (UTC) representing the day selected for func3
    this.pcTimeRange = null;       // { startSec: number, endSec: number } UTC seconds
    this.pcResults = null;         // Latest scan result object
    this.pcPage = 0;               // Current page in paginated results

    this.createdAt = new Date();
    this.lastActivity = new Date();
  }

  setState(newState) {
    this.state = newState;
    this.lastActivity = new Date();
  }

  toggleExchange(exchangeKey) {
    const index = this.selectedExchanges.indexOf(exchangeKey);
    if (index === -1) {
      // Add exchange
      this.selectedExchanges.push(exchangeKey);
    } else {
      // Remove exchange
      this.selectedExchanges.splice(index, 1);
    }
    this.lastActivity = new Date();
  }

  isExchangeSelected(exchangeKey) {
    return this.selectedExchanges.includes(exchangeKey);
  }

  setScanType(scanType) {
    this.scanType = scanType;
    this.lastActivity = new Date();
  }

  setFilter(filterConfig) {
    this.filter = filterConfig;
    this.lastActivity = new Date();
  }

  setTimeRange(hours) {
    this.timeRange = hours;
    this.lastActivity = new Date();
  }

  reset() {
    this.state = STATES.IDLE;
    this.selectedExchanges = [];
    this.scanType = null;
    this.filter = null;
    this.timeRange = null;
    this.pcFunction = null;
    this.pcDate = null;
    this.pcTimeRange = null;
    this.pcResults = null;
    this.pcPage = 0;
    this.lastActivity = new Date();
  }

  toJSON() {
    return {
      chatId: this.chatId,
      state: this.state,
      selectedExchanges: this.selectedExchanges,
      scanType: this.scanType,
      filter: this.filter,
      timeRange: this.timeRange,
      createdAt: this.createdAt,
      lastActivity: this.lastActivity
    };
  }
}

export default UserSession;
