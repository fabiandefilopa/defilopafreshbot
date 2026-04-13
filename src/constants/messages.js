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

Trace funds flowing through Privacy Cash on Solana.

*Available detections:*

1️⃣ *Recipients of a deposit*
Given a deposit tx, find the wallet(s) that received the funds on the other side.

2️⃣ *Sender of a withdrawal*
Given a withdrawal tx, find the wallet that originally deposited the funds.

3️⃣ *Match all in time range*
Match senders ↔ recipients for every Privacy Cash tx in a given hour range.

*Select a detection:*`,

  PC_FUNC1_INPUT: `1️⃣ *Recipients of a deposit*

Send me the *deposit tx signature* of the wallet that used Privacy Cash.

_Example:_
\`5a7XvPfuvDyAfnVA5so2LAhVsJhVXDNeU4VofNq6mFxVNbbhXmTn8dVd74UdiZTi7PcVmxoXZSj9a4BZbtnUQXxw\`

Tolerance: dynamic (max of 0.03 SOL or 0.5% of deposit) — relayer fees are accounted for.`,

  PC_FUNC2_INPUT: `2️⃣ *Sender of a withdrawal*

Send me the *withdrawal tx signature* (the tx where a wallet received funds from Privacy Cash).

_Example:_
\`4Xm7gSE8BG7rWvbL9gkbX1HxobGU5r9PhRKVK6gz7ynKtpcjzpqzet5k8tbNXLdPsevLTSee6so76ikGsRSycuhQ\`

I'll match against deposits in a ±5 min window around the withdrawal.`,

  PC_FUNC3_DATE: `3️⃣ *Match all in time range*

*Step 1 — Select date (UTC):*`,

  PC_FUNC3_DATE_CUSTOM: `✏️ *Custom date*

Send the date in *DD-MM* format (year 2026).

_Examples:_
\`13-04\` → April 13, 2026
\`01-05\` → May 1, 2026`,

  PC_FUNC3_TIME: `⏰ *Step 2 — Enter time range (UTC):*

Format: \`HH:MM HH:MM\`

_Examples:_
\`19:00 19:30\` → 30 min
\`14:15 16:15\` → 2 hours (max)

*Rules:*
• End must be after start
• Max range: 2 hours
• Time cannot be in the future`,

  PC_BRIDGED: `⚠️ *Bridge detection coming soon*

No matching combination was found within the expected window. This usually means the funds were bridged to another network (Ethereum, BNB, etc.).

An update to detect cross-chain bridges will be available soon.`,

  PC_INVALID_SIGNATURE: `❌ *Invalid signature*

The signature you sent doesn't look like a valid Solana transaction. Please try again.`,

  PC_TX_NOT_FOUND: `❌ *Transaction not found*

I couldn't fetch that transaction from the RPC. Check the signature and try again.`,

  PC_NOT_PRIVACY_CASH: `❌ *Not a Privacy Cash transaction*

This tx does not interact with the Privacy Cash pool. Please send a valid Privacy Cash deposit or withdrawal signature.`,

  PC_WRONG_DIRECTION_DEPOSIT: `❌ *This is a withdrawal, not a deposit*

Function 1 needs a deposit tx (wallet → Privacy Cash). Use function 2 for withdrawals.`,

  PC_WRONG_DIRECTION_WITHDRAWAL: `❌ *This is a deposit, not a withdrawal*

Function 2 needs a withdrawal tx (Privacy Cash → wallet). Use function 1 for deposits.`,

  PC_INVALID_DATE: `❌ *Invalid date format*

Please send the date as *DD-MM* (e.g., \`13-04\`).`,

  PC_INVALID_TIME_RANGE: `❌ *Invalid time range*

Please send it as \`HH:MM HH:MM\` (e.g., \`19:00 19:30\`).
Max range: 2 hours. End must be after start. Time cannot be in the future.`,

  PC_NO_ACTIVITY: `ℹ️ *No Privacy Cash activity*

No Privacy Cash transactions were found in the selected range.`,

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
