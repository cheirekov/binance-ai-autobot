# Session Brief

Last updated: 2026-02-19 13:20 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `DAY (2-4h)`
- Active ticket: `T-005` (Daily guardrails + unwind-only behavior)
- Goal (single sentence): enforce a risk-linked daily-loss guard that halts new exposure while still allowing exits/sweeps.
- In scope:
  - compute rolling 24h realized PnL guard threshold from risk slider.
  - block new entry/grid placement when guard is active.
  - keep position-exit and wallet-sweep paths available before guard return.
  - add post-stop-loss symbol re-entry cooldown (risk-linked) to reduce churn.
- Out of scope:
  - full ledger/commission reconciliation (`T-007`),
  - regime strategy rewrite (`T-031/T-032`),
  - PnL reconciliation refactor (`T-007`).
- Hypothesis: most current losses are entry churn after stop-loss and weak trend continuation; daily guard + post-stop-loss cooldown reduces that bleed without freezing exits.
- Target KPI delta:
  - when rolling realized loss breaches guard, decisions show `Daily loss guard active` and no new entries are placed.
  - stop-loss -> immediate re-entry loops per symbol drop.
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
- Risk slider impact (`none` or explicit low/mid/high behavior):
  - max daily loss threshold scales from strict (low risk) to loose (high risk).
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
  - additional targeted command(s):
    - `pnpm -C apps/api test -- --passWithNoTests`
- Runtime validation plan:
  - run duration: `2-4 hours`
  - expected bundle name pattern: `autobot-feedback-YYYYMMDD-HHMMSS.tgz`

## 3) Deployment handoff

- Commit hash: `<set-after-commit>`
- Deploy target: remote Binance Spot testnet runtime
- Required config changes:
  - `tradeMode=SPOT_GRID`
  - `liveTrading=true`
  - testnet endpoint and keys configured
- Operator checklist:
  - reset state needed? (`optional` — recommended to reset `data/state.json` for clean overnight evidence)
  - keep config.json? (`yes`)
  - start command:
    - Compose v2: `docker compose up -d --build --force-recreate`
    - Compose v1: `docker-compose up -d --build --force-recreate`
  - collect bundle:
    - `./scripts/collect-feedback.sh` (auto-detects compose; override via `AUTOBOT_COMPOSE_CMD=docker-compose`)

## 4) End-of-batch result (fill after run)

- Observed KPI delta:
  - overnight bundle reviewed: `autobot-feedback-20260219-103043.tgz`
  - unmanaged exposure path is stable (`8.51%` vs cap `50%`), no dominant no-feasible recovery loop.
  - realized PnL remains negative (`-146.36 USDC`) with repeated trend-churn signatures (`stop-loss-exit` + re-entry on high-ATR symbols).
- Decision: `pivot`
- Next ticket candidate: `T-005` (daily guardrails + unwind-only behavior)
- Open risks:
  - strategy quality remains a separate lane (`T-031/T-032`); this batch only adds guardrails/churn control.
- Notes for next session:
  - bundle: `autobot-feedback-20260219-103043.tgz`
  - patch adds daily-loss guard + post-stop-loss entry cooldown.

## 5) Copy/paste prompt for next session

```text
Ticket: T-005
Batch: DAY (2-4h)
Goal: enforce daily-loss guardrails that stop new exposure while preserving exit paths.
In scope: rolling daily-loss guard check, guard skip telemetry, post-stop-loss symbol re-entry cooldown.
Out of scope: strategy rewrite, multi-quote routing, commission ledger refactor.
DoD:
- API: daily-loss guard computes and enforces risk-linked max daily loss.
- Runtime: guard blocks new entries and records clear skip details.
- Runtime: symbol post-stop-loss re-entry cooldown is observed.
- Risk slider mapping: max daily loss threshold widens at high risk and tightens at low risk.
- CI/test command: `docker compose -f docker-compose.ci.yml run --rm ci`.
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
