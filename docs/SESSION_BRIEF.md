# Session Brief

Last updated: 2026-02-15 12:25 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `DAY (2-4h)`
- Active ticket: `T-004` (Wallet policy v1: reserve + conversions)
- Goal (single sentence): prevent `SPOT_GRID` from getting stuck with near-zero home-stable liquidity by enforcing a reserve buffer, doing stable-like → home-stable top-ups when needed, and not blocking SELL legs when BUY is infeasible.
- In scope:
  - grid-mode quote reserve recovery via conversion router (stable-like → home stable),
  - grid BUY sizing uses `quoteSpendable` (keeps free reserve; avoids repeated minQty rejects),
  - when quote is exhausted, still allow grid SELL legs to place using base inventory (liquidity recovery),
  - testnet conversions remain usable even when EEA region policy is enabled (policy is mainnet-only for conversions).
- Out of scope:
  - adaptive policy promotion from shadow to execution,
  - full dust sweeping and idle inventory policy,
  - PnL reconciliation refactor (`T-007`).
- Hypothesis: keeping a risk-linked free-quote reserve, topping up from stable-like assets, and allowing SELL legs even when BUY is infeasible will reduce no-op loops and restore continuous trading on mixed wallets.
- Target KPI delta:
  - sizing reject pressure: reduce from `high` (>= 35%) to `<= 25%` in a 1–2h run.
  - fewer repeated `Grid buy sizing rejected (Below minQty ...)` skips when wallet has other stable-like assets available.
- Stop/rollback condition:
  - conversion churn/flood (repeated stable conversions without enabling trading), or
  - sizing reject pressure remains >= 35% after 60 minutes.

## 2) Definition of Done (must be concrete)

- API behavior:
  - In `SPOT_GRID`, when `quoteFree < reserveLowTarget` and the wallet holds stable-like assets, the bot performs a conversion top-up and resumes placing BUY ladder orders.
  - In `SPOT_GRID`, when `quoteSpendable` is ~0 but `baseFree > 0`, the bot can still place SELL LIMIT ladder orders (no early-return on BUY infeasibility).
- UI behavior:
  - Dashboard decisions show conversion-router trades with `stage=grid-reserve-recovery` when reserve recovery triggers.
- Runtime evidence in decisions/logs:
  - `Grid buy sizing rejected` details include `quoteSpendable` + `reserveLowTarget` for affordability debugging.
- Risk slider impact (`none` or explicit low/mid/high behavior):
  - Low risk: higher reserve targets (more conservative, fewer entries when quote is low).
  - High risk: lower reserve targets (more aggressive, more spendable quote).
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
  - additional targeted command(s):
    - `docker logs --tail 500 binance-ai-autobot_api_1` (confirm reserve recovery conversion behavior)
- Runtime validation plan:
  - run duration: `30-60 minutes` (plus quick restart/reset checks)
  - expected bundle name pattern: `autobot-feedback-YYYYMMDD-HHMMSS.tgz`

## 3) Deployment handoff

- Commit hash: `<set-after-commit>`
- Deploy target: remote Binance Spot testnet runtime
- Required config changes:
  - `tradeMode=SPOT_GRID`
  - `liveTrading=true`
  - testnet endpoint and keys configured
- Operator checklist:
  - reset state needed? (`no` for this active night run unless explicitly testing cold start)
  - keep config.json? (`yes`)
  - start command: `docker compose up -d --build --force-recreate`

## 4) End-of-batch result (fill after run)

- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=3, historyLimitOrders=0, activeMarketOrders=0)
  - market-only share reduced: `no` (historyMarketShare=100.0%)
  - sizing reject pressure: `low` (sizingRejectSkips=1, decisions=25, ratio=4.0%)
- Decision: `continue`
- Next ticket candidate: `T-007` (if lifecycle remains stable)
- Open risks:
  - none critical from automated checks.
- Notes for next session:
  - bundle: `autobot-feedback-20260215-121714.tgz`
  - auto-updated at: `2026-02-15T12:17:20.103Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-004
Batch: DAY (2-4h)
Goal: Prevent SPOT_GRID from getting stuck with near-zero USDC by enforcing reserve buffer + stable->home top-up.
In scope: grid reserve recovery conversion + quoteSpendable sizing + clear skip details.
Out of scope: adaptive policy promotion, full dust sweep, PnL refactor.
DoD:
- API: conversion-router trades occur when quote reserve is low (stage=grid-reserve-recovery).
- UI: decisions show reserve recovery conversions; grid buy reject details include quoteSpendable/reserveLowTarget.
- Risk slider mapping: low risk keeps higher reserve; high risk keeps lower reserve.
- CI/test command: `docker compose -f docker-compose.ci.yml run --rm ci`.
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
