import TelegramBot from 'node-telegram-bot-api';
import { UserSession } from '../models/UserSession.js';
import { FreshWalletDetector } from '../core/FreshWalletDetector.js';
import { ProgressTracker } from '../utils/ProgressTracker.js';
import { STATES } from '../constants/states.js';
import { MESSAGES } from '../constants/messages.js';

/**
 * Telegram Bot Service with state machine and hierarchical menus
 */
class TelegramBotService {
  constructor(token, solanaService, exchangeConfig, botInstance = null) {
    // Use provided bot instance or create new one with polling
    this.bot = botInstance || new TelegramBot(token, { polling: true });
    this.solanaService = solanaService;
    this.exchangeConfig = exchangeConfig;

    this.sessions = new Map(); // chatId -> UserSession

    // Only setup event handlers for polling mode (not for webhooks)
    if (!botInstance) {
      this.setupHandlers();
    }
  }

  setupHandlers() {
    // Commands
    this.bot.onText(/\/start/, (msg) => this.handleStart(msg));
    this.bot.onText(/\/cancel/, (msg) => this.handleCancel(msg));
    this.bot.onText(/\/help/, (msg) => this.handleHelp(msg));

    // Callback queries (button clicks)
    this.bot.on('callback_query', (query) => this.handleCallbackQuery(query));

    // Text messages (for filter input)
    this.bot.on('message', (msg) => this.handleTextMessage(msg));
  }

  getSession(chatId) {
    if (!this.sessions.has(chatId)) {
      this.sessions.set(chatId, new UserSession(chatId));
    }
    return this.sessions.get(chatId);
  }

  async handleStart(msg) {
    const chatId = msg.chat.id;
    const session = this.getSession(chatId);
    session.setState(STATES.FEATURE_SELECTION);

    // Send welcome message with inline keyboard
    const keyboard = {
      inline_keyboard: [
        [{ text: '🆕 Fresh Wallet Scanner', callback_data: 'feature_fresh' }],
        [{ text: '🛡️ Privacy Cash Scanner', callback_data: 'feature_privacy' }],
        [{ text: '🔔 Alerts (Coming Soon)', callback_data: 'feature_alerts_soon' }]
      ]
    };

    await this.bot.sendMessage(chatId, MESSAGES.WELCOME, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  async handleHelp(msg) {
    const chatId = msg.chat.id;
    await this.bot.sendMessage(chatId, MESSAGES.HELP, { parse_mode: 'Markdown' });
  }

  async handleCallbackQuery(query) {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;
    const session = this.getSession(chatId);

    // Answer callback query with error handling
    try {
      await this.bot.answerCallbackQuery(query.id);
    } catch (error) {
      // Ignore "query is too old" errors - they're not critical
      if (error.message?.includes('query is too old') || error.message?.includes('query ID is invalid')) {
        console.log('⚠️  Callback query expired (user waited too long), continuing anyway');
      } else {
        console.error('❌ Error answering callback query:', error.message);
      }
      // Continue processing the callback even if answer fails
    }

    // Route based on callback data
    if (data === 'feature_fresh') {
      await this.showExchangeSelection(chatId, session);
    } else if (data === 'feature_privacy') {
      await this.showPrivacyCashMenu(chatId, session);
    } else if (data.startsWith('feature_') && data.endsWith('_soon')) {
      await this.bot.sendMessage(chatId, '⏰ Coming soon! Stay tuned.');
    } else if (data.startsWith('toggle_exchange_')) {
      const exchangeKey = data.replace('toggle_exchange_', '');
      session.toggleExchange(exchangeKey);
      // Update the message with new button states
      await this.updateExchangeSelection(chatId, messageId, session);
    } else if (data === 'select_all') {
      // Select all exchanges with wallets
      const exchanges = this.exchangeConfig.exchanges;
      for (const [key, ex] of Object.entries(exchanges)) {
        if (ex.wallets.length > 0 && !session.isExchangeSelected(key)) {
          session.toggleExchange(key);
        }
      }
      await this.updateExchangeSelection(chatId, messageId, session);
    } else if (data === 'deselect_all') {
      // Deselect all exchanges
      session.selectedExchanges = [];
      await this.updateExchangeSelection(chatId, messageId, session);
    } else if (data === 'continue_to_scan_type') {
      await this.showScanTypeSelection(chatId, session);
    } else if (data === 'scan_type_simple') {
      session.setScanType('simple');
      await this.showFilterInput(chatId, session);
    } else if (data === 'scan_type_hopping') {
      session.setScanType('hopping');
      await this.showFilterInput(chatId, session);
    } else if (data === 'time_range_3hours') {
      session.setTimeRange(3);
      await this.showScanConfirmation(chatId, session);
    } else if (data === 'time_range_6hours') {
      session.setTimeRange(6);
      await this.showScanConfirmation(chatId, session);
    } else if (data === 'time_range_12hours') {
      session.setTimeRange(12);
      await this.showScanConfirmation(chatId, session);
    } else if (data === 'time_range_1day') {
      session.setTimeRange(24);
      await this.showScanConfirmation(chatId, session);
    } else if (data === 'time_range_2days') {
      session.setTimeRange(48);
      await this.showScanConfirmation(chatId, session);
    } else if (data === 'time_range_3days') {
      session.setTimeRange(72);
      await this.showScanConfirmation(chatId, session);
    } else if (data === 'time_range_custom') {
      await this.showCustomTimeInput(chatId, session);
    } else if (data.startsWith('exchange_disabled_')) {
      await this.bot.sendMessage(chatId, '⚠️ No wallets configured for this exchange');
    } else if (data === 'scan_now' || data === 'run_again') {
      await this.executeScan(chatId, session);
    } else if (data === 'change_filter') {
      session.setState(STATES.FILTER_INPUT);
      await this.bot.sendMessage(chatId, MESSAGES.ENTER_FILTER, { parse_mode: 'Markdown' });
    } else if (data === 'back_to_exchanges') {
      await this.showExchangeSelection(chatId, session);
    } else if (data === 'back_to_features') {
      await this.handleStart({ chat: { id: chatId } });
    }
  }

  async showPrivacyCashMenu(chatId, session) {
    session.setState(STATES.FEATURE_SELECTION);

    const keyboard = {
      inline_keyboard: [
        [{ text: '⏰ Coming Soon', callback_data: 'feature_privacy_soon' }],
        [{ text: '⬅️ Back', callback_data: 'back_to_features' }]
      ]
    };

    await this.bot.sendMessage(chatId, MESSAGES.PRIVACY_CASH_MENU, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  async showExchangeSelection(chatId, session) {
    session.setState(STATES.EXCHANGE_SELECTION);

    const exchanges = this.exchangeConfig.exchanges;
    const buttons = [];

    // Exchange toggle buttons (2 per row)
    const exchangeEntries = Object.entries(exchanges);
    for (let i = 0; i < exchangeEntries.length; i += 2) {
      const row = [];

      for (let j = 0; j < 2 && (i + j) < exchangeEntries.length; j++) {
        const [key, ex] = exchangeEntries[i + j];
        const walletCount = ex.wallets.length;
        const isSelected = session.isExchangeSelected(key);
        const hasWallets = walletCount > 0;

        // Status indicator: 🟢 selected, 🔴 not selected, ⚪ no wallets
        const statusIndicator = !hasWallets ? '⚪' : (isSelected ? '🟢' : '🔴');
        const walletInfo = hasWallets ? `(${walletCount})` : '(0)';
        const text = `${statusIndicator} ${ex.emoji} ${ex.name} ${walletInfo}`;

        row.push({
          text,
          callback_data: hasWallets ? `toggle_exchange_${key}` : `exchange_disabled_${key}`
        });
      }

      buttons.push(row);
    }

    // Select All / Deselect All buttons
    const exchangesWithWallets = Object.entries(exchanges).filter(([key, ex]) => ex.wallets.length > 0);
    const allSelected = exchangesWithWallets.length > 0 &&
                        exchangesWithWallets.every(([key]) => session.isExchangeSelected(key));

    const selectAllButtons = [];
    if (!allSelected) {
      selectAllButtons.push({ text: '✅ Select All', callback_data: 'select_all' });
    }
    if (session.selectedExchanges.length > 0) {
      selectAllButtons.push({ text: '❌ Deselect All', callback_data: 'deselect_all' });
    }

    if (selectAllButtons.length > 0) {
      buttons.push(selectAllButtons);
    }

    // Continue button (only if at least one exchange is selected)
    const hasSelection = session.selectedExchanges.length > 0;
    if (hasSelection) {
      buttons.push([{
        text: '✅ Continue to Scan Type',
        callback_data: 'continue_to_scan_type'
      }]);
    }

    buttons.push([{ text: '⬅️ Back', callback_data: 'back_to_features' }]);

    const selectedCount = session.selectedExchanges.length;
    const message = selectedCount > 0
      ? `${MESSAGES.SELECT_EXCHANGE}\n\n✅ *${selectedCount} exchange(s) selected*`
      : MESSAGES.SELECT_EXCHANGE;

    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons }
    });
  }

  async updateExchangeSelection(chatId, messageId, session) {
    const exchanges = this.exchangeConfig.exchanges;
    const buttons = [];

    // Exchange toggle buttons (2 per row)
    const exchangeEntries = Object.entries(exchanges);
    for (let i = 0; i < exchangeEntries.length; i += 2) {
      const row = [];

      for (let j = 0; j < 2 && (i + j) < exchangeEntries.length; j++) {
        const [key, ex] = exchangeEntries[i + j];
        const walletCount = ex.wallets.length;
        const isSelected = session.isExchangeSelected(key);
        const hasWallets = walletCount > 0;

        const statusIndicator = !hasWallets ? '⚪' : (isSelected ? '🟢' : '🔴');
        const walletInfo = hasWallets ? `(${walletCount})` : '(0)';
        const text = `${statusIndicator} ${ex.emoji} ${ex.name} ${walletInfo}`;

        row.push({
          text,
          callback_data: hasWallets ? `toggle_exchange_${key}` : `exchange_disabled_${key}`
        });
      }

      buttons.push(row);
    }

    // Select All / Deselect All buttons
    const exchangesWithWallets = Object.entries(exchanges).filter(([, ex]) => ex.wallets.length > 0);
    const allSelected = exchangesWithWallets.length > 0 &&
                        exchangesWithWallets.every(([key]) => session.isExchangeSelected(key));

    const selectAllButtons = [];
    if (!allSelected) {
      selectAllButtons.push({ text: '✅ Select All', callback_data: 'select_all' });
    }
    if (session.selectedExchanges.length > 0) {
      selectAllButtons.push({ text: '❌ Deselect All', callback_data: 'deselect_all' });
    }

    if (selectAllButtons.length > 0) {
      buttons.push(selectAllButtons);
    }

    // Continue button (only if at least one exchange is selected)
    const hasSelection = session.selectedExchanges.length > 0;
    if (hasSelection) {
      buttons.push([{
        text: '✅ Continue to Scan Type',
        callback_data: 'continue_to_scan_type'
      }]);
    }

    buttons.push([{ text: '⬅️ Back', callback_data: 'back_to_features' }]);

    const selectedCount = session.selectedExchanges.length;
    const message = selectedCount > 0
      ? `${MESSAGES.SELECT_EXCHANGE}\n\n✅ *${selectedCount} exchange(s) selected*`
      : MESSAGES.SELECT_EXCHANGE;

    await this.bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons }
    });
  }

  async showScanTypeSelection(chatId, session) {
    session.setState(STATES.SCAN_TYPE_SELECTION);

    const exchangeNames = session.selectedExchanges
      .map(key => this.exchangeConfig.exchanges[key].name)
      .join(', ');

    const keyboard = {
      inline_keyboard: [
        [{
          text: '⚡ Fresh Wallets (Simple)',
          callback_data: 'scan_type_simple'
        }],
        [{
          text: '🔗 Fresh Wallets with Hopping',
          callback_data: 'scan_type_hopping'
        }],
        [{ text: '⬅️ Back to Exchanges', callback_data: 'back_to_exchanges' }],
        [{ text: '❌ Cancel', callback_data: 'back_to_features' }]
      ]
    };

    await this.bot.sendMessage(
      chatId,
      `🔍 *Select Scan Type*\n\n` +
      `Selected Exchanges: *${exchangeNames}*\n\n` +
      `⚡ *Fresh Wallets (Simple)*\n` +
      `   • Fast scan\n` +
      `   • Detects wallets that received funds and never moved them\n` +
      `   • No intermediate wallet tracking\n\n` +
      `🔗 *Fresh Wallets with Hopping*\n` +
      `   • Complete and thorough scan\n` +
      `   • A "hop" is when a wallet receives funds and immediately sends them to another wallet, like a chain of middlemen\n` +
      `   • Example: Exchange → Wallet A → Wallet B → Wallet C\n` +
      `     That's 2 hops. The bot follows the money trail up to 3 hops to find the final destination wallet\n` +
      `   • Useful to detect wallets that try to hide their origin by passing funds through intermediaries\n` +
      `   • Slower but catches wallets that Simple mode would miss`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
  }

  async showFilterInput(chatId, session) {
    if (session.selectedExchanges.length === 0) {
      await this.bot.sendMessage(chatId, '❌ Please select at least one exchange first');
      return;
    }

    if (!session.scanType) {
      await this.bot.sendMessage(chatId, '❌ Please select scan type first');
      return;
    }

    session.setState(STATES.FILTER_INPUT);

    const exchangeNames = session.selectedExchanges
      .map(key => this.exchangeConfig.exchanges[key].name)
      .join(', ');

    const scanTypeText = session.scanType === 'simple'
      ? '⚡ Fresh Wallets (Simple)'
      : '🔗 Fresh Wallets with Hopping';

    const keyboard = {
      inline_keyboard: [
        [{ text: '⬅️ Back to Scan Type', callback_data: 'continue_to_scan_type' }],
        [{ text: '❌ Cancel', callback_data: 'back_to_features' }]
      ]
    };

    await this.bot.sendMessage(
      chatId,
      `🔍 *Fresh Wallet Scanner*\n\n` +
      `Selected Exchanges: *${exchangeNames}*\n` +
      `Scan Type: *${scanTypeText}*\n\n` +
      `${MESSAGES.ENTER_FILTER}`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
    console.log('📤 Filter input message sent. Waiting for user input...\n');
  }

  async handleTextMessage(msg) {
    if (!msg.text) return;

    const chatId = msg.chat.id;
    const session = this.getSession(chatId);

    // Handle Menu button
    if (msg.text === '📋 Menu') {
      await this.handleStart(msg);
      return;
    }

    // Ignore other commands
    if (msg.text.startsWith('/')) return;

    console.log(`📝 Text message received: "${msg.text}"`);
    console.log(`📊 Current state: ${session.state}`);

    if (session.state === STATES.FILTER_INPUT) {
      console.log('✅ Processing filter input...');
      await this.handleFilterInput(chatId, session, msg.text);
    } else if (session.state === STATES.CUSTOM_TIME_INPUT) {
      console.log('✅ Processing custom time input...');
      await this.handleCustomTimeInput(chatId, session, msg.text);
    } else {
      console.log(`❌ State mismatch. Ignoring message.`);
    }
  }

  async handleFilterInput(chatId, session, text) {
    console.log(`🔍 Processing filter input: "${text}"`);
    const parts = text.trim().split(/\s+/);
    console.log(`📊 Parts: [${parts.join(', ')}] (length: ${parts.length})`);

    let filter;
    if (parts.length === 2) {
      // Range
      const min = parseFloat(parts[0]);
      const max = parseFloat(parts[1]);
      console.log(`📐 Range detected: min=${min}, max=${max}`);

      if (isNaN(min) || isNaN(max) || min >= max || min < 0) {
        console.log('❌ Invalid range detected');
        await this.bot.sendMessage(chatId, '❌ Invalid range. Example: 1 3');
        return;
      }

      // Validate range difference (max 8 SOL)
      if (max - min > 8) {
        console.log('❌ Range too wide (max 8 SOL difference)');
        await this.bot.sendMessage(chatId, '❌ Range too wide. Maximum difference is 8 SOL. Example: 1 9');
        return;
      }

      filter = { type: 'range', min, max };
      console.log('✅ Valid range filter created');
    } else if (parts.length === 1) {
      // Target
      const target = parseFloat(parts[0]);
      console.log(`🎯 Target detected: ${target}`);

      if (isNaN(target) || target <= 0) {
        console.log('❌ Invalid target detected');
        await this.bot.sendMessage(chatId, '❌ Invalid target. Example: 2.5');
        return;
      }

      filter = { type: 'target', value: target, tolerance: 0.10 };
      console.log('✅ Valid target filter created');
    } else {
      console.log('❌ Invalid format - wrong number of parts');
      await this.bot.sendMessage(chatId, '❌ Invalid format. Send: "1 3" or "2.5"');
      return;
    }

    console.log(`💾 Saving filter: ${JSON.stringify(filter)}`);
    session.setFilter(filter);
    session.setState(STATES.TIME_RANGE_SELECTION);

    console.log('📤 Showing time range selection...');
    await this.showTimeRangeSelection(chatId, session);
  }

  async showTimeRangeSelection(chatId, session) {
    session.setState(STATES.TIME_RANGE_SELECTION);

    const exchangeNames = session.selectedExchanges
      .map(key => this.exchangeConfig.exchanges[key].name)
      .join(', ');

    const scanTypeText = session.scanType === 'simple'
      ? '⚡ Fresh Wallets (Simple)'
      : '🔗 Fresh Wallets with Hopping';

    const filter = session.filter;
    let filterText;
    if (filter.type === 'range') {
      filterText = `${filter.min} - ${filter.max} SOL`;
    } else {
      const min = filter.value * (1 - filter.tolerance);
      const max = filter.value * (1 + filter.tolerance);
      filterText = `~${filter.value} SOL (${min.toFixed(4)} - ${max.toFixed(4)})`;
    }

    const keyboard = {
      inline_keyboard: [
        [
          { text: '⏰ 3h', callback_data: 'time_range_3hours' },
          { text: '⏰ 6h', callback_data: 'time_range_6hours' },
          { text: '⏰ 12h', callback_data: 'time_range_12hours' }
        ],
        [
          { text: '📅 1 Day', callback_data: 'time_range_1day' },
          { text: '📅 2 Days', callback_data: 'time_range_2days' },
          { text: '📅 3 Days', callback_data: 'time_range_3days' }
        ],
        [{ text: '⚙️ Custom (max 3 days)', callback_data: 'time_range_custom' }],
        [{ text: '⬅️ Back to Filter', callback_data: 'change_filter' }],
        [{ text: '❌ Cancel', callback_data: 'back_to_features' }]
      ]
    };

    await this.bot.sendMessage(
      chatId,
      `⏱️ *Select Time Range*\n\n` +
      `Selected Exchanges: *${exchangeNames}*\n` +
      `Scan Type: *${scanTypeText}*\n` +
      `Filter: ${filterText}\n\n` +
      `How far back should we search for transactions?`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
  }

  async showCustomTimeInput(chatId, session) {
    session.setState(STATES.CUSTOM_TIME_INPUT);

    const keyboard = {
      inline_keyboard: [
        [{ text: '⬅️ Back to Time Range', callback_data: 'change_filter' }],
        [{ text: '❌ Cancel', callback_data: 'back_to_features' }]
      ]
    };

    await this.bot.sendMessage(
      chatId,
      `⏱️ *Custom Time Range*\n\n` +
      `Enter your custom time range (max 3 days):\n\n` +
      `*Supported formats:*\n` +
      `• Minutes: \`30m\`, \`45 minutes\`, \`1 minute\`\n` +
      `• Hours: \`1h\`, \`12 hours\`, \`24 hour\`\n` +
      `• Days: \`1d\`, \`2 days\`, \`3 day\`\n\n` +
      `*Examples:*\n` +
      `• \`1h\` → 1 hour\n` +
      `• \`30m\` → 30 minutes\n` +
      `• \`2d\` → 2 days\n` +
      `• \`12 hours\` → 12 hours\n\n` +
      `⚠️ Maximum: 3 days (72 hours)`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
  }

  /**
   * Parse custom time input to hours
   * Supports: 1h, 1m, 1d, 1 hour, 1 minute, 1 day, etc.
   * @param {string} input - User input
   * @returns {number|null} Hours or null if invalid
   */
  parseCustomTime(input) {
    const text = input.trim().toLowerCase();

    // Regex patterns for different formats
    // Pattern 1: Number + unit (e.g., "30m", "12h", "2d")
    const shortPattern = /^(\d+\.?\d*)\s*([mhd])$/;
    // Pattern 2: Number + full word (e.g., "30 minutes", "12 hours", "2 days")
    const longPattern = /^(\d+\.?\d*)\s*(minute|minutes|hour|hours|day|days)$/;

    let match = text.match(shortPattern);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2];

      if (unit === 'm') return value / 60; // minutes to hours
      if (unit === 'h') return value; // hours
      if (unit === 'd') return value * 24; // days to hours
    }

    match = text.match(longPattern);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2];

      if (unit === 'minute' || unit === 'minutes') return value / 60;
      if (unit === 'hour' || unit === 'hours') return value;
      if (unit === 'day' || unit === 'days') return value * 24;
    }

    return null;
  }

  async handleCustomTimeInput(chatId, session, text) {
    console.log(`⏱️ Processing custom time input: "${text}"`);

    const hours = this.parseCustomTime(text);
    console.log(`📊 Parsed hours: ${hours}`);

    if (hours === null || isNaN(hours) || hours <= 0) {
      console.log('❌ Invalid time format');
      await this.bot.sendMessage(
        chatId,
        `❌ Invalid time format.\n\n` +
        `Please use one of these formats:\n` +
        `• \`30m\` or \`30 minutes\`\n` +
        `• \`12h\` or \`12 hours\`\n` +
        `• \`2d\` or \`2 days\``,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Validate max 3 days (72 hours)
    if (hours > 72) {
      console.log('❌ Time exceeds 3 days limit');
      await this.bot.sendMessage(
        chatId,
        `❌ Time range too long!\n\n` +
        `Maximum allowed: *3 days (72 hours)*\n` +
        `You entered: *${hours} hours*\n\n` +
        `Please enter a shorter time range.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    console.log(`✅ Valid custom time: ${hours} hours`);
    session.setTimeRange(hours);
    await this.showScanConfirmation(chatId, session);
  }

  async showScanConfirmation(chatId, session) {
    const filter = session.filter;

    // Validate filter exists
    if (!filter) {
      console.log('⚠️  No filter configured for user, redirecting to filter input');
      await this.bot.sendMessage(chatId, '❌ No filter configured. Please set a filter first.');
      return await this.showFilterInput(chatId, session);
    }

    let filterText;
    if (filter.type === 'range') {
      filterText = `${filter.min} - ${filter.max} SOL`;
    } else {
      const min = filter.value * (1 - filter.tolerance);
      const max = filter.value * (1 + filter.tolerance);
      filterText = `~${filter.value} SOL (${min.toFixed(4)} - ${max.toFixed(4)})`;
    }

    const scanTypeText = session.scanType === 'simple'
      ? '⚡ Fresh Wallets (Simple)'
      : '🔗 Fresh Wallets with Hopping';

    // Format time range text
    let timeRangeText = 'Not selected';
    if (session.timeRange) {
      const hours = session.timeRange;

      // Check for standard presets first
      if (hours === 3) timeRangeText = '3 Hours';
      else if (hours === 6) timeRangeText = '6 Hours';
      else if (hours === 12) timeRangeText = '12 Hours';
      else if (hours === 24) timeRangeText = '1 Day (24h)';
      else if (hours === 48) timeRangeText = '2 Days (48h)';
      else if (hours === 72) timeRangeText = '3 Days (72h)';
      else {
        // Custom time - format nicely
        if (hours < 1) {
          // Less than 1 hour, show in minutes
          const minutes = Math.round(hours * 60);
          timeRangeText = `${minutes} Minute${minutes !== 1 ? 's' : ''} (custom)`;
        } else if (hours % 24 === 0) {
          // Exact days
          const days = hours / 24;
          timeRangeText = `${days} Day${days !== 1 ? 's' : ''} (${hours}h, custom)`;
        } else {
          // Hours (with decimal if needed)
          const displayHours = hours % 1 === 0 ? hours : hours.toFixed(1);
          timeRangeText = `${displayHours} Hour${hours !== 1 ? 's' : ''} (custom)`;
        }
      }
    }

    // Calculate total wallets across all selected exchanges
    let totalWallets = 0;
    const exchangeList = session.selectedExchanges.map(key => {
      const ex = this.exchangeConfig.exchanges[key];
      totalWallets += ex.wallets.length;
      return `${ex.emoji} ${ex.name} (${ex.wallets.length})`;
    }).join('\n');

    const keyboard = {
      inline_keyboard: [
        [{ text: '🔍 Scan Now', callback_data: 'scan_now' }],
        [{ text: '⚙️ Change Filter', callback_data: 'change_filter' }],
        [{ text: '⬅️ Back to Time Range', callback_data: 'change_filter' }],
        [{ text: '❌ Cancel', callback_data: 'back_to_features' }]
      ]
    };

    await this.bot.sendMessage(
      chatId,
      `✅ *Ready to Scan*\n\n` +
      `Scan Type: *${scanTypeText}*\n` +
      `Time Range: *${timeRangeText}*\n\n` +
      `Exchanges:\n${exchangeList}\n\n` +
      `Filter: ${filterText}\n\n` +
      `Ready to scan *${totalWallets} wallet(s)* across *${session.selectedExchanges.length} exchange(s)*`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
  }

  async executeScan(chatId, session) {
    session.setState(STATES.SCANNING);

    if (session.selectedExchanges.length === 0) {
      await this.bot.sendMessage(chatId, '❌ No exchanges selected');
      return;
    }

    if (!session.scanType) {
      await this.bot.sendMessage(chatId, '❌ No scan type selected');
      return;
    }

    if (!session.timeRange) {
      await this.bot.sendMessage(chatId, '❌ No time range selected');
      return;
    }

    const exchangeNames = session.selectedExchanges
      .map(key => this.exchangeConfig.exchanges[key].name)
      .join(', ');

    const scanTypeEmoji = session.scanType === 'simple' ? '⚡' : '🔗';
    const scanTypeText = session.scanType === 'simple'
      ? 'Fresh Wallets (Simple)'
      : 'Fresh Wallets with Hopping';

    // Send initial scanning message
    const initialMsg = await this.bot.sendMessage(
      chatId,
      `🔍 *Scanning...*\n\n` +
      `${scanTypeEmoji} Mode: ${scanTypeText}\n` +
      `Exchanges: ${exchangeNames}\n` +
      `_(Note: ~1.2k transactions take approximately 1 minute)_\n\n` +
      `Analyzing transactions...`,
      { parse_mode: 'Markdown' }
    );

    // Create progress tracker
    const progressTracker = new ProgressTracker();

    // Progress notification message ID
    let progressMessageId = null;
    let updateInterval = null;
    let intervalStarted = false; // Track if interval has started

    // Function to send/update progress message
    const sendProgressUpdate = async () => {
      try {
        // Don't send anything if there are no logs yet
        if (!progressTracker.lastLog) {
          return;
        }

        const statusMessage = progressTracker.getStatusMessage();

        if (progressMessageId) {
          // Edit existing progress message
          await this.bot.editMessageText(statusMessage, {
            chat_id: chatId,
            message_id: progressMessageId,
            parse_mode: 'Markdown'
          }).catch(() => {
            // Ignore edit errors (message might be too old or identical)
          });
        } else {
          // Send new progress message
          const msg = await this.bot.sendMessage(chatId, statusMessage, {
            parse_mode: 'Markdown'
          });
          progressMessageId = msg.message_id;
        }
      } catch (error) {
        console.error('Error sending progress update:', error.message);
      }
    };

    // Function to start interval (called after first log)
    const startProgressInterval = () => {
      if (!intervalStarted) {
        intervalStarted = true;
        updateInterval = setInterval(sendProgressUpdate, 20000);
      }
    };

    try {
      const startTime = Date.now();

      // Collect all wallets from selected exchanges for overall stats
      const allWallets = [];
      for (const exchangeKey of session.selectedExchanges) {
        const exchange = this.exchangeConfig.exchanges[exchangeKey];
        allWallets.push(...exchange.wallets);
      }

      console.log(`\n🔍 Scanning ${session.selectedExchanges.length} exchange(s) with ${allWallets.length} total wallet(s)`);
      console.log(`⏰ Start time: ${new Date().toLocaleTimeString()}\n`);

      // Initialize progress tracker
      progressTracker.start(allWallets.length, session.selectedExchanges.length);

      // Reset request counter
      this.solanaService.requestCount = 0;

      // Scan each exchange separately with its own detector
      let allResults = [];
      let totalCachedWallets = 0;

      for (const exchangeKey of session.selectedExchanges) {
        const exchange = this.exchangeConfig.exchanges[exchangeKey];
        const exchangeName = exchange.name;
        progressTracker.setCurrentExchange(exchangeName);

        // Start progress interval after first phase starts (when logs begin)
        startProgressInterval();

        // Create detector specific to this exchange's wallets
        const detector = new FreshWalletDetector(
          this.solanaService,
          exchange.wallets, // Only wallets for THIS exchange
          {
            ...this.exchangeConfig.detectionConfig,
            maxAgeHours: session.timeRange  // Use user-selected time range
          }
        );

        console.log(`\n🔍 Scanning ${exchangeName}...`);
        const results = await detector.scanExchangeWallets(
          exchangeName, // Pass exchange name, not key
          session.filter,
          0, // 0 = fetch all transactions within user-selected time range
          progressTracker, // Pass tracker for progress updates
          session.scanType // Pass scan type (simple or hopping)
        );

        console.log(`📊 ${exchangeName} returned ${results.length} fresh wallets`);
        console.log(`📊 Before concat: allResults has ${allResults.length} wallets`);

        // Accumulate results
        allResults = allResults.concat(results);

        console.log(`📊 After concat: allResults has ${allResults.length} wallets`);

        // Accumulate cache stats
        const cacheStats = detector.getCacheStats();
        totalCachedWallets += cacheStats.cachedWallets;

        // Update progress
        progressTracker.incrementFreshWallets(results.length);
        progressTracker.setApiRequests(this.solanaService.requestCount);
      }

      console.log(`\n✅ All exchanges scanned. Total results: ${allResults.length}`);
      console.log(`📋 Results breakdown:`);
      const exchangeBreakdown = {};
      for (const result of allResults) {
        exchangeBreakdown[result.exchange] = (exchangeBreakdown[result.exchange] || 0) + 1;
      }
      for (const [exchange, count] of Object.entries(exchangeBreakdown)) {
        console.log(`   ${exchange}: ${count} wallets`);
      }

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(1);

      // Clear the interval
      clearInterval(updateInterval);

      // Send final progress update
      if (progressMessageId) {
        await this.bot.editMessageText(
          `✅ *Scan Complete*\n\n` +
          `⏱️ Duration: ${duration}s\n` +
          `📊 Wallets Scanned: ${progressTracker.stats.walletsScanned}\n` +
          `✅ Fresh Wallets: ${allResults.length}\n` +
          `🌐 API Requests: ${this.solanaService.requestCount}`,
          {
            chat_id: chatId,
            message_id: progressMessageId,
            parse_mode: 'Markdown'
          }
        ).catch(() => {});
      }

      // Show statistics
      console.log(`\n📊 === SCAN STATISTICS ===`);
      console.log(`⏱️  Duration: ${duration}s`);
      console.log(`🌐 API Requests: ${this.solanaService.requestCount}`);
      console.log(`💾 Cached Wallets: ${totalCachedWallets}`);
      console.log(`✅ Fresh Wallets Found: ${allResults.length}`);
      console.log(`⏰ End time: ${new Date().toLocaleTimeString()}\n`);

      // Sort results by timestamp (oldest first, newest last)
      allResults.sort((a, b) => {
        if (!a.timestamp) return 1;  // Put items without timestamp at the end
        if (!b.timestamp) return -1;
        return a.timestamp - b.timestamp;  // Ascending order (oldest first)
      });

      session.setState(STATES.RESULTS);

      // Show results
      await this.showResults(chatId, session, allResults);

    } catch (error) {
      // Clear the interval on error
      clearInterval(updateInterval);

      console.error('Scan error:', error);
      await this.bot.sendMessage(chatId, `❌ Error: ${error.message}`);
      session.setState(STATES.IDLE);
    }
  }

  async showResults(chatId, session, results) {
    if (results.length === 0) {
      const keyboard = {
        inline_keyboard: [
          [{ text: '⚙️ Change Filter', callback_data: 'change_filter' }],
          [{ text: '⬅️ Back to Scan Type', callback_data: 'continue_to_scan_type' }],
          [{ text: '🏠 Main Menu', callback_data: 'back_to_features' }]
        ]
      };

      await this.bot.sendMessage(
        chatId,
        `📭 *No fresh wallets found*\n\n` +
        `Try adjusting your filter settings`,
        {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        }
      );
      return;
    }

    // Summary message
    const scanTypeEmoji = session.scanType === 'simple' ? '⚡' : '🔗';
    const scanTypeText = session.scanType === 'simple'
      ? 'Fresh Wallets (Simple)'
      : 'Fresh Wallets with Hopping';

    const summaryMessage = `✅ *Scan Complete*\n\n` +
      `${scanTypeEmoji} Mode: ${scanTypeText}\n` +
      `Found ${results.length} fresh wallet${results.length > 1 ? 's' : ''}`;

    // Send summary (should always be under limit, but check anyway)
    if (summaryMessage.length <= 4096) {
      await this.bot.sendMessage(chatId, summaryMessage, { parse_mode: 'Markdown' });
    } else {
      await this.bot.sendMessage(
        chatId,
        `✅ *Scan Complete*\n\n` +
        `Found ${results.length} fresh wallet${results.length > 1 ? 's' : ''}`,
        { parse_mode: 'Markdown' }
      );
    }

    // Send ALL detailed results in batches of 5 to avoid saturating Telegram API
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const date = result.timestamp
        ? result.timestamp.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : 'N/A';

      const pathStr = result.path.length > 1
        ? `\n🔗 Path (${result.hops} hop${result.hops > 1 ? 's' : ''}): ${result.path.map(w => w.slice(0, 6)).join(' → ')}`
        : '';

      // Get exchange emoji from config (or use default)
      const exchangeConfig = Object.values(this.exchangeConfig.exchanges).find(
        ex => ex.name.toLowerCase() === result.exchange.toLowerCase()
      );
      const exchangeEmoji = exchangeConfig ? exchangeConfig.emoji : '🏦';

      const message = `💎 *Fresh Wallet Detected*\n\n` +
        `${exchangeEmoji} Exchange: *${result.exchange}*\n` +
        `💰 Amount: *${result.amount.toFixed(6)} SOL*\n` +
        `🆕 Wallet: \`${result.finalWallet}\`\n` +
        `📅 ${date}${pathStr}\n\n` +
        `🔗 [View TX](https://solscan.io/tx/${result.signature}) | ` +
        `[View Wallet](https://solscan.io/account/${result.finalWallet})`;

      // Safety check for message length (should never exceed, but just in case)
      if (message.length > 4096) {
        console.warn(`⚠️  Warning: Wallet message too long (${message.length} chars), truncating path...`);
        const shortMessage = `💎 *Fresh Wallet Detected*\n\n` +
          `${exchangeEmoji} Exchange: *${result.exchange}*\n` +
          `💰 Amount: *${result.amount.toFixed(6)} SOL*\n` +
          `🆕 Wallet: \`${result.finalWallet}\`\n` +
          `📅 ${date}\n` +
          `🔗 Path: ${result.hops} hop(s)\n\n` +
          `🔗 [View TX](https://solscan.io/tx/${result.signature}) | ` +
          `[View Wallet](https://solscan.io/account/${result.finalWallet})`;
        await this.bot.sendMessage(chatId, shortMessage, {
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        });
      } else {
        await this.bot.sendMessage(chatId, message, {
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        });
      }

      // Add delay after every 5 messages to avoid hitting rate limits
      if ((i + 1) % 5 === 0 && i < results.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }

    // Generate tracker format message
    const trackerLines = [];

    for (const result of results) {
      const exchangeName = result.exchange.toUpperCase();

      // Format timestamp to DD/MM HH:MMhs
      let dateStr = 'N/A';
      let timeStr = 'N/A';

      if (result.timestamp) {
        const timestamp = result.timestamp;
        const day = String(timestamp.getDate()).padStart(2, '0');
        const month = String(timestamp.getMonth() + 1).padStart(2, '0');
        const hours = String(timestamp.getHours()).padStart(2, '0');
        const minutes = String(timestamp.getMinutes()).padStart(2, '0');
        dateStr = `${day}/${month}`;
        timeStr = `${hours}:${minutes}hs`;
      }

      // Format: `wallet` EXCHANGE DD/MM HH:MMhs
      // Example: `6uUkfsZCDD6kXBcxXkc1p2MKPwKnomyEzJ2SaB5oYUGB` BINANCE 26/01 15:02hs
      trackerLines.push(`\`${result.finalWallet}\` ${exchangeName} ${dateStr} ${timeStr}`);
    }

    // Send tracker format message in batches if needed (Telegram limit: 4096 chars per message)
    if (trackerLines.length > 0) {
      const TELEGRAM_MAX_LENGTH = 4096;

      // First pass: determine how many batches we need
      const batches = [];
      let currentBatch = [];
      let currentLength = 0;

      // Max content per message (with safety margin)
      const maxContentLength = TELEGRAM_MAX_LENGTH - 100; // Extra safety margin

      for (let i = 0; i < trackerLines.length; i++) {
        const line = trackerLines[i];
        const lineLength = line.length + 1; // +1 for newline

        // Check if adding this line would exceed the limit
        if (currentLength + lineLength > maxContentLength && currentBatch.length > 0) {
          // Save current batch and start new one
          batches.push([...currentBatch]);
          currentBatch = [];
          currentLength = 0;
        }

        currentBatch.push(line);
        currentLength += lineLength;
      }

      // Add remaining batch
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
      }

      // Second pass: send batches (no header, just the list)
      for (let i = 0; i < batches.length; i++) {
        const message = batches[i].join('\n');

        // Verify message length (safety check)
        if (message.length > TELEGRAM_MAX_LENGTH) {
          console.warn(`⚠️  Warning: Batch ${i + 1} exceeds limit (${message.length} chars). Truncating...`);
          const truncated = message.substring(0, TELEGRAM_MAX_LENGTH - 50) + '\n...(truncated)';
          await this.bot.sendMessage(chatId, truncated, { parse_mode: 'Markdown' });
        } else {
          await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        }

        // Add delay between batches to avoid rate limits
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }
      }
    }

    // Action buttons
    const keyboard = {
      inline_keyboard: [
        [{ text: '🔄 Run Again', callback_data: 'run_again' }],
        [{ text: '⚙️ Change Filter', callback_data: 'change_filter' }],
        [{ text: '🏠 Main Menu', callback_data: 'back_to_features' }]
      ]
    };

    await this.bot.sendMessage(
      chatId,
      `What would you like to do?`,
      { reply_markup: keyboard }
    );
  }

  async handleCancel(msg) {
    const chatId = msg.chat.id;
    const session = this.getSession(chatId);
    session.reset();
    await this.bot.sendMessage(chatId, '❌ Operation cancelled. Use /start to begin');
  }
}

export default TelegramBotService;
