# Roadmap (proposed)

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
