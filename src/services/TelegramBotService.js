import TelegramBot from 'node-telegram-bot-api';
import { UserSession } from '../models/UserSession.js';
import { FreshWalletDetector } from '../core/FreshWalletDetector.js';
import { ProgressTracker } from '../utils/ProgressTracker.js';
import { STATES } from '../constants/states.js';
import { MESSAGES } from '../constants/messages.js';
import { RateLimiter } from '../utils/RateLimiter.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LOGO_PATH = join(__dirname, '..', '..', 'assets', 'logo.png');

/**
 * Telegram Bot Service with state machine and hierarchical menus
 */
class TelegramBotService {
  constructor(token, solanaService, exchangeConfig, botInstance = null, privacyCashDetector = null) {
    // Use provided bot instance or create new one with polling
    this.bot = botInstance || new TelegramBot(token, { polling: true });
    this.solanaService = solanaService;
    this.exchangeConfig = exchangeConfig;
    this.privacyCashDetector = privacyCashDetector;
    this.rateLimiter = new RateLimiter();

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
    this.bot.onText(/\/faq/, (msg) => this.handleFaq(msg.chat.id));
    this.bot.onText(/\/quota/, (msg) => this.handleQuota(msg.chat.id));

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

    // Send welcome message with logo and inline keyboard
    const keyboard = {
      inline_keyboard: [
        [{ text: '🆕 Fresh Wallet Scanner', callback_data: 'feature_fresh' }],
        [{ text: '🛡️ Privacy Cash Scanner', callback_data: 'feature_privacy' }],
        [
          { text: '🐦 X', url: 'https://x.com/solfinder_app' },
          { text: '💬 Community', url: 'https://t.me/+_TQrrkzb-a83ZmYx' },
          { text: '📄 Docs', url: 'https://solfinder.gitbook.io/docs' }
        ],
        [
          { text: '❓ FAQ', callback_data: 'show_faq' },
          { text: '📖 Help', callback_data: 'show_help' }
        ]
      ]
    };

    try {
      await this.bot.sendPhoto(chatId, LOGO_PATH, {
        caption: MESSAGES.WELCOME,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('⚠️ Could not send logo, falling back to text:', error.message);
      await this.bot.sendMessage(chatId, MESSAGES.WELCOME, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }
  }

  async handleHelp(msg) {
    const chatId = msg.chat.id;
    await this.bot.sendMessage(chatId, MESSAGES.HELP, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Back to menu', callback_data: 'back_to_features' }]] }
    });
  }

  async handleQuota(chatId) {
    const stats = this.rateLimiter.getStats(chatId);
    const line = (label, s) => `${label}: *${s.used}/${s.cap}* used · _${s.remaining} left_`;
    const text = `📊 *Your Daily Quota*\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `${line('🆕 Fresh Wallet scans', stats.fresh)}\n` +
      `${line('📤 Recipient lookups', stats.func1)}\n` +
      `${line('📥 Sender lookups', stats.func2)}\n` +
      `${line('📊 Time-window scans', stats.func3)}\n\n` +
      `_Quotas reset 24h after each use._\n` +
      `_Time-window scans have a 3 min cooldown between runs._`;
    await this.bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Back to menu', callback_data: 'back_to_features' }]] }
    });
  }

  async handleFaq(chatId) {
    const keyboard = {
      inline_keyboard: [
        [{ text: '🌐 General & Basics', callback_data: 'faq_general' }],
        [{ text: '🆕 Fresh Wallet Scanner', callback_data: 'faq_fresh' }],
        [{ text: '🛡️ Privacy Cash Scanner', callback_data: 'faq_privacy' }],
        [{ text: '🔧 Troubleshooting & Security', callback_data: 'faq_troubleshooting' }],
        [{ text: '⬅️ Back to menu', callback_data: 'back_to_features' }]
      ]
    };
    await this.bot.sendMessage(chatId, MESSAGES.FAQ_MENU, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  async sendFaqSection(chatId, section) {
    const msg = MESSAGES[`FAQ_${section.toUpperCase()}`];
    if (!msg) return;
    await this.bot.sendMessage(chatId, msg, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '⬅️ Back to FAQ', callback_data: 'show_faq' }],
          [{ text: '🏠 Main menu', callback_data: 'back_to_features' }]
        ]
      }
    });
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
    } else if (data === 'show_help') {
      await this.handleHelp({ chat: { id: chatId } });
    } else if (data === 'show_faq') {
      await this.handleFaq(chatId);
    } else if (data === 'faq_general') {
      await this.sendFaqSection(chatId, 'general');
    } else if (data === 'faq_fresh') {
      await this.sendFaqSection(chatId, 'fresh');
    } else if (data === 'faq_privacy') {
      await this.sendFaqSection(chatId, 'privacy');
    } else if (data === 'faq_troubleshooting') {
      await this.sendFaqSection(chatId, 'troubleshooting');
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
    } else if (data === 'back_to_pc_menu') {
      await this.showPrivacyCashMenu(chatId, session);
    } else if (data === 'pc_func1') {
      await this.startPCFunction1(chatId, session);
    } else if (data === 'pc_func2') {
      await this.startPCFunction2(chatId, session);
    } else if (data === 'pc_func3') {
      await this.startPCFunction3(chatId, session);
    } else if (data === 'pc_date_today' || data === 'pc_date_yesterday') {
      const now = new Date();
      const day = data === 'pc_date_today' ? now : new Date(now.getTime() - 24 * 60 * 60 * 1000);
      session.pcDate = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
      await this.showPCTimeInput(chatId, session);
    } else if (data === 'pc_date_custom') {
      session.setState(STATES.PC_FUNC3_DATE_CUSTOM);
      await this.bot.sendMessage(chatId, MESSAGES.PC_FUNC3_DATE_CUSTOM, { parse_mode: 'Markdown' });
    } else if (data === 'pc_page_next') {
      session.pcPage = (session.pcPage || 0) + 1;
      await this.renderPCResultsPage(chatId, session, messageId);
    } else if (data === 'pc_page_prev') {
      session.pcPage = Math.max(0, (session.pcPage || 0) - 1);
      await this.renderPCResultsPage(chatId, session, messageId);
    } else if (data === 'pc_noop') {
      // pagination indicator — no action
    }
  }

  async showPrivacyCashMenu(chatId, session) {
    session.setState(STATES.PC_MENU);
    session.pcFunction = null;
    session.pcResults = null;
    session.pcPage = 0;

    const keyboard = {
      inline_keyboard: [
        [{ text: '📤 Where did the money go?', callback_data: 'pc_func1' }],
        [{ text: '📥 Where did it come from?', callback_data: 'pc_func2' }],
        [{ text: '📊 Scan a time window', callback_data: 'pc_func3' }],
        [{ text: '⬅️ Back', callback_data: 'back_to_features' }]
      ]
    };

    await this.bot.sendMessage(chatId, MESSAGES.PRIVACY_CASH_MENU, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  async startPCFunction1(chatId, session) {
    session.pcFunction = 'func1';
    session.setState(STATES.PC_FUNC1_INPUT);
    await this.bot.sendMessage(chatId, MESSAGES.PC_FUNC1_INPUT, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Back', callback_data: 'back_to_pc_menu' }]] }
    });
  }

  async startPCFunction2(chatId, session) {
    session.pcFunction = 'func2';
    session.setState(STATES.PC_FUNC2_INPUT);
    await this.bot.sendMessage(chatId, MESSAGES.PC_FUNC2_INPUT, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Back', callback_data: 'back_to_pc_menu' }]] }
    });
  }

  async startPCFunction3(chatId, session) {
    session.pcFunction = 'func3';
    session.setState(STATES.PC_FUNC3_DATE_CUSTOM);

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🕐 Today', callback_data: 'pc_date_today' },
          { text: '📆 Yesterday', callback_data: 'pc_date_yesterday' }
        ],
        [{ text: '✏️ Custom date', callback_data: 'pc_date_custom' }],
        [{ text: '⬅️ Back', callback_data: 'back_to_pc_menu' }]
      ]
    };

    await this.bot.sendMessage(chatId, MESSAGES.PC_FUNC3_DATE, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  async showPCTimeInput(chatId, session) {
    session.setState(STATES.PC_FUNC3_TIME_INPUT);
    const dateStr = this.formatUTCDate(session.pcDate);
    const now = new Date();
    const nowUTC = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
    const header = `📅 Date: *${dateStr}* (UTC)\n🕒 Current UTC time: *${nowUTC}*\n\n`;
    await this.bot.sendMessage(chatId, header + MESSAGES.PC_FUNC3_TIME, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Back', callback_data: 'pc_func3' }]] }
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
      `🔍 *Select Scan Mode*\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `Exchanges: *${exchangeNames}*\n\n` +
      `⚡ *Simple*\n` +
      `Direct transfers only. Fast scan — finds wallets that received funds straight from the exchange and never moved them.\n\n` +
      `🔗 *Hopping Mode*\n` +
      `Follows the money trail up to 3 hops:\n` +
      `Exchange → A → B → C\n` +
      `Catches wallets that hide their origin behind intermediaries. Slower but more thorough.`,
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
      `🔍 *Fresh Wallet Scanner*\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `Exchanges: *${exchangeNames}*\n` +
      `Mode: *${scanTypeText}*\n\n` +
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
    } else if (session.state === STATES.PC_FUNC1_INPUT) {
      await this.handlePCSignatureInput(chatId, session, msg.text, 'func1');
    } else if (session.state === STATES.PC_FUNC2_INPUT) {
      await this.handlePCSignatureInput(chatId, session, msg.text, 'func2');
    } else if (session.state === STATES.PC_FUNC3_DATE_CUSTOM) {
      await this.handlePCDateCustomInput(chatId, session, msg.text);
    } else if (session.state === STATES.PC_FUNC3_TIME_INPUT) {
      await this.handlePCTimeRangeInput(chatId, session, msg.text);
    } else {
      console.log(`❌ State mismatch. Ignoring message.`);
    }
  }

  isValidSignature(text) {
    const trimmed = text.trim();
    return /^[1-9A-HJ-NP-Za-km-z]{80,100}$/.test(trimmed);
  }

  async handlePCSignatureInput(chatId, session, text, fn) {
    const signature = text.trim();
    if (!this.isValidSignature(signature)) {
      await this.bot.sendMessage(chatId, MESSAGES.PC_INVALID_SIGNATURE, { parse_mode: 'Markdown' });
      return;
    }

    if (fn === 'func1') {
      await this.executePCFunction1(chatId, session, signature);
    } else {
      await this.executePCFunction2(chatId, session, signature);
    }
  }

  async handlePCDateCustomInput(chatId, session, text) {
    const match = text.trim().match(/^(\d{1,2})-(\d{1,2})$/);
    if (!match) {
      await this.bot.sendMessage(chatId, MESSAGES.PC_INVALID_DATE, { parse_mode: 'Markdown' });
      return;
    }
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = 2026;

    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      await this.bot.sendMessage(chatId, MESSAGES.PC_INVALID_DATE, { parse_mode: 'Markdown' });
      return;
    }

    session.pcDate = date;
    await this.showPCTimeInput(chatId, session);
  }

  async handlePCTimeRangeInput(chatId, session, text) {
    const sendErr = (reason) => this.bot.sendMessage(
      chatId,
      `❌ *Invalid time range*\n\n${reason}\n\nFormat: \`HH:MM HH:MM\` (UTC)`,
      { parse_mode: 'Markdown' }
    );

    const match = text.trim().match(/^(\d{1,2}):(\d{2})\s+(\d{1,2}):(\d{2})$/);
    if (!match) {
      return sendErr('Format not recognized. Example: `19:00 19:30`.');
    }
    const [_, sh, sm, eh, em] = match;
    const startH = parseInt(sh, 10);
    const startM = parseInt(sm, 10);
    const endH = parseInt(eh, 10);
    const endM = parseInt(em, 10);

    if (startH > 23 || endH > 23 || startM > 59 || endM > 59) {
      return sendErr('Hours must be 0-23 and minutes 0-59.');
    }

    const baseDate = session.pcDate;
    const startDate = new Date(Date.UTC(
      baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate(),
      startH, startM, 0
    ));
    const endDate = new Date(Date.UTC(
      baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate(),
      endH, endM, 0
    ));

    if (endDate <= startDate) {
      return sendErr('End time must be after start time.');
    }
    const rangeMin = (endDate - startDate) / 60000;
    if (rangeMin > 120) {
      return sendErr(`Range is ${Math.floor(rangeMin)} min. Maximum is 120 min (2 hours).`);
    }
    const now = new Date();
    if (endDate.getTime() > now.getTime()) {
      const nowUTC = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
      const nowDate = this.formatUTCDate(now);
      const selectedDate = this.formatUTCDate(baseDate);
      return sendErr(
        `End time is in the future.\n` +
        `• Current UTC: *${nowDate} ${nowUTC}*\n` +
        `• You selected: *${selectedDate} ${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}*\n\n` +
        `_Tip: All times are UTC. If you're in UTC-3, your local 21:00 is already 00:00 UTC of the next day — pick "Yesterday" to query earlier hours._`
      );
    }

    session.pcTimeRange = {
      startSec: Math.floor(startDate.getTime() / 1000),
      endSec: Math.floor(endDate.getTime() / 1000)
    };

    await this.executePCFunction3(chatId, session);
  }

  async runPCScan(chatId, session, title, scanFn, resultKind) {
    if (!this.privacyCashDetector) {
      await this.bot.sendMessage(chatId, '❌ Privacy Cash detector not configured.');
      return;
    }
    session.setState(STATES.PC_SCANNING);

    const statusMsg = await this.bot.sendMessage(chatId, `${title}\n\n⏳ Scanning...`, { parse_mode: 'Markdown' });
    const statusMessageId = statusMsg.message_id;

    let lastUpdate = Date.now();
    const logger = {
      addLog: async (line) => {
        console.log(`[PC] ${line}`);
        const now = Date.now();
        if (now - lastUpdate < 2500) return;
        lastUpdate = now;
        try {
          await this.bot.editMessageText(`${title}\n\n⏳ ${line}`, {
            chat_id: chatId,
            message_id: statusMessageId,
            parse_mode: 'Markdown'
          });
        } catch (_) { /* ignore rate limit on edits */ }
      }
    };

    try {
      const data = await scanFn(logger);
      session.pcResults = { kind: resultKind, data };
      session.pcPage = 0;
      try {
        await this.bot.deleteMessage(chatId, statusMessageId);
      } catch (_) { /* ignore */ }
      await this.renderPCResultsPage(chatId, session);
    } catch (error) {
      console.error(`[PC] Error: ${error.message}`);
      try {
        await this.bot.deleteMessage(chatId, statusMessageId);
      } catch (_) { /* ignore */ }
      await this.sendPCError(chatId, error.message);
    }
  }

  async executePCFunction1(chatId, session, signature) {
    if (!(await this._enforceLimit(chatId, 'func1'))) return;
    this.rateLimiter.record(chatId, 'func1');
    await this.runPCScan(
      chatId, session, '🔎 *SOLFINDER — Tracing Recipients*',
      (logger) => this.privacyCashDetector.detectRecipients(signature, logger),
      'func1'
    );
  }

  async executePCFunction2(chatId, session, signature) {
    if (!(await this._enforceLimit(chatId, 'func2'))) return;
    this.rateLimiter.record(chatId, 'func2');
    await this.runPCScan(
      chatId, session, '🔎 *SOLFINDER — Tracing Sender*',
      (logger) => this.privacyCashDetector.detectSender(signature, logger),
      'func2'
    );
  }

  async executePCFunction3(chatId, session) {
    if (!(await this._enforceLimit(chatId, 'func3'))) return;
    this.rateLimiter.record(chatId, 'func3');
    const { startSec, endSec } = session.pcTimeRange;
    try {
      await this.runPCScan(
        chatId, session, '🔎 *SOLFINDER — Scanning Time Window*',
        (logger) => this.privacyCashDetector.detectAllInRange(startSec, endSec, logger),
        'func3'
      );
    } finally {
      this.rateLimiter.release('func3');
    }
  }

  async _enforceLimit(chatId, action) {
    const check = this.rateLimiter.check(chatId, action);
    if (check.allowed) return true;
    await this.bot.sendMessage(chatId, check.message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Back to menu', callback_data: 'back_to_features' }]] }
    });
    return false;
  }

  async sendPCError(chatId, errorMessage) {
    let msg;
    if (errorMessage.includes('not found')) msg = MESSAGES.PC_TX_NOT_FOUND;
    else if (errorMessage.includes('Privacy Cash pool')) msg = MESSAGES.PC_NOT_PRIVACY_CASH;
    else if (errorMessage.includes('not a deposit')) msg = MESSAGES.PC_WRONG_DIRECTION_DEPOSIT;
    else if (errorMessage.includes('not a withdrawal')) msg = MESSAGES.PC_WRONG_DIRECTION_WITHDRAWAL;
    else msg = `❌ ${errorMessage}`;

    await this.bot.sendMessage(chatId, msg, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Back to menu', callback_data: 'back_to_pc_menu' }]] }
    });
  }

  shortAddr(addr) {
    if (!addr) return '?';
    return addr.slice(0, 6) + '...' + addr.slice(-4);
  }

  formatUTCTime(sec) {
    const d = new Date(sec * 1000);
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    const ss = String(d.getUTCSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  formatUTCDate(date) {
    const d = date instanceof Date ? date : new Date(date);
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  renderFunc1Message(data) {
    let text = `🔎 *SOLFINDER — Where Did the Money Go?*\n`;
    text += `━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `📤 *Sender:*\n\`${data.sender}\`\n`;
    text += `💰 *Deposited:* ${data.depositSOL.toFixed(4)} SOL\n\n`;

    if (data.bridged) {
      text += `⚠️ *No match on Solana*\n\n`;
      text += `The funds were likely bridged to another network (ETH, BNB, etc.).\n`;
      text += `_Cross-chain detection coming soon._`;
      return text;
    }

    text += `📥 *Received by (${data.recipients.length}):*\n\n`;
    data.recipients.forEach((r, i) => {
      text += `${i + 1}. \`${r.wallet}\`\n   ${r.amountSOL.toFixed(4)} SOL\n\n`;
    });
    return text;
  }

  renderFunc2Message(data) {
    let text = `🔎 *SOLFINDER — Where Did the Money Come From?*\n`;
    text += `━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `📥 *Recipient:*\n\`${data.recipient}\`\n`;
    text += `💰 *Received:* ${data.withdrawalSOL.toFixed(4)} SOL\n\n`;

    if (data.bridged || data.senders.length === 0) {
      text += `⚠️ *No match on Solana*\n\n`;
      text += `The funds may have been bridged from another network.\n`;
      text += `_Cross-chain detection coming soon._`;
      return text;
    }

    text += `📤 *Original sender:*\n`;
    data.senders.forEach((s) => {
      text += `\`${s.wallet}\`\n`;
      text += `💰 Deposited ${s.amountSOL.toFixed(4)} SOL at ${this.formatUTCTime(s.blockTime)} UTC\n`;
    });

    if (data.coRecipients && data.coRecipients.length > 0) {
      text += `\n🔗 *Other recipients from this deposit:*\n\n`;
      data.coRecipients.forEach((r) => {
        text += `\`${r.wallet}\`\n${r.amountSOL.toFixed(4)} SOL\n\n`;
      });
    }

    return text;
  }

  renderFunc3Page(data, page) {
    const pageSize = 5;
    const matched = data.pairs.filter(p => !p.bridged);
    const bridged = data.pairs.filter(p => p.bridged);

    const totalPages = Math.max(1, Math.ceil(matched.length / pageSize));
    const safePage = Math.min(page, totalPages - 1);
    const start = safePage * pageSize;
    const slice = matched.slice(start, start + pageSize);

    const rangeStart = this.formatUTCTime(data.startSec);
    const rangeEnd = this.formatUTCTime(data.endSec);
    const dateStr = this.formatUTCDate(new Date(data.startSec * 1000));

    let text = `🔎 *SOLFINDER — Time Window Scan*\n`;
    text += `━━━━━━━━━━━━━━━━━━━\n`;
    text += `📅 ${dateStr} · ${rangeStart}–${rangeEnd} UTC\n`;
    text += `✅ ${matched.length} matched · ⚠️ ${bridged.length} bridged · 📊 ${data.totalDeposits} total\n`;
    text += `Page ${safePage + 1} of ${totalPages}\n\n`;

    if (matched.length === 0) {
      text += `_No matched pairs found in this range._\n`;
    }

    slice.forEach((p, idx) => {
      const num = start + idx + 1;
      text += `━━━━━━━━━━━━━━━\n`;
      text += `*${num}.* ${this.formatUTCTime(p.depositTime)} · ${p.depositSOL.toFixed(4)} SOL\n\n`;
      text += `📤 *Sender:*\n\`${p.sender}\`\n\n`;
      const label = p.recipients.length > 1 ? 'Recipients' : 'Recipient';
      text += `📥 *${label}:*\n`;
      p.recipients.forEach(r => {
        text += `\`${r.wallet}\` — ${r.amountSOL.toFixed(4)} SOL\n`;
      });
      text += `\n`;
    });

    if (bridged.length > 0 && safePage === totalPages - 1) {
      text += `⚠️ *${bridged.length} likely bridged (no Solana match):*\n`;
      bridged.slice(0, 5).forEach(p => {
        text += `• \`${this.shortAddr(p.sender)}\` — ${p.depositSOL.toFixed(4)} SOL at ${this.formatUTCTime(p.depositTime)}\n`;
      });
      if (bridged.length > 5) text += `_…and ${bridged.length - 5} more_\n`;
    }

    return { text, safePage, totalPages };
  }

  async renderPCResultsPage(chatId, session, messageId = null) {
    session.setState(STATES.PC_RESULTS);
    const results = session.pcResults;
    if (!results) return;

    let text;
    let keyboard;

    if (results.kind === 'func1') {
      text = this.renderFunc1Message(results.data);
      keyboard = {
        inline_keyboard: [
          [{ text: '⬅️ Back to menu', callback_data: 'back_to_pc_menu' }]
        ]
      };
    } else if (results.kind === 'func2') {
      text = this.renderFunc2Message(results.data);
      keyboard = {
        inline_keyboard: [
          [{ text: '⬅️ Back to menu', callback_data: 'back_to_pc_menu' }]
        ]
      };
    } else {
      const rendered = this.renderFunc3Page(results.data, session.pcPage || 0);
      text = rendered.text;
      session.pcPage = rendered.safePage;

      const navRow = [];
      if (rendered.safePage > 0) navRow.push({ text: '⬅️ Previous', callback_data: 'pc_page_prev' });
      navRow.push({ text: `${rendered.safePage + 1}/${rendered.totalPages}`, callback_data: 'pc_noop' });
      if (rendered.safePage < rendered.totalPages - 1) navRow.push({ text: 'Next ➡️', callback_data: 'pc_page_next' });

      keyboard = {
        inline_keyboard: [
          navRow,
          [{ text: '⬅️ Back to menu', callback_data: 'back_to_pc_menu' }]
        ]
      };
    }

    if (messageId) {
      try {
        await this.bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        return;
      } catch (e) {
        // fallthrough to send new
      }
    }

    await this.bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
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
    if (session.selectedExchanges.length === 0) {
      await this.bot.sendMessage(chatId, '❌ No exchanges selected');
      return;
    }

    if (!session.scanType) {
      await this.bot.sendMessage(chatId, '❌ No scan type selected');
      return;
    }

    if (!(await this._enforceLimit(chatId, 'fresh'))) return;
    this.rateLimiter.record(chatId, 'fresh');
    session.setState(STATES.SCANNING);

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
