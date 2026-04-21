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
Choose a tool below to get started:`,

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
