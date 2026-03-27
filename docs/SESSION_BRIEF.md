# Session Brief

Last updated: 2026-03-27 16:03 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-032` (Exit manager v2)
- Goal (single sentence): stop `DEFENSIVE` order maintenance from canceling resting BUY ladder orders unless the symbol is actually under a buy pause, while preserving existing caution/grid-guard protections and prior `T-032` fixes.
- In scope:
  - gate defensive bot-owned BUY-limit cancellation behind an active buy pause.
  - preserve resting BUY ladder orders in `DEFENSIVE` when regime is `NEUTRAL`/`RANGE` and buys are allowed.
  - keep the prior profit-giveback caution-release behavior intact.
  - keep the prior no-feasible recovery patch intact and observable.
  - preserve `T-034` funding stability and all closed guardrail tickets.
- Out of scope:
  - quote-routing redesign (`T-034` is closed unless runtime regresses),
  - candidate-hygiene-only optimization (`T-031` is frozen unless runtime regresses back there),
  - AI lane/promotion work (`T-025+`),
  - PnL schema/reporting rewrites (`T-007` is closed),
  - endpoint/auth/UI redesign.
- Hypothesis: the newest fresh bundle still trips the aggregate loop-persistence gate, but the raw decision stream shows a narrower same-ticket defect: in `DEFENSIVE`, the engine is canceling bot-owned BUY LIMIT orders even while regime is only `NEUTRAL` and buys are not paused. Restricting that cancel path to true buy-pause states should remove the cancel/recreate churn without reopening earlier caution/funding failures.
- Target KPI delta:
  - remove alternating `BUY LIMIT ... grid-ladder-buy` / `Canceled 1 bot open order(s): defensive-bear-cancel-buy` churn when buys are allowed.
  - keep explicit caution/grid-guard BUY pause evidence when the symbol really is paused.
  - keep `T-034` funding behavior stable and preserve the working no-feasible recovery path.
- Stop/rollback condition:
  - if `T-034` funding loops return, the no-feasible recovery path regresses, or the next bundle still shows the same defensive cancel/recreate churn.

## 2) Definition of Done (must be concrete)

- API behavior:
  - defensive bot-owned BUY-limit cleanup only runs when buys are actually paused by caution or grid/bear guard.
  - `DEFENSIVE` + `NEUTRAL`/`RANGE` can keep resting BUY ladder orders when buys are allowed.
  - symbol-level bear-trend/grid-guard BUY pauses still work on the risky managed symbol itself.
  - `T-034` funding/routing behavior remains unchanged.
  - `T-005` / `T-007` guard behavior remains unchanged.
- Runtime evidence in decisions/logs:
  - no repeated alternation between `grid-ladder-buy` and `defensive-buy-pause-cancel-buy` / legacy `defensive-bear-cancel-buy` when regime is `NEUTRAL` and buys are allowed.
  - if `BTCUSDC` or `ETHUSDC` remains under an actual buy pause, the bundle shows explicit caution/grid-guard evidence instead of blind defensive cancels.
  - no return of dominant `Insufficient spendable <quote>` loops.
  - no regression of `no-feasible-liquidity-recovery`.
- Risk slider impact:
  - risk still bounds the caution threshold and must not bypass hard caps.
- Validation commands:
  - `./node_modules/.bin/vitest run --no-cache src/modules/bot/bot-engine.service.test.ts`
  - `./scripts/validate-active-ticket.sh`
- Runtime validation plan:
  - run duration: `1-3 hours`
  - expected bundle name pattern: `autobot-feedback-YYYYMMDD-HHMMSS.tgz`

## 3) Deployment handoff

- Commit hash: `9e58796` (current local HEAD; latest ingested runtime bundle still reports deployed `aaf532b`)
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
  - bundle interval (hours): `3.296`
  - runtime uptime (hours): `913.818`
  - run end: `Fri Mar 27 2026 17:53:24 GMT+0200 (Eastern European Standard Time)`
  - declared cycle: `DAY_RUN`
  - cycle source: `auto-inferred`
- Definition of Done status:
  - fresh runtime evidence: `met` (class=fresh, staleStreak=0)
  - same-ticket root cause isolated: `met` (manual raw bundle review found defensive BUY-limit cancel/recreate churn)
  - active ticket runtime signal: `observed` (aggregate skips still show `daily loss caution paused new symbols`, while raw decisions alternate `grid-ladder-buy` with `defensive-bear-cancel-buy` on `BTCUSDC`/`ETHUSDC`)
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=3, historyLimitOrders=175, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=36.4%)
  - defensive cancel churn observed: `yes` (orders.canceled=129, byDecisionKind.ENGINE=75)
  - sizing reject pressure: `low` (sizingRejectSkips=0, decisions=200, ratio=0.0%)
  - fresh runtime evidence: `yes` (class=fresh)
- Decision: `patch_same_ticket`
- Next ticket candidate: `T-032`
- Required action: `deploy same-ticket defensive cancel-churn fix before next long run`
- Open risks:
  - auto-retro still reports `pivot_required` from the repeated aggregate top-skip summary; the next fresh bundle must prove the runtime mix changed materially.
- Notes for next session:
  - bundle: `autobot-feedback-20260327-155408.tgz`
  - deployed bundle commit: `aaf532b`
  - raw runtime evidence showed repeated `defensive-bear-cancel-buy` against `BTCUSDC` / `ETHUSDC` while regime was only `NEUTRAL`.
  - auto-updated at: `2026-03-27T15:54:37.087Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-032
Decision: patch_same_ticket
Required action: deploy same-ticket defensive cancel-churn fix and inspect the next fresh bundle
Latest bundle: autobot-feedback-20260327-155408.tgz
Fresh runtime evidence: yes (fresh)
Goal: stop defensive BUY-limit cancel/recreate churn while preserving downside-control and T-034 funding stability.
In scope: exit-manager / defensive order-maintenance behavior under adverse conditions.
Out of scope: quote-routing redesign, candidate-hygiene-only optimization, PnL schema changes, AI lane.
Validation: docker compose -f docker-compose.ci.yml run --rm ci
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
