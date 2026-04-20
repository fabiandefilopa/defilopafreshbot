# FAQ

## General

### What is SOLFINDER?
SOLFINDER is a Telegram bot for Solana blockchain intelligence. It detects fresh wallets funded from exchanges and traces funds through Privacy Cash, Solana's mixing protocol.

### Is SOLFINDER free?
Contact us for information about access and pricing plans.

### Do I need to connect my wallet?
No. SOLFINDER is read-only. It analyzes publicly available on-chain data. You never need to connect a wallet, share private keys, or sign any transaction.

### What blockchain does it support?
Currently, **Solana only**. Support for other chains may be added in the future.

### What data does SOLFINDER access?
Only publicly available blockchain data — transaction histories, balance changes, and program interactions. This is the same data visible on any block explorer like Solscan.

---

## Fresh Wallet Scanner

### What counts as a "fresh wallet"?
A wallet that has **only received** SOL and has **never sent** any transaction. This typically indicates a brand-new wallet that hasn't been used yet.

### What does "hopping" mean?
When funds move through intermediate wallets before reaching the final destination. For example: Exchange → Wallet A → Wallet B → Wallet C. Hopping mode follows these chains up to 3 steps deep.

### How many exchanges are supported?
15+ exchanges including Binance, OKX, Bybit, Kucoin, MEXC, Coinbase, and more.

### Can I monitor multiple exchanges at once?
Yes. You can select any combination of exchanges before running a scan.

---

## Privacy Cash Scanner

### How does SOLFINDER trace Privacy Cash transactions?
By analyzing the **amounts and timing** of deposits and withdrawals from the Privacy Cash pool. When someone deposits a specific amount, the same amount (minus fees) appears as one or more withdrawals shortly after. The bot matches these using smart amount analysis.

### Is this breaking Privacy Cash's encryption?
No. SOLFINDER does not break any cryptography. It uses **public transaction data** — the amounts, timestamps, and wallet addresses that are visible to everyone on the blockchain. The matching is based on correlating this public information.

### What is a "bridged" result?
When the bot finds a deposit but can't match it to any withdrawal on Solana, it means the funds likely left the Solana network through a cross-chain bridge (to Ethereum, BNB Chain, etc.). Bridge detection is planned for a future update.

### Why did Function 2 not find a sender?
Possible reasons:
- The deposit happened more than 5 minutes before/after the withdrawal.
- The funds were bridged from another blockchain into Privacy Cash.
- The deposit was split into many small withdrawals that are hard to match.

### What does "other recipients" mean in Function 2?
When someone deposits 15 SOL and it comes out as 7 SOL to Wallet X and 8 SOL to Wallet Y, both wallets are recipients of the same deposit. If you queried for Wallet X, the bot also shows Wallet Y as an "other recipient."

### Why do all times need to be in UTC?
Blockchain transactions are recorded in UTC. To keep everything consistent and avoid confusion, the bot uses UTC for all inputs and outputs. The current UTC time is displayed when you enter a time range.

### What's the maximum time range for Function 3?
2 hours. This keeps the scan fast and within API limits. For longer periods, run multiple scans with different time windows.

---

## Troubleshooting

### The bot says "Invalid time range" but my input looks correct
This usually means the end time is in the **future** (in UTC). Remember: if you're in UTC-3 and it's 21:00 local, it's already 00:00 UTC of the next day. Choose "Yesterday" to query earlier hours.

### The bot is slow or not responding
Large scans (especially Function 3 with a 2-hour range) can take 30-60 seconds. The bot will show a progress indicator. If it doesn't respond after 2 minutes, send `/cancel` and try again.

### I got an error about the transaction not being a Privacy Cash transaction
Make sure you're pasting a transaction that actually interacted with Privacy Cash. You can verify on [Solscan](https://solscan.io) — look for "Privacy Cash: Transact" in the transaction details.

---

## Security and Privacy

### Does SOLFINDER store my data?
The bot processes your requests in real-time. It does not store your queries, wallet addresses, or transaction signatures permanently.

### Can anyone see what I'm searching?
No. Your interactions with the bot are private Telegram messages. Other users cannot see your queries or results.

### Is SOLFINDER safe to use?
Yes. The bot is read-only — it cannot move funds, access wallets, or interact with any protocol on your behalf. It only reads public blockchain data.
