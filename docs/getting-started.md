# Getting Started

## What is SOLFINDER?

SOLFINDER is a Telegram bot that analyzes on-chain activity on the Solana blockchain. It helps you:

- **Track smart money** entering the market through exchanges.
- **Trace funds** that pass through privacy/mixing protocols.
- **Identify wallets** involved in obfuscated transactions.

All analysis is done using publicly available blockchain data. No private keys, no wallet connections, no sign-ups required.

## How to Use

1. Open Telegram and search for the bot (contact us for the bot link).
2. Send `/start` to open the main menu.
3. Choose a tool:
   - **Fresh Wallet Scanner** — to find new wallets funded from exchanges.
   - **Privacy Cash Scanner** — to trace mixer transactions.
4. Follow the on-screen prompts.

## Commands

| Command    | Description                     |
| ---------- | ------------------------------- |
| `/start`   | Open the main menu              |
| `/cancel`  | Cancel the current operation    |
| `/help`    | Show help and usage information |

## Requirements

- A Telegram account.
- Basic understanding of Solana wallets and transactions.
- Transaction signatures (for Privacy Cash Scanner) — you can get these from block explorers like [Solscan](https://solscan.io).

## Times and Dates

All times displayed in the bot are in **UTC**. If you're in a different timezone, convert accordingly:

| Your Timezone | UTC Offset | Example: 21:00 local = |
| ------------- | ---------- | ----------------------- |
| EST (US)      | UTC-5      | 02:00 UTC (next day)    |
| ART (Argentina) | UTC-3   | 00:00 UTC (next day)    |
| CET (Europe)  | UTC+1      | 20:00 UTC               |
| JST (Japan)   | UTC+9      | 12:00 UTC               |

Keep this in mind when selecting dates and time ranges in Function 3 of the Privacy Cash Scanner.
