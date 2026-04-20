# Privacy Cash Scanner

## What It Does

The Privacy Cash Scanner traces funds that flow through **Privacy Cash**, a mixing protocol on Solana. Mixers are used to break the on-chain link between a sender and a receiver — SOLFINDER reconnects that link.

## What is Privacy Cash?

Privacy Cash is a protocol on Solana that works like a "mixing pool":

1. **Deposit**: A user sends SOL from Wallet A into the Privacy Cash pool.
2. **Withdrawal**: The same amount comes out of the pool to Wallet B.
3. **Result**: On-chain, Wallet A and Wallet B appear completely unrelated.

This is used for legitimate privacy, but also to obscure the trail of funds. SOLFINDER can link the deposits and withdrawals back together.

## How Detection Works (Overview)

The bot analyzes the Privacy Cash pool's transaction history and uses **amount matching** to connect deposits with their corresponding withdrawals:

- When someone deposits X SOL, the same amount (minus a small protocol fee) will be withdrawn shortly after — sometimes split across multiple wallets.
- By matching the amounts and timing of deposits and withdrawals, the bot can identify which wallets are connected.

> The detection is based on publicly available on-chain data. No cryptographic breaking or protocol exploitation is involved.

## The Three Functions

### Function 1 — Recipients of a Deposit

**"I know who sent funds through the mixer. Where did the money go?"**

- **Input**: A deposit transaction signature (the tx where someone sent SOL into Privacy Cash).
- **Output**: The wallet(s) that received the funds on the other side.

**How to use:**
1. Open Privacy Cash Scanner → Select **"Recipients of a deposit"**.
2. Paste the transaction signature of the deposit.
3. The bot analyzes withdrawals that occurred within 5 minutes after the deposit.
4. It finds the combination of withdrawals whose amounts match the deposit.
5. You get the recipient wallet address(es) and the amounts each one received.

**Example:**
- Deposit: 23.68 SOL by Wallet A at 19:20:00.
- Withdrawals found: 20 SOL to Wallet B at 19:20:15, and 3.68 SOL to Wallet C at 19:20:26.
- Result: Wallet A's funds went to **Wallet B** (20 SOL) and **Wallet C** (3.68 SOL).

### Function 2 — Sender of a Withdrawal

**"I know who received funds from the mixer. Where did the money come from?"**

- **Input**: A withdrawal transaction signature (the tx where a wallet received SOL from Privacy Cash).
- **Output**: The wallet that originally deposited the funds.

**How to use:**
1. Open Privacy Cash Scanner → Select **"Sender of a withdrawal"**.
2. Paste the transaction signature of the withdrawal.
3. The bot searches for deposits in a ±5 minute window around the withdrawal.
4. It matches the withdrawal amount (combined with other withdrawals if the deposit was split).
5. You get the sender wallet and the full deposit amount.

**Bonus**: If the original deposit was split into multiple withdrawals, the bot also shows the **other recipients** — giving you the full picture of where the funds went.

**Example:**
- Withdrawal: 7 SOL received by Wallet X.
- Deposit found: 15 SOL by Wallet Z at 22:17:46.
- Other recipient: Wallet Y received 8 SOL.
- Result: The 15 SOL from **Wallet Z** was split between **Wallet X** (7 SOL) and **Wallet Y** (8 SOL).

### Function 3 — Match All in Time Range

**"Show me everyone who used the mixer in a specific time window."**

- **Input**: A date and a UTC time range (e.g., 19:00 to 19:30).
- **Output**: A paginated list of all matched sender → recipient pairs.

**How to use:**
1. Open Privacy Cash Scanner → Select **"Match all in time range"**.
2. Choose a date: Today, Yesterday, or enter a custom date (DD-MM format).
3. Enter a UTC time range (e.g., `19:00 19:30`). Maximum: 2 hours.
4. The bot fetches all Privacy Cash activity in that window and matches every deposit to its withdrawals.
5. Results are displayed 5 pairs per page with Previous/Next navigation.

**What the results show:**
- Each matched pair shows the **sender wallet**, the **deposit amount**, and all **recipient wallets** with their amounts.
- Unmatched deposits (likely bridged to another blockchain) are listed separately at the end.

## Understanding the Results

| Symbol | Meaning                            |
| ------ | ---------------------------------- |
| 📤     | Sender (the wallet that deposited) |
| 📥     | Recipient (the wallet that received) |
| 🔗     | Other recipients from the same deposit |
| ⚠️     | Bridged — funds likely left Solana |

## Tolerance and Accuracy

- The mixer charges a small fee through a relayer. SOLFINDER accounts for this with a dynamic tolerance.
- **Exact matches** are always prioritized over approximate ones.
- When multiple possible matches exist, the bot picks the one closest in time.

## Limitations

- **Cross-chain bridges**: If someone deposits SOL into Privacy Cash but bridges the funds to Ethereum or another network, the withdrawal won't appear on Solana. The bot will flag these as "bridged" with a note that cross-chain detection is coming soon.
- **High-traffic periods**: During very active periods, there may be multiple valid amount combinations. The bot uses timing proximity to pick the most likely match.
- **Time windows**: Function 1 looks 5 minutes forward. Function 2 looks ±5 minutes. Function 3 scans the full range you specify (max 2 hours). Transactions outside these windows won't be matched.

## Tips

- Get transaction signatures from [Solscan](https://solscan.io) — search for a wallet and find the Privacy Cash transaction in the history.
- For Function 3, start with a 30-minute range to get results quickly. Expand to 2 hours if needed.
- All times are in **UTC**. Check the current UTC time displayed in the bot before entering your range.
