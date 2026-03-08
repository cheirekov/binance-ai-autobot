# Session Brief

Last updated: 2026-03-08 12:45 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-032` (Exit manager v2)
- Goal (single sentence): improve HALT unwind behavior so concentrated losing exposure is reduced faster in bad-market windows.
- In scope:
  - rank HALT unwind candidates by concentration + loss severity and unwind higher-risk inventory first.
  - apply dynamic unwind fraction/cadence under HALT using risk-bounded policy.
  - keep existing daily-loss/Caution/Halt guard thresholds unchanged.
- Out of scope:
  - regime redesign (`T-031`),
  - AI lane/promotion work (`T-025+`),
  - PnL schema/reporting rewrites (`T-007` is closed),
  - multi-quote routing redesign (`T-034`),
  - endpoint/auth/UI redesign.
- Hypothesis: concentrated losers during HALT are not unwound fast enough; prioritizing them should reduce drawdown persistence and profit giveback.
- Target KPI delta:
  - reduce prolonged HALT periods with high concentration exposure.
  - increase HALT unwind effectiveness (larger reduction of highest-exposure losers per unwind cycle).
  - keep guard behavior stable (no threshold regressions).
- Stop/rollback condition:
  - if HALT/Caution transitions regress, or unwind loop causes min-order reject storms.

## 2) Definition of Done (must be concrete)

- API behavior:
  - HALT unwind picks concentrated losing inventory first, not only highest raw cost order.
  - unwind fraction/cooldown are dynamically adjusted but remain risk-bounded.
- Runtime evidence in decisions/logs:
  - `daily-loss-halt-unwind` decisions include priority/exposure/loss telemetry and show accelerated handling of top losers.
  - no guardrail regression from `T-005`.
- Risk slider impact:
  - risk still bounds baseline unwind policy; dynamic boosts must not bypass hard caps.
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
- Runtime validation plan:
  - run duration: `1-3 hours`
  - expected bundle name pattern: `autobot-feedback-YYYYMMDD-HHMMSS.tgz`

## 3) Deployment handoff

- Commit hash: `<set-after-commit>`
- Deploy target: remote Binance Spot testnet runtime
- Required config changes: none
- Operator checklist:
  - reset state needed? (`no`)
  - keep config.json? (`yes`)
  - start command:
    - Compose v2: `docker compose up -d --build --force-recreate`
    - Compose v1: `docker-compose up -d --build --force-recreate`
  - collect bundle:
    - `AUTOBOT_COMPOSE_CMD=docker-compose ./scripts/collect-feedback.sh`
    - cycle label is auto-inferred (manual override optional via `AUTOBOT_RUN_PHASE=...`)
  - local ingest:
    - preferred: `./scripts/pull-and-ingest-feedback.sh <remote-host> [remote-repo-dir]`
    - fallback: `./scripts/ingest-feedback.sh autobot-feedback-YYYYMMDD-HHMMSS.tgz`
  - canonical procedure reference:
    - `docs/RUN_LOGGING_P0.md`

## 4) End-of-batch result (fill after run)

- Run context:
  - window (local): `MORNING (collection) / MORNING (run end)`
  - timezone: `Europe/Sofia`
  - run duration (hours): `451.616`
  - run end: `Sun Mar 08 2026 11:41:18 GMT+0200 (Eastern European Standard Time)`
  - declared cycle: `MORNING_REVIEW`
  - cycle source: `auto-inferred`
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=0, historyLimitOrders=13, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=93.5%)
  - sizing reject pressure: `low` (sizingRejectSkips=6, decisions=200, ratio=3.0%)
- Decision: `continue`
- Next ticket candidate: `T-032` (continue active lane unless PM/BA reprioritizes)
- Open risks:
  - none critical from automated checks.
- Notes for next session:
  - bundle: `autobot-feedback-20260308-094123.tgz`
  - pivot: moved active lane from `T-034` to `T-032` based on prolonged HALT/profit-giveback behavior.
  - patch: HALT unwind now prioritizes concentrated losers with dynamic unwind fraction/cooldown.
  - auto-updated at: `2026-03-08T09:41:37.079Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-032
Batch: SHORT (1-3h)
Goal: improve HALT unwind adaptation by prioritizing concentrated losers and reducing giveback persistence.
In scope: unwind prioritization + dynamic unwind cadence/fraction + telemetry in decisions.
Out of scope: regime redesign, PnL schema changes, AI lane, multi-quote redesign.
DoD:
- HALT unwind decisions show concentrated loser prioritization.
- T-005/T-007 behavior remains stable.
- no new dominant min-order reject loop from unwind logic.
- docker CI passes: `docker compose -f docker-compose.ci.yml run --rm ci`.
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
