# Session Brief

Last updated: 2026-03-21 06:06 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-034` (Multi-quote execution policy v1)
- Goal (single sentence): stop quote-family funding churn by making multi-quote routing skip unfundable quote assets earlier and prefer actionable funded routes.
- In scope:
  - rank candidate routes by quote-asset funding feasibility before symbol scoring dominates.
  - suppress quote-asset families (`ETH`, `USDC`, etc.) when spendable quote is repeatedly insufficient and no actionable sell leg exists.
  - suppress quote-asset families from local repeat history even before the global buy-quote quarantine becomes active.
  - normalize reserve floors into quote-asset units so non-home quotes are not over-blocked by home-denominated thresholds.
  - gate feasible live-candidate routing on spendable quote after reserve, not raw free quote.
  - reject feasible candidates when spendable quote is still below the funding floor, not only when it is zero.
  - prefer funded routes over unfunded higher-score routes.
  - keep multi-quote candidates visible only when their quote asset can support minimum order sizing.
  - preserve existing T-005/T-007/T-032 guard behavior; no risk-guard regression.
- Out of scope:
  - exit-manager redesign (`T-032`),
  - regime redesign (`T-031`),
  - AI lane/promotion work (`T-025+`),
  - PnL schema/reporting rewrites (`T-007` is closed),
  - endpoint/auth/UI redesign.
- Hypothesis: repeated `Insufficient spendable <quote> for grid BUY` loops show the next blocker is quote-routing/funding policy, not more exit-manager micro-cleanup.
- Target KPI delta:
  - reduce repeated quote-family funding loops (`ETH`, `USDC`) across a single run.
  - reduce `No feasible candidates after sizing/cap filters` caused by unfunded quote routes.
  - keep guard behavior stable (no threshold regressions).
- Stop/rollback condition:
  - if actionable sell legs are accidentally suppressed, or daily-loss/Caution/Halt behavior regresses.

## 2) Definition of Done (must be concrete)

- API behavior:
  - multi-quote candidate selection de-prioritizes or suppresses quote assets with repeated funding failure before symbol-level loops dominate.
  - quote-family suppression no longer depends solely on a pre-existing global quarantine lock.
  - execution quote reserves are evaluated in the quote asset's units, not raw home-currency units.
  - feasible live-candidate routing now rejects candidates with zero spendable quote after reserve before they hit later execution skips.
  - feasible live-candidate routing also rejects candidates when spendable quote stays below the configured funding floor.
  - funded routes remain eligible even when other quote families are quarantined.
  - T-005/T-007/T-032 guard behavior remains unchanged.
- Runtime evidence in decisions/logs:
  - lower recurrence of `Insufficient spendable ETH for grid BUY` / `Insufficient spendable USDC for grid BUY` across multiple symbols in the same run.
  - lower recurrence of `No feasible candidates after sizing/cap filters` when quote funding is the true blocker.
  - no guardrail regression from `T-005` / `T-007` / `T-032`.
- Risk slider impact:
  - risk still bounds baseline unwind policy; dynamic boosts must not bypass hard caps.
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
- Runtime validation plan:
  - run duration: `1-3 hours`
  - expected bundle name pattern: `autobot-feedback-YYYYMMDD-HHMMSS.tgz`

## 3) Deployment handoff

- Commit hash: `c14d041`
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
  - run duration (hours): `760.017`
  - run end: `Sat Mar 21 2026 08:05:21 GMT+0200 (Eastern European Standard Time)`
  - declared cycle: `MORNING_REVIEW`
  - cycle source: `auto-inferred`
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=7, historyLimitOrders=173, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=14.8%)
  - sizing reject pressure: `medium` (sizingRejectSkips=20, decisions=200, ratio=10.0%)
- Decision: `continue`
- Next ticket candidate: `T-034` (continue active lane unless PM/BA reprioritizes)
- Open risks:
  - sizing reject pressure is medium (10.0%).
- Notes for next session:
  - bundle: `autobot-feedback-20260321-060548.tgz`
  - auto-updated at: `2026-03-21T06:06:22.800Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-034
Batch: SHORT (1-3h)
Goal: reduce quote-family funding churn and prefer actionable funded routes.
In scope: multi-quote funding feasibility + quote-family suppression + route preference.
Out of scope: exit-manager redesign, regime redesign, PnL schema changes, AI lane.
DoD:
- repeated `Insufficient spendable <quote> for grid BUY` loops fall for quote-starved families.
- funded routes remain eligible.
- T-005/T-007/T-032 behavior remains stable.
- docker CI passes: `docker compose -f docker-compose.ci.yml run --rm ci`.
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
