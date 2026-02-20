# Session Brief

Last updated: 2026-02-20 08:10 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `DAY (1-3h)`
- Active ticket: `T-005` (Daily guardrails + unwind-only behavior)
- Goal (single sentence): enforce risk-linked daily-loss guardrails with visible runtime state and halt-only-new-exposure behavior.
- In scope:
  - compute rolling 24h realized PnL guard threshold from risk slider.
  - block new entry/grid placement when guard is active.
  - keep position-exit and wallet-sweep paths available before guard return.
  - add post-stop-loss symbol re-entry cooldown (risk-linked) to reduce churn.
  - persist canonical runtime risk state (`NORMAL/CAUTION/HALT`) into bot state and show it in UI.
- Out of scope:
  - full ledger/commission reconciliation (`T-007`),
  - regime strategy rewrite (`T-031/T-032`),
  - PnL reconciliation refactor (`T-007`).
- Hypothesis: most current losses are entry churn after stop-loss and weak trend continuation; daily guard + post-stop-loss cooldown reduces that bleed without freezing exits.
- Target KPI delta:
  - when rolling realized loss breaches guard, decisions show `Daily loss guard active` and no new entries are placed.
  - stop-loss -> immediate re-entry loops per symbol drop.
  - dashboard status shows runtime risk state + reason codes directly from engine state.
  - reduce repeated `Grid guard active (no inventory to sell)` skips for the same symbol.
- Stop/rollback condition:
  - if guard blocks all trading actions including exits/sweeps.

## 2) Definition of Done (must be concrete)

- API behavior:
  - Daily-loss guard computes rolling 24h realized loss vs risk-linked threshold.
  - When triggered, bot skips new exposure actions and records guard details in decision telemetry.
  - Entry guard applies additional post-stop-loss symbol cooldown.
- Runtime evidence in decisions/logs:
  - `Skip: Daily loss guard active (...)` appears with threshold details when tripped.
  - fewer same-symbol BUY entries immediately after `stop-loss-exit`.
  - `state.riskState` updates to `CAUTION/HALT` in runtime snapshots when guard thresholds are crossed.
- Risk slider impact (`none` or explicit low/mid/high behavior):
  - max daily loss threshold scales from strict (low risk) to loose (high risk).
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
- Runtime validation plan:
  - run duration: `1-3 hours`
  - expected bundle name pattern: `autobot-feedback-YYYYMMDD-HHMMSS.tgz`

## 3) Deployment handoff

- Commit hash: `<set-after-commit>`
- Deploy target: remote Binance Spot testnet runtime
- Required config changes:
  - `tradeMode=SPOT_GRID`
  - `liveTrading=true`
  - testnet endpoint and keys configured
- Operator checklist:
  - reset state needed? (`no` — keep rolling `data/state.json` so daily-loss guard windows remain valid)
  - keep config.json? (`yes`)
  - start command:
    - Compose v2: `docker compose up -d --build --force-recreate`
    - Compose v1: `docker-compose up -d --build --force-recreate`
  - collect bundle:
    - `./scripts/collect-feedback.sh` (auto-detects compose; override via `AUTOBOT_COMPOSE_CMD=docker-compose`)

## 4) End-of-batch result (fill after run)

- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=13, historyLimitOrders=68, activeMarketOrders=0)
  - realized PnL recovered positive: `+26.41 USDC`; open exposure cost: `3531.37 USDC`
  - risk state ended `NORMAL`; CAUTION brakes did not lock the engine into idle mode
  - dominant loop remains symbol-local: `ARBUSDC grid-guard/no-inventory` skip cluster
- Decision: `continue`
- Next ticket candidate: `T-005` (continue active lane unless PM/BA reprioritizes)
- Open risks:
  - repeated paused/no-inventory symbol rechecks still consume decision budget.
- Notes for next session:
  - bundle: `autobot-feedback-20260220-075341.tgz`
  - auto-updated at: `2026-02-20T08:10:00.000Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-005
Batch: DAY (1-3h)
Goal: verify guardrails stay effective while reducing repeated grid-guard/no-inventory symbol churn.
In scope: rolling daily-loss guard check, guard skip telemetry, post-stop-loss symbol re-entry cooldown, CAUTION entry pauses, no-inventory grid cooldown tuning.
Out of scope: strategy rewrite, multi-quote routing, commission ledger refactor.
DoD:
- API: daily-loss guard computes and enforces risk-linked max daily loss.
- Runtime: CAUTION state pauses new exposure (`new symbols paused`, `paused GRID BUY leg`, `paused MARKET entry`) and records clear skip details.
- Runtime: symbol post-stop-loss re-entry cooldown is observed.
- Runtime: repeated `Grid guard active (no inventory to sell)` for the same symbol drops versus prior run.
- Risk slider mapping: max daily loss threshold widens at high risk and tightens at low risk.
- CI/test command: `docker compose -f docker-compose.ci.yml run --rm ci`.
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
