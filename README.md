# 🔍 Solana Fresh Wallet Detector Bot

Advanced Telegram bot for detecting fresh wallets (wallets with only incoming transactions) on Solana blockchain, with sophisticated hop/loop detection logic.

## 🎯 What is a Fresh Wallet?

A **fresh wallet** is a wallet that has only received SOL but has never sent it out. This bot implements advanced pattern analysis to detect truly fresh wallets by following transaction chains up to 3 hops.

### Detection Algorithm

```
Exchange Wallet → W0 → W1 → W2 (Fresh!)
                  ↓
                  Pattern Analysis:
                  • Virgin wallet (0 tx) → Fresh ✅
                  • Only receives → Fresh ✅
                  • 1 receive + 1 withdraw → Follow hop ➡️
                  • Multiple mixed tx → Not fresh ❌
```

## ✨ Features

- ✅ **Fresh Wallet Detection** with loop/hop logic (up to 3 hops)
- ✅ **Multi-Exchange Support** (Binance, OKX, Bybit - configurable via JSON)
- ✅ **Smart Filtering** (by range or target amount)
- ✅ **Button-Based UI** (hierarchical menus in English)
- ✅ **No Time Restrictions** (uses Helius API limits only)
- ✅ **Pattern Analysis** (analyzes first N transactions to determine freshness)
- ✅ **Path Tracking** (shows wallet chain when hops are detected)
- ✅ **Extensible Architecture** (add new features easily)

## 📋 Requirements

- Node.js 18+
- Telegram Bot Token
- Helius RPC URL (or other Solana RPC provider)

## 🔧 Installation

### 1. Create Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot`
3. Follow instructions to name your bot
4. **Save the token** it gives you

### 2. Get Helius RPC URL

1. Go to [helius.dev](https://helius.dev)
2. Sign up for free tier
3. Create a new project
4. Copy your RPC URL (looks like: `https://mainnet.helius-rpc.com/?api-key=YOUR_KEY`)

### 3. Configure Project

```bash
# Clone or copy the project
cd solana-wallet-bot

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

### 4. Configure Environment Variables

Edit `.env` file:

```env
# Your Telegram bot token from @BotFather
TELEGRAM_BOT_TOKEN=7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxx

# Helius RPC URL (required for best performance)
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
```

### 5. Configure Exchanges

Edit `config/exchanges.json` to add exchange wallets:

```json
{
  "exchanges": {
    "binance": {
      "name": "Binance",
      "emoji": "🟡",
      "wallets": [
        "5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9",
        "ADD_MORE_WALLETS_HERE"
      ]
    },
    "okx": {
      "name": "OKX",
      "emoji": "🔵",
      "wallets": []
    },
    "bybit": {
      "name": "Bybit",
      "emoji": "🟠",
      "wallets": []
    }
  },
  "detectionConfig": {
    "maxHops": 3,
    "firstTransactionsToAnalyze": 3,
    "minSignificantAmount": 0.000001
  }
}
```

**To add more exchanges:** Just add a new entry to the `exchanges` object with `name`, `emoji`, and `wallets` array.

### 6. Start Bot

```bash
# Production
npm start

# Development (with hot reload)
npm run dev
```

You should see:

```
🚀 Starting Solana Fresh Wallet Detector Bot...

📡 RPC URL: https://mainnet.helius-rpc.com/?api-key=...
✅ Exchange configuration loaded

📊 Configured Exchanges:
   🟡 Binance: 1 wallet(s)
   🔵 OKX: 0 wallet(s)
   🟠 Bybit: 0 wallet(s)

⚙️  Detection Config:
   Max Hops: 3
   First Tx to Analyze: 3

🤖 Initializing Telegram Bot...
✅ Bot initialized successfully

🎉 Fresh Wallet Detector Bot is running!
📱 Send /start to your bot to begin
```

## 📱 Using the Bot

### 1. Start the Bot

Send `/start` to your bot. You'll see:

```
🔍 Solana Wallet Detector

Analyze on-chain wallet activity and detect patterns.

Select a feature:
[🆕 Fresh Wallet Scanner]
[📊 Wallet Tracker (Coming Soon)]
[🔔 Alerts (Coming Soon)]
```

### 2. Select Fresh Wallet Scanner

Click **🆕 Fresh Wallet Scanner**. You'll see exchange selection:

```
🆕 Fresh Wallet Scanner

Detects wallets with only incoming transactions (no withdrawals).

Select exchange to monitor:
[🟡 Binance (1 wallet)]
[🔵 OKX (not configured)]
[🟠 Bybit (not configured)]
[⬅️ Back]
```

### 3. Select Exchange

Click **🟡 Binance**. The bot will ask for a filter:

```
🟡 Binance - Fresh Wallet Scanner

Set filter:

📊 Enter range (e.g., 1 3)
🎯 Enter target (e.g., 2.5)
```

### 4. Enter Filter

**Range filter:** Send two numbers (e.g., `1 3` to find wallets between 1-3 SOL)

**Target filter:** Send one number (e.g., `2.5` to find wallets around 2.5 SOL ±10%)

Example: Send `1 3`

```
✅ Filter Set

Exchange: 🟡 Binance
Filter: 1 - 3 SOL

Ready to scan 1 wallet(s)

[🔍 Scan Now]
[⚙️ Change Filter]
[⬅️ Back to Exchanges]
[❌ Cancel]
```

### 5. Start Scan

Click **🔍 Scan Now**. The bot will analyze transactions:

```
🔍 Scanning...

Exchange: 🟡 Binance
Analyzing transactions...
```

### 6. View Results

If fresh wallets are found:

```
✅ Scan Complete

Found 5 fresh wallets
```

Then for each fresh wallet:

```
💎 Fresh Wallet Detected

💰 Amount: 2.450000 SOL
🆕 Wallet: `7xK9...abc123`
📅 Jan 24, 03:45 PM
🔗 Path (2 hops): 5tzFki → 8aB2Cd → 7xK9ab

🔗 View TX | View Wallet
```

**Path explanation:**
- **0 hops**: Wallet received directly from exchange
- **1 hop**: Exchange → Intermediate wallet → Fresh wallet
- **2 hops**: Exchange → W1 → W2 → Fresh wallet

## 🔍 How Detection Works

### Pattern Analysis

For each wallet that received SOL from an exchange, the bot analyzes its **first 3 transactions** (configurable):

#### Pattern 1: Virgin Wallet (Fresh ✅)
```
Transactions: []
Result: Fresh wallet (never used)
```

#### Pattern 2: Only Receiving (Fresh ✅)
```
Transactions: [Receive 2 SOL, Receive 1 SOL, Receive 0.5 SOL]
Result: Fresh wallet (only receives, no withdrawals)
```

#### Pattern 3: Hop Pattern (Follow ➡️)
```
Transactions: [Receive 2 SOL, Withdraw 1.9 SOL to W1]
Action: Analyze W1 (repeat pattern analysis)
Max hops: 3 (configurable)
```

#### Pattern 4: Mixed Pattern (Not Fresh ❌)
```
Transactions: [Receive 2 SOL, Withdraw 1 SOL, Receive 0.5 SOL, Withdraw 0.3 SOL]
Result: Not fresh (multiple withdrawals)
```

### Loop Detection Rules

1. **Stops if withdraws back to exchange**
   ```
   W0: Receive from Binance → Withdraw to Binance
   Result: Not fresh (circular transaction)
   ```

2. **Stops at max hops (default: 3)**
   ```
   Exchange → W0 → W1 → W2 → W3 → W4
   Max hops reached at W3
   Result: Not fresh (too many hops)
   ```

3. **Detects fresh at any hop**
   ```
   Exchange → W0 (1 receive + 1 withdraw) → W1 (only receives)
   Result: W1 is fresh (found after 1 hop)
   ```

## ⚙️ Configuration

### Detection Config

Edit `config/exchanges.json` → `detectionConfig`:

```json
{
  "detectionConfig": {
    "maxHops": 3,                      // Maximum hops to follow
    "firstTransactionsToAnalyze": 3,   // How many first tx to analyze
    "minSignificantAmount": 0.000001   // Minimum SOL to consider (filters dust)
  }
}
```

### Adding More Binance Wallets

Edit `config/exchanges.json`:

```json
{
  "exchanges": {
    "binance": {
      "name": "Binance",
      "emoji": "🟡",
      "wallets": [
        "5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9",
        "WALLET_ADDRESS_2",
        "WALLET_ADDRESS_3"
      ]
    }
  }
}
```

### Adding New Exchange

Edit `config/exchanges.json`:

```json
{
  "exchanges": {
    "binance": { ... },
    "kraken": {
      "name": "Kraken",
      "emoji": "🟣",
      "wallets": [
        "KRAKEN_WALLET_1",
        "KRAKEN_WALLET_2"
      ]
    }
  }
}
```

The bot will automatically show the new exchange in the menu.

## 🎛️ Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Show main menu and features |
| `/help` | Show help and explanation |
| `/cancel` | Cancel current operation and return to main menu |

## 🏗️ Architecture

### Project Structure

```
solana-wallet-bot/
├── config/
│   └── exchanges.json              # Exchange wallets configuration
├── src/
│   ├── index.js                    # Entry point (bot initialization)
│   ├── constants/
│   │   ├── states.js               # State machine states
│   │   ├── messages.js             # UI text (English)
│   │   └── programs.js             # Solana program addresses
│   ├── models/
│   │   ├── FreshWalletResult.js    # DTO for detection results
│   │   └── UserSession.js          # Session state model
│   ├── core/                       # Business logic (pure, testable)
│   │   ├── FreshWalletDetector.js  # Main detection logic with loops
│   │   └── TransactionAnalyzer.js  # Analyze tx type (receive/withdraw)
│   ├── services/
│   │   ├── SolanaService.js        # Helius API interactions
│   │   ├── ExchangeConfigService.js # Load/manage exchange configs
│   │   └── TelegramBotService.js   # Bot UI with state machine
│   └── utils/
│       └── (validators, formatters, logger)
└── package.json
```

### State Machine

```
IDLE → FEATURE_SELECTION → EXCHANGE_SELECTION → FILTER_INPUT
         ↓                      ↓                    ↓
    FILTER_CONFIRMATION → SCANNING → RESULTS → (back to any state)
```

### Technology Stack

- **Node.js 18+** with ES Modules
- **@solana/web3.js** v1.95.0 (Solana blockchain)
- **node-telegram-bot-api** v0.66.0 (Telegram Bot API)
- **Helius RPC** (Solana RPC provider)

## 🔐 Recommended RPCs

The public Solana RPC has strict rate limits. For best performance:

| Provider | URL | Notes |
|----------|-----|-------|
| [Helius](https://helius.dev) | `https://mainnet.helius-rpc.com/?api-key=KEY` | **Recommended** - Generous free tier |
| [QuickNode](https://quicknode.com) | Your custom endpoint | Very fast |
| [Alchemy](https://alchemy.com) | Your custom endpoint | Free tier available |
| [Triton](https://triton.one) | Your custom endpoint | Solana-specialized |

## 📊 Example Results

### Fresh Wallet with 0 Hops (Direct)

```
💎 Fresh Wallet Detected

💰 Amount: 5.234567 SOL
🆕 Wallet: `9xK2...def456`
📅 Jan 24, 02:30 PM

🔗 View TX | View Wallet
```

### Fresh Wallet with 2 Hops (Chain)

```
💎 Fresh Wallet Detected

💰 Amount: 1.850000 SOL
🆕 Wallet: `3aB7...xyz789`
📅 Jan 24, 01:15 PM
🔗 Path (2 hops): 5tzFki → 8aB2Cd → 9xDe12 → 3aB7xy

🔗 View TX | View Wallet
```

**Explanation:** The SOL traveled through 2 intermediate wallets before reaching the fresh wallet.

## ⚠️ Important Notes

1. **Rate Limits**: Public RPC has limits. Use Helius or similar for reliable scanning.

2. **Blockchain Delays**: Transactions may take a few seconds to appear on-chain.

3. **Analysis Accuracy**: The bot analyzes transaction balance changes. Complex DeFi interactions may not be captured perfectly.

4. **Fresh Wallet Definition**: "Fresh" means only receives, no withdrawals. This doesn't guarantee the wallet won't be used later.

5. **Security**: Never share your Telegram bot token or RPC API key.

6. **No Time Restrictions**: The bot scans as many transactions as Helius API allows (no 24h limit).

## 🚀 Future Features (Coming Soon)

- 📊 **Wallet Tracker**: Monitor specific wallets for activity
- 🔔 **Alerts**: Get notified when patterns match criteria
- 📈 **Statistics**: View detection stats and trends
- 💾 **History**: Save and export scan results
- 🎯 **Advanced Filters**: Filter by token type, contract interaction, etc.

## 🐛 Troubleshooting

### Bot doesn't respond

1. Check if bot is running: `npm run dev`
2. Verify `TELEGRAM_BOT_TOKEN` in `.env`
3. Check console for errors

### No fresh wallets found

1. Try adjusting filter range (e.g., `0.1 10` for wider range)
2. Check if exchange wallets are correct in `config/exchanges.json`
3. Verify RPC URL is working

### RPC rate limit errors

1. Upgrade to Helius paid tier
2. Reduce scan frequency
3. Use a different RPC provider

### "No wallets configured for this exchange"

1. Edit `config/exchanges.json`
2. Add wallet addresses to the `wallets` array for that exchange
3. Restart the bot

## 🌐 Production Deployment (Vercel)

Deploy your bot to Vercel for 24/7 operation with zero server maintenance.

### Why Vercel?

- **Serverless**: No need to maintain a running server
- **Free Tier**: Generous free tier for personal use
- **Auto-Scaling**: Handles traffic spikes automatically
- **Global CDN**: Fast response times worldwide

### Quick Deploy

1. **Setup Supabase Database** (5 minutes)
   ```bash
   # See database/QUICK_SUPABASE_SETUP.md
   ```

2. **Deploy to Vercel** (2 minutes)
   ```bash
   npm install -g vercel
   npm run deploy
   ```

3. **Configure Webhook** (1 minute)
   ```bash
   npm run set-webhook https://your-app.vercel.app/api/webhook
   ```

### Full Deployment Guide

See **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** for step-by-step instructions.

### Available Scripts

```bash
# Deploy to Vercel production
npm run deploy

# Deploy to Vercel preview (testing)
npm run deploy:dev

# Set Telegram webhook
npm run set-webhook https://your-url.vercel.app/api/webhook
```

### Supabase Integration

The bot now includes Supabase for:
- User tracking (who uses the bot)
- Scan history (future feature)

**Setup Guide:** [database/QUICK_SUPABASE_SETUP.md](database/QUICK_SUPABASE_SETUP.md)

### Environment Variables for Vercel

Configure these in Vercel Dashboard → Settings → Environment Variables:

```
TELEGRAM_BOT_TOKEN=your-token
SOLANA_RPC_URL=your-rpc-url
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-key
```

### Deployment Files

- `vercel.json` - Vercel configuration
- `api/webhook.js` - Serverless webhook endpoint
- `scripts/set-webhook.js` - Webhook setup utility
- `VERCEL_DEPLOYMENT.md` - Detailed deployment guide
- `DEPLOYMENT_CHECKLIST.md` - Step-by-step checklist

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📧 Support

For issues or questions:

1. Check the troubleshooting section
2. Review console logs for errors
3. Open an issue on GitHub (if applicable)

## 📚 Additional Documentation

- [Vercel Deployment Guide](VERCEL_DEPLOYMENT.md) - Full Vercel setup
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md) - Step-by-step guide
- [Supabase Setup](database/QUICK_SUPABASE_SETUP.md) - Database configuration

---

**Happy wallet hunting! 🔍💎**
