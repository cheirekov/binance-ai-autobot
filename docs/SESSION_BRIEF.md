# Session Brief

Last updated: 2026-03-05 15:55 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-034` (Multi-quote execution policy v1)
- Goal (single sentence): add controlled non-home quote routing so the bot can take actionable cross-quote opportunities without violating guardrails.
- In scope:
  - define a strict allowlist policy for quote assets eligible for execution beyond home stable quote.
  - add candidate/feasibility routing logic from home-quote fallback to approved cross-quote symbols.
  - keep region policy, min-order validation, exposure caps, and cooldown guards unchanged.
- Out of scope:
  - regime/exit redesign (`T-031`, `T-032`),
  - AI lane/promotion work (`T-025+`),
  - PnL schema/reporting rewrites (`T-007` is closed),
  - endpoint/auth/UI redesign.
- Hypothesis: limiting live execution to home-stable quote leaves actionable opportunities unused; controlled cross-quote routing will improve opportunity coverage while preserving risk controls.
- Target KPI delta:
  - increase feasible candidate diversity (more than one quote family in executed or shortlisted symbols).
  - keep sizing reject pressure in low/medium band (no reversion to prior high storm behavior).
  - keep LIMIT lifecycle active and guard behavior stable.
- Stop/rollback condition:
  - if CAUTION/HALT behavior regresses, or cross-quote introduces repeated infeasible loops.

## 2) Definition of Done (must be concrete)

- API behavior:
  - eligible execution quotes are governed by explicit policy, not ad hoc symbol hardcoding.
  - live candidate selection can route to approved cross-quote symbols when feasible.
- Runtime evidence in decisions/logs:
  - cross-quote attempts appear with explainable reasons and remain bounded by current risk/exposure rules.
  - no guardrail regression from `T-005`.
- Risk slider impact:
  - high risk can widen cross-quote participation limits; low risk stays stricter.
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
- Runtime validation plan:
  - run duration: `1-3 hours`
  - expected bundle name pattern: `autobot-feedback-YYYYMMDD-HHMMSS.tgz`

## 3) Deployment handoff

- Commit hash: `ac3d1db`
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
  - run duration (hours): `385.641`
  - run end: `Thu Mar 05 2026 17:42:45 GMT+0200 (Eastern European Standard Time)`
  - declared cycle: `DAY_RUN`
  - cycle source: `auto-inferred`
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=0, historyLimitOrders=34, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=83.3%)
  - sizing reject pressure: `low` (sizingRejectSkips=5, decisions=200, ratio=2.5%)
- Decision: `continue`
- Next ticket candidate: `T-034` (continue active lane unless PM/BA reprioritizes)
- Open risks:
  - quote-shortfall loop (`DOGEBTC insufficient spendable BTC`) triaged; queued mitigation if still dominant after current patch.
  - verify lock-state consistency patch: UI must not show `Risk: NORMAL` while global `STOPLOSS_GUARD` is active.
- Notes for next session:
  - bundle: `autobot-feedback-20260305-154249.tgz`
  - deploy note: global lock path now writes runtime `riskState` (`HALT` for stoploss/max-drawdown global locks) before skip return.
  - auto-updated at: `2026-03-05T15:55:00.000Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-034
Batch: SHORT (1-3h)
Goal: implement controlled multi-quote routing in SPOT_GRID without breaking existing guardrails.
In scope: policy-driven quote allowlist + candidate routing + explainable decision reasons.
Out of scope: regime/exit redesign, PnL schema changes, AI lane.
DoD:
- cross-quote candidates are visible/attempted under policy control.
- T-005/T-007 behavior remains stable.
- no dominant infeasible loop introduced by cross-quote routing.
- docker CI passes: `docker compose -f docker-compose.ci.yml run --rm ci`.
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
