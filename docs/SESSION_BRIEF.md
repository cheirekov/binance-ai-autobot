# Session Brief

Last updated: 2026-03-23 08:40 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-032` (Exit manager v2)
- Goal (single sentence): reduce profit giveback and improve downside control so wallet/equity stabilizes earlier under adverse conditions.
- In scope:
  - reduce profit giveback before `CAUTION` / `HALT` dominates the run.
  - de-risk earlier when the bot is near full allocation and regime deteriorates.
  - improve unwind / stable-coin reversion behavior without breaking current hard guards.
  - preserve `T-034` funding stability and keep `T-031` candidate-hygiene gains intact.
- Out of scope:
  - quote-routing redesign (`T-034` is closed unless runtime regresses),
  - candidate-hygiene-only optimization (`T-031` is frozen unless runtime regresses back there),
  - AI lane/promotion work (`T-025+`),
  - PnL schema/reporting rewrites (`T-007` is closed),
  - endpoint/auth/UI redesign.
- Hypothesis: the main program-level failure is late downside control, not only entry quality; reducing giveback and lowering adverse high-allocation persistence should improve wallet/equity behavior more than another short `T-031` slice.
- Target KPI delta:
  - reduce profit giveback / loss persistence in multi-hour runs.
  - reduce time spent near full allocation under adverse conditions.
  - keep `T-034` funding behavior stable (no return of dominant `Insufficient spendable <quote>` loops).
- Stop/rollback condition:
  - if `T-034` funding loops return as dominant behavior, or unwind logic causes uncontrolled churn.

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

- Commit hash: `5a32b41`
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
  - run duration (hours): `809.651`
  - run end: `Mon Mar 23 2026 09:43:21 GMT+0200 (Eastern European Standard Time)`
  - declared cycle: `MORNING_REVIEW`
  - cycle source: `auto-inferred`
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=1, historyLimitOrders=119, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=40.5%)
  - sizing reject pressure: `medium` (sizingRejectSkips=36, decisions=200, ratio=18.0%)
- Decision: `pivot`
- Next ticket candidate: `T-032` (active lane switched after program-level retro)
- Open risks:
  - wallet/equity remains materially below expected levels despite local bundle improvement.
- Notes for next session:
  - bundle: `autobot-feedback-20260323-074326.tgz`
  - auto-updated at: `2026-03-23T07:48:11.524Z`
  - PM/BA decision: freeze `T-031`, activate `T-032`, use `docs/PROGRAM_RETRO_2026-03-23.md` as the rationale.
  - latest code slice: `CAUTION + PROFIT_GIVEBACK` can now trigger a lighter best-effort unwind before `HALT`, with symbol-local order cancellation before unwind sells.

## 5) Copy/paste prompt for next session

```text
Ticket: T-032
Batch: SHORT (1-3h)
Goal: reduce profit giveback and improve downside control while preserving T-034 funding stability.
In scope: exit-manager / de-risking behavior under adverse conditions.
Out of scope: quote-routing redesign, candidate-hygiene-only optimization, PnL schema changes, AI lane.
DoD:
- profit giveback and adverse high-allocation persistence fall.
- `Insufficient spendable <quote>` does not return as the dominant blocker.
- T-005/T-007/T-031/T-034 behavior remains stable.
- docker CI passes: `docker compose -f docker-compose.ci.yml run --rm ci`.
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
