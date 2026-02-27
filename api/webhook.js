import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import SolanaService from '../src/services/SolanaService.js';
import TelegramBotService from '../src/services/TelegramBotService.js';
import ExchangeConfigService from '../src/services/ExchangeConfigService.js';
import SupabaseService from '../src/services/SupabaseService.js';

// Load environment variables
dotenv.config();

// Initialize services (singleton pattern)
let solanaService = null;
let exchangeConfig = null;
let botService = null;
let supabaseService = null;

// Request metrics
let requestCount = 0;
let lastRequestTime = null;
const activeUsers = new Set();
const requestsPerUser = new Map();

/**
 * Initialize all services (runs once per serverless instance)
 */
function initializeServices() {
  if (!solanaService) {
    console.log('🔧 Initializing services...');

    // Initialize Solana service
    solanaService = new SolanaService(process.env.SOLANA_RPC_URL);

    // Load exchange configuration
    const exchangeConfigService = new ExchangeConfigService();
    exchangeConfig = exchangeConfigService.load();

    // Initialize Supabase
    supabaseService = new SupabaseService();
    supabaseService.initialize();

    console.log('✅ Services initialized');
  }
}

/**
 * Get or create bot instance for webhook mode
 */
function getBotService() {
  if (!botService) {
    initializeServices();

    // Create bot in webhook mode (no polling)
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
      polling: false,
      webHook: false
    });

    // Create bot service
    botService = new TelegramBotService(
      process.env.TELEGRAM_BOT_TOKEN,
      solanaService,
      exchangeConfig,
      bot // Pass the bot instance
    );
  }

  return botService;
}

/**
 * Vercel serverless function handler
 * Receives webhook updates from Telegram
 */
export default async function handler(req, res) {
  const startTime = Date.now();

  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate request body
    const update = req.body;
    if (!update || typeof update !== 'object') {
      console.log('⚠️  Invalid update received');
      return res.status(200).json({ ok: true }); // Return 200 to Telegram anyway
    }

    // Track metrics
    requestCount++;
    const currentTime = Date.now();
    const timeSinceLastRequest = lastRequestTime ? currentTime - lastRequestTime : 0;
    lastRequestTime = currentTime;

    // Get user info safely
    const userId = update.message?.from?.id || update.callback_query?.from?.id;
    const username = update.message?.from?.username || update.callback_query?.from?.username || 'unknown';

    if (userId) {
      activeUsers.add(userId);
      requestsPerUser.set(userId, (requestsPerUser.get(userId) || 0) + 1);
    }

    // Log metrics
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📥 Webhook #${requestCount} received`);
    console.log(`👤 User: @${username} (ID: ${userId || 'unknown'})`);
    console.log(`⏱️  Time since last request: ${timeSinceLastRequest}ms`);
    console.log(`📊 Active users: ${activeUsers.size}`);
    console.log(`🔄 Total requests: ${requestCount}`);

    // Get bot service
    const service = getBotService();

    if (update.message && update.message.chat && update.message.chat.id) {
      const message = update.message;
      const text = message.text || '';
      const chatId = message.chat.id;

      console.log(`💬 Message from chat ${chatId}: "${text}"`);

      // Handle commands
      if (text.startsWith('/start')) {
        console.log('🎯 Handling /start command');
        await service.handleStart(message);
      } else if (text.startsWith('/cancel')) {
        console.log('🎯 Handling /cancel command');
        await service.handleCancel(message);
      } else if (text.startsWith('/help')) {
        console.log('🎯 Handling /help command');
        await service.handleHelp(message);
      } else {
        // Handle regular text message
        console.log('📝 Handling text message');
        await service.handleTextMessage(message);
      }
    } else if (update.callback_query && update.callback_query.message) {
      const callbackData = update.callback_query.data;
      console.log(`🔘 Callback query: ${callbackData}`);
      await service.handleCallbackQuery(update.callback_query);
    } else {
      console.log('⚠️  Unknown update type, ignoring');
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Request processed in ${processingTime}ms`);
    console.log('═══════════════════════════════════════════════════════\n');

    // Respond to Telegram
    res.status(200).json({ ok: true });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('═══════════════════════════════════════════════════════');
    console.error('❌ Webhook error:', error);
    console.error('Stack:', error.stack);
    console.error(`⏱️  Failed after ${processingTime}ms`);
    console.error('═══════════════════════════════════════════════════════\n');
    res.status(500).json({ error: error.message });
  }
}

/**
 * Export metrics for stats endpoint
 */
export function getMetrics() {
  return {
    requestCount,
    lastRequestTime,
    activeUsers,
    requestsPerUser
  };
}
