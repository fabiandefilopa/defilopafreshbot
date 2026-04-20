# Fresh Wallet Scanner

## What It Does

The Fresh Wallet Scanner detects **brand-new wallets** on Solana that have only received funds and never sent any. These wallets are often a signal of **smart money entering the market** — someone withdrawing from an exchange to a clean wallet before making their next move.

## Why It Matters

When experienced traders or institutions move funds, they often:

1. Withdraw from an exchange (Binance, OKX, Bybit, etc.) to a new wallet.
2. Use that fresh wallet to buy tokens, enter DeFi, or fund other wallets.

By detecting these fresh wallets early, you can see **what the smart money is doing before it happens**.

## How It Works

1. **Select Exchanges** — Choose which exchanges to monitor. The bot tracks wallets associated with 15+ major exchanges including Binance, OKX, Bybit, Kucoin, MEXC, and more.

2. **Set a Filter** — Define what you're looking for:
   - **Range**: Find wallets that received between X and Y SOL (e.g., `1 3` for 1-3 SOL).
   - **Target**: Find wallets that received approximately X SOL (e.g., `2.5` for ~2.5 SOL).

3. **Choose Scan Mode**:
   - **Simple**: Finds wallets that received funds directly from the exchange.
   - **Hopping Mode**: Follows up to 3 "hops" — if the exchange sends to Wallet A, then A sends to B, then B sends to C, the bot will track the full chain and find truly fresh wallets at the end.

4. **View Results** — The bot shows each detected wallet with:
   - The wallet address.
   - The amount received.
   - The path it took (if hopping mode was used).
   - A timestamp of when the transfer happened.

## Supported Exchanges

The bot monitors withdrawal wallets from these exchanges:

| Exchange   | Exchange   | Exchange     |
| ---------- | ---------- | ------------ |
| Binance    | Kucoin     | Coinbase     |
| OKX        | BingX      | HTX          |
| Bybit      | MEXC       | WhiteBIT     |
| Bitfinex   | Gate.io    | HitBTC       |
|            |            | ChangeNOW    |

## Example Use Case

> You want to see if any whale is quietly accumulating SOL by withdrawing 10-50 SOL from Binance to fresh wallets.

1. Select **Binance**.
2. Enter filter: `10 50`.
3. Choose **Hopping Mode**.
4. Hit **Scan Now**.

The bot returns all wallets matching your criteria — wallets that only received SOL and never sent any.

## Tips

- **Hopping Mode** is more thorough but takes longer. Use it when you suspect the funds go through intermediate wallets.
- **Simple Mode** is faster and ideal for direct exchange-to-wallet transfers.
- You can select **multiple exchanges** at once for a broader scan.
- Use the **Run Again** button to repeat the same scan with updated results.
