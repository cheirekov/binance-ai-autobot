# Session Brief

Last updated: 2026-03-24 09:56 UTC
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
  - repeated defensive bear-trend loops on concentrated home-quote inventory can escalate from passive sell-only handling to a throttled partial unwind.
  - `T-034` funding/routing behavior remains unchanged.
  - `T-005` / `T-007` guard behavior remains unchanged.
- Runtime evidence in decisions/logs:
  - lower recurrence of `Grid guard paused BUY leg` and `Grid waiting for ladder slot or inventory` on the same high-allocation symbols.
  - presence of `grid-guard-defensive-unwind` only when repeated bear-guard evidence exists.
  - no return of dominant `Insufficient spendable <quote>` loops.
  - no guardrail regression from `T-005` / `T-007` / `T-034`.
- Risk slider impact:
  - risk still bounds unwind policy; dynamic boosts must not bypass hard caps.
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
- Runtime validation plan:
  - run duration: `1-3 hours`
  - expected bundle name pattern: `autobot-feedback-YYYYMMDD-HHMMSS.tgz`

## 3) Deployment handoff

- Commit hash: `cce2322`
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
  - bundle interval (hours): `0.622`
  - runtime uptime (hours): `835.858`
  - run end: `Tue Mar 24 2026 11:55:46 GMT+0200 (Eastern European Standard Time)`
  - declared cycle: `MORNING_REVIEW`
  - cycle source: `auto-inferred`
- Definition of Done status:
  - fresh runtime evidence: `not met` (class=stale, staleStreak=3)
  - funding regression absent: `not measured` (no dominant funding regression in latest top skips)
  - active ticket runtime signal: `not measured` (Skip BTCUSDC: Grid guard paused BUY leg (17))
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=1, historyLimitOrders=119, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=40.5%)
  - sizing reject pressure: `medium` (sizingRejectSkips=35, decisions=200, ratio=17.5%)
  - fresh runtime evidence: `no` (class=stale)
- Decision: `validation_required`
- Next ticket candidate: `PM/BA-VALIDATION` (stop live-wait loop and use deterministic validation)
- Required action: `switch to deterministic validation path before more live-wait bundles`
- Open risks:
  - sizing reject pressure is medium (17.5%).
  - latest bundle has no fresh runtime evidence (stale); do not patch from cumulative history alone.
- Notes for next session:
  - bundle: `autobot-feedback-20260324-095550.tgz`
  - auto-updated at: `2026-03-24T09:56:21.702Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-032
Decision: validation_required
Required action: switch to deterministic validation path before more live-wait bundles
Latest bundle: autobot-feedback-20260324-095550.tgz
Fresh runtime evidence: no (stale)
Do not patch from this bundle alone.
Use deterministic validation or wait for a fresh runtime-evidence bundle before changing runtime code.
Keep active ticket scope unchanged unless PM/BA explicitly pivots.
```
