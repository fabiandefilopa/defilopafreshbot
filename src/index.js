import dotenv from 'dotenv';
import SolanaService from './services/SolanaService.js';
import TelegramBotService from './services/TelegramBotService.js';
import ExchangeConfigService from './services/ExchangeConfigService.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['TELEGRAM_BOT_TOKEN', 'SOLANA_RPC_URL'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Error: Missing required environment variable: ${envVar}`);
    console.error(`\n💡 Check your .env file and make sure all required variables are set.`);
    process.exit(1);
  }
}

console.log('🚀 Starting Solana Fresh Wallet Detector Bot...\n');

// Configuration
const config = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  solanaRpcUrl: process.env.SOLANA_RPC_URL,
};

console.log(`📡 RPC URL: ${config.solanaRpcUrl}`);

// Load exchange configuration
const exchangeConfigService = new ExchangeConfigService();
let exchangeConfig;

try {
  exchangeConfig = exchangeConfigService.load();
  console.log('✅ Exchange configuration loaded');

  // Show configured exchanges
  const exchanges = Object.entries(exchangeConfig.exchanges);
  console.log('\n📊 Configured Exchanges:');
  exchanges.forEach(([key, ex]) => {
    const walletCount = ex.wallets.length;
    console.log(`   ${ex.emoji} ${ex.name}: ${walletCount} wallet(s)`);
  });

  console.log(`\n⚙️  Detection Config:`);
  console.log(`   Max Hops: ${exchangeConfig.detectionConfig.maxHops}`);
  console.log(`   First Tx to Analyze: ${exchangeConfig.detectionConfig.firstTransactionsToAnalyze}`);
  console.log(`   Max Age: ${exchangeConfig.detectionConfig.maxAgeHours}h (${exchangeConfig.detectionConfig.maxAgeHours / 24} days)`);

} catch (error) {
  console.error(`❌ Error loading exchange configuration: ${error.message}`);
  console.error(`\n💡 Make sure config/exchanges.json exists and is valid JSON`);
  process.exit(1);
}

// Initialize Solana service
const solanaService = new SolanaService(config.solanaRpcUrl);

// Initialize Telegram bot
console.log('\n🤖 Initializing Telegram Bot...');
const telegramBot = new TelegramBotService(
  config.telegramToken,
  solanaService,
  exchangeConfig
);

console.log('✅ Bot initialized successfully');
console.log('\n🎉 Fresh Wallet Detector Bot is running!');
console.log('📱 Send /start to your bot to begin\n');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down bot...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down bot...');
  process.exit(0);
});
