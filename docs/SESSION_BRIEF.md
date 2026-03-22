# Session Brief

Last updated: 2026-03-22 16:00 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-031` (Regime engine v2)
- Goal (single sentence): reduce repeated non-actionable candidate loops by making regime/edge routing demote weak or structurally stalled opportunities earlier.
- In scope:
  - demote candidates whose current regime/edge state is repeatedly non-actionable (`fee/edge filter`, ladder-wait, paused buy legs).
  - reduce repeated cross-quote candidate churn where regime quality is weak even if quote routing is now valid.
  - keep candidate selection biased toward actionable symbols with realistic edge after fees.
  - preserve existing `T-034` quote-routing/funding behavior and all `T-005` / `T-007` / `T-032` guard behavior.
- Out of scope:
  - quote-routing redesign (`T-034` is closed unless runtime regresses),
  - exit-manager redesign (`T-032`),
  - AI lane/promotion work (`T-025+`),
  - PnL schema/reporting rewrites (`T-007` is closed),
  - endpoint/auth/UI redesign.
- Hypothesis: once quote starvation is no longer dominant, the next blocker is regime/edge quality — repeated `Fee/edge filter` and `Grid waiting for ladder slot or inventory` should be reduced at candidate-selection time.
- Target KPI delta:
  - reduce repeated `Fee/edge filter` loops on the same symbols across a single run.
  - reduce repeated `Grid waiting for ladder slot or inventory` loops on symbols with already parked ladders.
  - keep `T-034` funding behavior stable (no return of dominant `Insufficient spendable <quote>` loops).
- Stop/rollback condition:
  - if funded/actionable candidates are accidentally suppressed, or `T-034` funding loops return as dominant behavior.

## 2) Definition of Done (must be concrete)

- API behavior:
  - candidate selection demotes or suppresses symbols whose current regime/edge state is repeatedly non-actionable.
  - parked ladder symbols with no actionable missing leg are rotated out earlier.
  - fee/edge-reject loops are reduced without weakening the fee floor itself.
  - `T-034` funding/routing behavior remains unchanged.
  - `T-005` / `T-007` / `T-032` guard behavior remains unchanged.
- Runtime evidence in decisions/logs:
  - lower recurrence of `Fee/edge filter (...)` on the same symbols in the same run.
  - lower recurrence of `Grid waiting for ladder slot or inventory`.
  - no return of dominant `Insufficient spendable <quote>` loops.
  - no guardrail regression from `T-005` / `T-007` / `T-032` / `T-034`.
- Risk slider impact:
  - risk still bounds baseline unwind policy; dynamic boosts must not bypass hard caps.
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
- Runtime validation plan:
  - run duration: `1-3 hours`
  - expected bundle name pattern: `autobot-feedback-YYYYMMDD-HHMMSS.tgz`

## 3) Deployment handoff

- Commit hash: `ed527d5`
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
  - window (local): `DAY (collection) / DAY (run end)`
  - timezone: `Europe/Sofia`
  - run duration (hours): `793.852`
  - run end: `Sun Mar 22 2026 17:55:26 GMT+0200 (Eastern European Standard Time)`
  - declared cycle: `DAY_RUN`
  - cycle source: `auto-inferred`
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=0, historyLimitOrders=113, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=43.5%)
  - sizing reject pressure: `low` (sizingRejectSkips=6, decisions=200, ratio=3.0%)
- Decision: `continue`
- Next ticket candidate: `T-031` (continue active lane unless PM/BA reprioritizes)
- Open risks:
  - repeated fee-edge churn on sell-leg-only candidates can still dominate if the new suppression threshold is too weak.
- Notes for next session:
  - bundle: `autobot-feedback-20260322-155534.tgz`
  - auto-updated at: `2026-03-22T15:56:12.621Z`
  - latest code slice: repeated fee-edge rejects now also suppress sell-leg-only candidates after a stricter local threshold.

## 5) Copy/paste prompt for next session

```text
Ticket: T-031
Batch: SHORT (1-3h)
Goal: reduce repeated fee-edge / non-actionable candidate loops while preserving T-034 funding stability.
In scope: regime-side candidate quality + actionability gating.
Out of scope: quote-routing redesign, exit-manager redesign, PnL schema changes, AI lane.
DoD:
- repeated `Fee/edge filter` and `Grid waiting for ladder slot or inventory` loops fall.
- `Insufficient spendable <quote>` does not return as the dominant blocker.
- T-005/T-007/T-032/T-034 behavior remains stable.
- docker CI passes: `docker compose -f docker-compose.ci.yml run --rm ci`.
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
