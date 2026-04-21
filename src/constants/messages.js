/**
 * Bot UI messages — SOLFINDER
 */
export const MESSAGES = {
  WELCOME: `🔎 *SOLFINDER*
━━━━━━━━━━━━━━━━━━━
_On-chain intelligence for Solana._

🆕 *Fresh Wallet Scanner*
Track smart-money entries — detect brand-new wallets funded from Binance, OKX, Bybit & 12 more exchanges. Spot them before they move.

🛡️ *Privacy Cash Scanner*
Break mixer anonymity — trace deposits and withdrawals through Privacy Cash. Find who sent, who received, and match them.

🔔 *Alerts* _(Coming Soon)_
Get notified in real time when specific patterns appear on-chain.

━━━━━━━━━━━━━━━━━━━
Choose a tool below to get started.
Join the community for updates & support:`,

  PRIVACY_CASH_MENU: `🛡️ *Privacy Cash Scanner*
━━━━━━━━━━━━━━━━━━━
_Trace funds flowing through Privacy Cash on Solana._

Choose a detection method:

1️⃣ *Where did the money go?*
Paste a deposit tx → get the recipient wallet(s).

2️⃣ *Where did the money come from?*
Paste a withdrawal tx → get the original sender.

3️⃣ *Scan a time window*
Pick a date & hour range → see all matched pairs.`,

  PC_FUNC1_INPUT: `📤 *Where Did the Money Go?*
━━━━━━━━━━━━━━━━━━━
Paste the *deposit transaction signature* — the tx where a wallet sent SOL into Privacy Cash.

I'll find the wallet(s) that received the funds on the other side within a 5-minute window.

_How to find it:_ search the sender's wallet on Solscan and locate the Privacy Cash "Transact" tx.`,

  PC_FUNC2_INPUT: `📥 *Where Did the Money Come From?*
━━━━━━━━━━━━━━━━━━━
Paste the *withdrawal transaction signature* — the tx where a wallet received SOL from Privacy Cash.

I'll find the wallet that originally deposited the funds, plus any other recipients from the same deposit.

_How to find it:_ search the recipient's wallet on Solscan and locate the Privacy Cash "Transact" tx.`,

  PC_FUNC3_DATE: `📊 *Scan a Time Window*
━━━━━━━━━━━━━━━━━━━
Match all Privacy Cash senders ↔ recipients in a specific time range.

*Step 1 — Select date (UTC):*`,

  PC_FUNC3_DATE_CUSTOM: `✏️ *Custom Date*

Send the date in *DD-MM* format (year is 2026).

_Examples:_
\`13-04\` → April 13
\`01-05\` → May 1`,

  PC_FUNC3_TIME: `*Step 2 — Enter time range (UTC):*

Format: \`HH:MM HH:MM\`

_Examples:_
\`19:00 19:30\` → 30 min window
\`14:15 16:15\` → 2 hours (max)

Rules:
• End must be after start
• Max range: 2 hours
• Cannot be in the future`,

  PC_BRIDGED: `⚠️ *Possible Bridge Detected*

No matching withdrawal was found on Solana. The funds were likely bridged to another network (Ethereum, BNB Chain, etc.).

_Cross-chain bridge detection is coming in a future update._`,

  PC_INVALID_SIGNATURE: `❌ *Invalid Signature*

That doesn't look like a valid Solana transaction signature. It should be a long base58 string (87-88 characters).

_Tip: copy it directly from Solscan to avoid typos._`,

  PC_TX_NOT_FOUND: `❌ *Transaction Not Found*

Couldn't fetch this transaction. Double-check the signature and try again.`,

  PC_NOT_PRIVACY_CASH: `❌ *Not a Privacy Cash Transaction*

This tx didn't interact with the Privacy Cash pool. Make sure you're pasting a "Transact" tx from Privacy Cash.

_Tip: on Solscan, look for "Privacy Cash: Transact" in the instruction list._`,

  PC_WRONG_DIRECTION_DEPOSIT: `❌ *Wrong Direction*

This is a withdrawal, not a deposit.
→ Use *Function 2* ("Where did the money come from?") for this tx.`,

  PC_WRONG_DIRECTION_WITHDRAWAL: `❌ *Wrong Direction*

This is a deposit, not a withdrawal.
→ Use *Function 1* ("Where did the money go?") for this tx.`,

  PC_INVALID_DATE: `❌ *Invalid Date*

Send the date as *DD-MM* (e.g., \`13-04\` for April 13).`,

  PC_INVALID_TIME_RANGE: `❌ *Invalid Time Range*

Send it as \`HH:MM HH:MM\` (e.g., \`19:00 19:30\`).
Max range: 2 hours. End must be after start. Cannot be in the future.`,

  PC_NO_ACTIVITY: `ℹ️ *No Activity Found*

No Privacy Cash transactions were found in that range. Try a different time window.`,

  SELECT_EXCHANGE: `🆕 *Fresh Wallet Scanner*
━━━━━━━━━━━━━━━━━━━
_Detect wallets with only incoming transfers — no outgoing activity._

Toggle the exchanges you want to monitor:`,

  ENTER_FILTER: `📊 *Set Amount Filter*

Choose how to filter results:

• *Range*: two numbers separated by a space
  \`1 3\` → wallets that received 1-3 SOL

• *Target*: a single number
  \`2.5\` → wallets that received ~2.5 SOL (±10%)

_Examples:_
\`1 3\` · \`2.5\` · \`0.5 1.5\` · \`10 50\``,

  getFilterInput(exchangeName) {
    return `🟡 *${exchangeName} — Fresh Wallet Scanner*

*Set amount filter:*

📊 Range → \`1 3\`
🎯 Target → \`2.5\``;
  },

  FAQ_MENU: `❓ *SOLFINDER — FAQ*
━━━━━━━━━━━━━━━━━━━
_Everything you need to know, explained simply._

Choose a topic:`,

  FAQ_GENERAL: `❓ *FAQ — General*
━━━━━━━━━━━━━━━━━━━

*What is SOLFINDER?*
SOLFINDER is a Telegram bot that helps you investigate money movements on the Solana blockchain. Think of it as a detective tool for crypto — it can track where money goes, where it comes from, and who's behind certain transactions.

*What is Solana?*
Solana is a blockchain — a public digital ledger where all transactions are recorded and visible to anyone. SOL is its currency (like ETH is for Ethereum). Every time someone sends or receives SOL, it's recorded on this public ledger forever.

*What is a wallet?*
A wallet is like a bank account for crypto. It has a unique address (a long string of letters and numbers). Anyone can look up what a wallet has done on a block explorer like Solscan.

*Do I need to connect my wallet?*
No, never. SOLFINDER only reads public blockchain data. It cannot access your wallet, move your funds, or do anything besides look at information that is already public. No sign-ups, no passwords, no risk.

*What data does SOLFINDER access?*
Only publicly available information — the same data you can see on solscan.io. Transaction amounts, wallet addresses, timestamps. Nothing private.

*Is it free?*
Contact us for information about access and plans.`,

  FAQ_FRESH: `❓ *FAQ — Fresh Wallet Scanner*
━━━━━━━━━━━━━━━━━━━

*What is a "fresh wallet"?*
A wallet that has only received crypto and never sent any. Imagine someone opens a brand new bank account and deposits money but hasn't spent a cent yet — that's a fresh wallet.

*Why does this matter?*
When experienced traders (sometimes called "smart money" or "whales") want to make a move, they often:
1. Withdraw from an exchange (Binance, OKX, etc.) to a brand new wallet.
2. Use that wallet to buy tokens or enter positions.
By detecting these fresh wallets early, you can see what big players are doing before the market reacts.

*What is an exchange?*
An exchange is a platform where people buy and sell crypto (like Binance, Coinbase, OKX). When someone withdraws SOL from an exchange, it goes from the exchange's wallet to their personal wallet — and SOLFINDER can detect that.

*What are the scan modes?*
• *Simple mode* — Looks at direct transfers: Exchange sends SOL straight to a new wallet. Fast and straightforward.
• *Hopping mode* — Sometimes people pass money through middleman wallets to hide the origin. Example: Exchange → Wallet A → Wallet B → Wallet C. Hopping mode follows the money trail up to 3 steps (hops) to find the final fresh wallet. Slower but catches hidden activity.

*What's the amount filter?*
You decide what amounts to look for:
• Range: \`1 3\` = find wallets that received between 1 and 3 SOL
• Target: \`2.5\` = find wallets that received approximately 2.5 SOL
This helps you focus on specific activity (e.g., large whale deposits of 50+ SOL).

*How many exchanges are tracked?*
15+ major exchanges including Binance, OKX, Bybit, Kucoin, MEXC, Coinbase, Gate.io, Bitfinex, and more. You can select one or many at once.`,

  FAQ_PRIVACY: `❓ *FAQ — Privacy Cash Scanner*
━━━━━━━━━━━━━━━━━━━

*What is Privacy Cash?*
Privacy Cash is a "mixer" on Solana. A mixer is a tool that helps people hide where their money came from. Here's how it works:
1. You send 10 SOL from Wallet A into a shared pool.
2. Later, 10 SOL comes out of that pool to Wallet B.
3. On the blockchain, there's no visible link between Wallet A and Wallet B.
People use this for legitimate privacy, but also to hide suspicious activity.

*How does SOLFINDER break this anonymity?*
By being smart about amounts and timing. Even though the mixer hides the direct link, the amounts still need to match. If Wallet A deposits 23.68 SOL at 19:20 and two withdrawals of 20 SOL and 3.68 SOL happen within 5 minutes... that's very likely the same money. SOLFINDER finds these matches automatically.

*Does it break encryption?*
No. Everything SOLFINDER does is based on publicly visible data. It doesn't hack or break anything — it simply connects the dots that are already visible on the blockchain.

*The 3 detection functions:*

📤 *"Where did the money go?"*
You have a transaction where someone deposited into the mixer. SOLFINDER finds the wallet(s) that received those funds on the other side. Useful when you know the sender and want to find the receiver.

📥 *"Where did it come from?"*
The reverse — you have a transaction where someone received from the mixer. SOLFINDER finds who originally deposited the money. It also shows other wallets that received from the same deposit.

📊 *"Scan a time window"*
Pick a date and time range (up to 2 hours), and SOLFINDER matches ALL deposits with their withdrawals in that window. See the full picture of who sent what to whom.

*What is "bridged"?*
Sometimes someone deposits SOL into the mixer but moves it to a different blockchain (like Ethereum) instead of withdrawing back to Solana. When SOLFINDER can't find a match, it flags it as "bridged." This cross-chain detection is coming in a future update.

*What are "other recipients"?*
If someone deposits 15 SOL and it exits as 7 SOL to one wallet and 8 SOL to another, both wallets are recipients. SOLFINDER shows all of them, giving you the full picture of how the deposit was split.`,

  FAQ_TROUBLESHOOTING: `❓ *FAQ — Troubleshooting & Security*
━━━━━━━━━━━━━━━━━━━

*TROUBLESHOOTING*

*"Invalid time range" — why?*
All times in the bot are UTC (Coordinated Universal Time), which may differ from your local time. For example:
• If you're in Argentina (UTC-3) and it's 21:00 local → it's 00:00 UTC (next day!)
• So if you want to check "today's afternoon" in your local time, you may need to pick "Yesterday" in UTC
The bot shows the current UTC time to help you.

*The bot is slow or not responding*
Large scans (especially the time window scan with a 2-hour range) can take 30-60 seconds because it needs to fetch and analyze many transactions. You'll see a progress indicator. If nothing happens after 2 minutes, send /cancel and try again.

*"Not a Privacy Cash transaction"*
Make sure you're pasting the right transaction. On Solscan, the transaction should show "Privacy Cash: Transact" in its instruction list. If it says something else, it's not a mixer transaction.

*Where do I get a transaction signature?*
Go to solscan.io, search for the wallet address, and look at its transaction history. Click on a transaction — the long string in the URL (or at the top of the page) is the signature. Copy and paste it into the bot.

━━━━━━━━━━━━━━━━━━━
*SECURITY*

*Is my search private?*
Yes. Your messages to the bot are private Telegram messages. No one else can see what you search for or what results you get.

*Can SOLFINDER access my wallet?*
No. The bot is 100% read-only. It cannot move funds, sign transactions, access your private keys, or interact with any protocol on your behalf. It only reads publicly available blockchain data.

*Does it store my data?*
No. Queries are processed in real-time and not stored. Your wallet addresses, transaction signatures, and results are not saved.

*Is this legal?*
SOLFINDER only accesses publicly available blockchain data — the same data anyone can see on block explorers like Solscan. It does not break encryption or access private information.`,

  HELP: `📖 *SOLFINDER — Help*
━━━━━━━━━━━━━━━━━━━

*🆕 Fresh Wallet Scanner*
Detects brand-new wallets funded from exchanges.
1. Select exchange(s) to monitor
2. Set an amount filter (range or target)
3. Choose scan mode (Simple or Hopping)
4. View results with wallet details

*🛡️ Privacy Cash Scanner*
Traces funds through Privacy Cash mixer.
1. Recipients of a deposit — find where the money went
2. Sender of a withdrawal — find where it came from
3. Match all in time range — scan an entire window

*Commands:*
/start — Main menu
/cancel — Cancel current operation
/help — This help message

*Tips:*
• Hopping mode follows up to 3 intermediate wallets
• Get tx signatures from solscan.io
• All times are in UTC
• Privacy Cash detection uses smart amount matching`
};

export default MESSAGES;
