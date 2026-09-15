# Roadmap (proposed)

## Delivery mode (updated Feb 11, 2026)

Two-track execution is active:

- **Track A (baseline live path):** deterministic strategy execution on Binance Spot testnet with KPI logging.
- **Track B (adaptive shadow path):** regime + strategy recommendations are logged only and do not place orders yet.

Planned timeboxes (engineering estimates):

- Track A stabilization + risk hardening (`maxDailyLoss`, re-entry lock, wallet sweep policy): **2-3 working days**
- Track B adaptive policy v1 (shadow scoring + explainability + promotion gates): **2-4 working days**
- Controlled promotion (adaptive sizing influence only, then entries): **2-3 working days**

Latest implementation update (Feb 11, 2026):

- Added baseline KPI + adaptive shadow telemetry endpoints/UI visibility (`/bot/run-stats`).
- Improved universe auto-discovery defaults (adds JPY in discovery set, cross-quote liquidity normalization to home quote, broader diversified top list).
- Hardened transient exchange/network error handling (no auto-blacklist on timeouts/rate-limit/network noise).
- Fixed decision/order table column wrapping for desktop and mobile/foldable layouts.
- Completed deep reference mapping from `references/freqtrade-develop` into concrete tickets for protections, universe filter-chain, adaptive confidence shadowing, and offline calibration (`T-023`..`T-026`).
- Added protection manager v1 with risk-linked global/per-symbol locks (`COOLDOWN`, `STOPLOSS_GUARD`, `MAX_DRAWDOWN`, `LOW_PROFIT`) and dashboard visibility.

Execution governance update (Feb 11, 2026):

- Hard process rules are now documented in `docs/TEAM_OPERATING_RULES.md`.
- Active ticket state is tracked in `docs/DELIVERY_BOARD.md`.
- Every patch batch must be logged in `docs/PM_BA_CHANGELOG.md`.

## Phase 0 — Foundations (done)

- Monorepo + Docker compose (UI + API)
- Persisted config/state/logs (`./data` volume)
- HTTP Basic Auth for UI
- API key protection + UI server-side key injection
- Onboarding (Basic) + dashboard (status/decisions/orders) skeleton
- Settings UI (Basic/Advanced) + integration status endpoints
- Config export/import + advanced execution policy controls (risk-linked by default, manual override available)
- RSS aggregation endpoint with disk cache (not yet used for trading)

## Phase 0.5 — Reference review + POC selection (now)

- Review local reference projects under `references/`
- Extract reusable patterns (connectivity, market limits, risk controls) without copying GPL code
- Decide POC direction:
  - Node adapter layer + `ccxt` (recommended), or
  - Python sidecar engine + NestJS control plane
- Document findings: `docs/REFERENCES_ANALYSIS.md`

## Phase 1 — Binance connectivity (safe)

- Read-only mode first: balances, symbols, fees, order book snapshots
- Error mapping for common Binance failures (401/403/429/5xx)
- Market data caching + indicator computations (RSI/ADX/etc)

## Phase 2 — Strategy engine (paper trading)

- Strategy selection (Spot first), risk-policy mapping, position sizing
- Paper trading engine with fee modeling
- Order lifecycle, audit trail, replayable decisions (“why did it do this?”)

## Phase 3 — Live trading (opt-in)

- Explicit user acknowledgement + safety checks
- Limits (max daily loss, max order size, cooldowns, circuit breakers)
- Spot **testnet** live trading (minimal `MARKET` order path; mainnet blocked by default)
- Hardening updates:
  - Recoverable Binance sizing errors (`NOTIONAL`/lot-size) skip without auto-blacklist
  - Conversion top-up reserve hysteresis to reduce repetitive quote-asset churn
  - Derived risk limits enforced at runtime (`maxOpenPositions`, `maxPositionPct`)
  - Capital-tier runtime profile for sizing/reserve behavior (`MICRO`/`SMALL`/`STANDARD`)
  - Fee-aware entry gate (estimated edge vs round-trip execution cost)
  - Basic live exit path (`take-profit` / `stop-loss`) to avoid buy-only behavior
  - Baseline KPI collector + adaptive shadow telemetry persisted to `data/telemetry`
- Spot mainnet live trading (requires additional safeguards + explicit opt-in)

## Phase 4 — Advanced bots

- Grid / DCA / Rebalancing
- Futures (only if user requests and jurisdiction allows)

## Phase 5 — News + AI

- RSS ingestion + dedup + sentiment tagging (non-blocking)
- AI decision support (never blindly overrides risk policy)

## Phase 6 — Taxes

- Trade ledger exports
- Jurisdiction-specific reports (must be verified; no assumptions)
