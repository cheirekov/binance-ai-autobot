# Configuration

## Where config is stored

Config is persisted to the Docker volume under `DATA_DIR`:

- `DATA_DIR/config.json`

Default:

- local (non-Docker): `./data/config.json`
- Docker: `/data/config.json`

On API startup, an automatic migration normalizes existing `config.json` to the current schema defaults. This keeps older exports compatible without manual edits.

## Basic onboarding inputs (current)

- Binance API key + secret
- OpenAI API key (required only if `aiEnabled=true`)
- UI Basic Auth username + password
- Trader region profile (`EEA` / `NON_EEA`) — **defaults only**
- Home stable coin (defaulted from region if omitted)
- Trading mode (`SPOT` / `SPOT_GRID`)
- Risk slider (0–100) → affects derived defaults
- Live trading (on/off)
- AI engine (on/off)
- AI min trade confidence (default: `65%`)

## Advanced inputs (current)

- Never-trade symbols list (hard block)
- Auto-blacklist toggle + TTL minutes (temporary cooldown blacklist)
- API base URL override (optional; used by UI proxy when set)
- API key rotation (auto-generated on setup; can be rotated from UI)
- API/UI host + port (informational today; container ports are still controlled by Docker/env)
- Binance environment (Mainnet / Spot testnet) + optional base URL override
  - Mainnet default: `https://api.binance.com`
  - Spot testnet default: `https://demo-api.binance.com`
- Execution policy controls (saved in `config.json`, included in export/import):
  - `followRiskProfile` (recommended): when enabled, runtime safety limits are auto-derived from Basic risk
  - `liveTradeCooldownMs`
  - `liveTradeNotionalCap`
  - `liveTradeSlippageBuffer`
  - `liveTradeRebalanceSellCooldownMs`
  - `conversionBuyBuffer`
  - `conversionSellBuffer`
  - `conversionFeeBuffer`
  - `routingBridgeAssets` (valuation/conversion bridge route candidates)
  - `universeQuoteAssets` (optional explicit quote-asset set; empty = auto mode)
  - `walletQuoteHintLimit` (how many wallet assets can influence auto quote discovery)
  - `excludeStableStablePairs`
  - `enforceRegionPolicy`
  - `symbolEntryCooldownMs`
  - `maxConsecutiveEntriesPerSymbol`
  - `conversionTopUpReserveMultiplier`
  - `conversionTopUpCooldownMs`
  - `conversionTopUpMinTarget`

## Derived defaults

Derived defaults are computed from the risk level to keep Basic onboarding minimal.
These values are **placeholders** and will be replaced with an audited strategy policy.

Current derived fields include:

- `maxOpenPositions`
- `maxPositionPct`
- `allowSpot`, `allowGrid`, `allowFutures`

## Live execution safety (config-first)

Runtime safety values are stored in `config.json` and configurable from UI Advanced.

- `followRiskProfile=true` keeps these values aligned with Basic risk slider.
- `followRiskProfile=false` allows manual override from Advanced.
- Conversion top-up anti-churn uses reserve hysteresis:
  - low target = max(`conversionTopUpMinTarget`, `conversionTopUpMinTarget * conversionTopUpReserveMultiplier`, `walletTotalHome * tier.reserveLowPct`)
  - high target = max(`low * 2`, `walletTotalHome * tier.reserveHighPct`)
  - when quote balance falls below low, conversion aims toward high (bounded by available source assets)
- Capital tiers are runtime-only and derived from total wallet estimate in home stable:
  - `MICRO` (<= 1200): stricter notional cap multiplier + higher required net edge
  - `SMALL` (<= 5000): moderate cap multiplier + moderate required net edge
  - `STANDARD` (> 5000): default cap multiplier + lowest required net edge
- Derived risk controls now enforce runtime position limits:
  - `maxOpenPositions` limits concurrently open bot-managed symbols (quote = home stable)
  - `maxPositionPct` caps both new symbol exposure and target notional sizing per symbol
- Live entries are fee-aware:
  - candidate edge estimate is compared against round-trip costs (fees + spread + slippage buffer)
  - low-edge candidates are skipped with a detailed reason in decisions
- Basic exit path is enabled for live mode:
  - uses bot-managed average entry price per symbol
  - triggers `SELL` on take-profit / stop-loss thresholds derived from Basic risk
  - respects `liveTradeRebalanceSellCooldownMs` to avoid immediate buy/sell churn
- Binance sizing filter rejects (`-1013` / `NOTIONAL` / lot-size) are treated as recoverable sizing events and are not auto-blacklisted.
- On live sizing rejects, bot now sets a short symbol cooldown lock (risk-scaled) to reduce immediate retry churn.

Environment variables still used in runtime:

- `ALLOW_MAINNET_LIVE_TRADING` (default `false`): blocks MAINNET live orders unless explicitly enabled.
- `BINANCE_TAKER_FEE_RATE`
- `ESTIMATED_SPREAD_BUFFER_RATE`
