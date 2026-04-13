/**
 * Bot UI messages (English)
 */
export const MESSAGES = {
  WELCOME: `🤖 *DEFILOPA SOL BOT*

On-chain intelligence for Solana wallets.

*Available tools:*

🆕 *Fresh Wallet Scanner*
Detects brand-new wallets receiving funds from major exchanges (Binance, OKX, Bybit, etc.). Useful to spot smart-money entries before they move.

🛡️ *Privacy Cash Scanner*
Detects wallets interacting with Privacy Cash mixers/protocols on Solana. Useful to flag obfuscated funds and trace their on-chain footprint.

*Select a tool:*`,

  PRIVACY_CASH_MENU: `🛡️ *Privacy Cash Scanner*

Detects wallets that have interacted with Privacy Cash protocols on Solana (deposits, withdrawals, mixing patterns).

⚙️ _Detection logic is being configured. Choose an option below:_`,

  SELECT_EXCHANGE: `🆕 *Fresh Wallet Scanner*

Detects wallets with only incoming transactions (no withdrawals).

*Select exchange to monitor:*`,

  ENTER_FILTER: `📊 *Set Filter*

Enter a range or target amount:

• *Range*: Send two numbers (e.g., \`1 3\`)
  → Finds fresh wallets between 1-3 SOL

• *Target*: Send one number (e.g., \`2.5\`)
  → Finds fresh wallets ~2.5 SOL (±10%)

*Examples:*
\`1 3\` → Range 1-3 SOL
\`2.5\` → Target ~2.5 SOL
\`0.5 1.5\` → Range 0.5-1.5 SOL`,

  getFilterInput(exchangeName) {
    return `🟡 *${exchangeName} - Fresh Wallet Scanner*

*Set filter:*

📊 Enter range (e.g., \`1 3\`)
🎯 Enter target (e.g., \`2.5\`)`;
  },

  HELP: `📖 *Fresh Wallet Detector - Help*

*What is a Fresh Wallet?*
A wallet with only incoming transactions (no withdrawals).

*How it works:*
1. Select an exchange (Binance, OKX, etc.)
2. Set a filter (range or target amount)
3. Scan for fresh wallets
4. View results with transaction details

*Commands:*
/start - Main menu
/cancel - Cancel current operation
/help - Show this help

*Tips:*
• The bot follows up to 3 "hops" to find truly fresh wallets
• Results show the path if multiple hops were followed
• No time restrictions - scans use Helius API limits`
};

export default MESSAGES;
