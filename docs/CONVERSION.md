# Conversion & fee modeling (notes)

## Base vs quote (Binance symbols)

A spot symbol like `XRPBTC` is typically interpreted as:

- **Base asset**: `XRP`
- **Quote asset**: `BTC`

Meaning:

- **BUY**: you spend the **quote** asset (`BTC`) to buy the **base** asset (`XRP`)
- **SELL**: you sell the **base** asset (`XRP`) to receive the **quote** asset (`BTC`)

## Home stable coin aggregation (example)

If your home stable coin is `USDC` and you decide to trade `XRPBTC`:

1. You need `BTC` as the quote asset to place `XRPBTC` buys.
2. If you currently hold `USDC`, you must convert `USDC → BTC` first (e.g. via `BTCUSDC`).
3. Only after you hold enough `BTC` can you place `XRPBTC` buy orders.

In practice the bot should build a conversion path graph (direct pair, or via an intermediate asset) and select the cheapest path.

## Fees (do not assume)

Fee behavior depends on exchange settings and the actual fills returned by Binance:

- The commission asset can vary (e.g., discounted fees in another token).
- For accurate reporting, store every fill with:
  - executed quantity and price
  - commission amount and commission asset
  - timestamps

To aggregate PnL in `USDC`, convert each commission and each realized PnL component into `USDC` using a verifiable price source (ideally at fill time).

## MVP stance

- We will **not** hardcode fee/tax assumptions.
- We will compute and persist a replayable trade ledger once real Binance order placement is implemented.

