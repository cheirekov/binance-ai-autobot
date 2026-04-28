# PATCH_RESULT

Last updated: 2026-04-28 13:50 EEST
Owner: PM/BA + Codex

## Incident classification
- `P1 long no-action dust-storm lock loop`

## Chosen action class
- `PATCH_NOW`

## Whether bot-engine changed
- `yes`

## Files changed
- `apps/api/src/modules/bot/bot-engine.service.ts`
- `apps/api/src/modules/bot/bot-engine.service.test.ts`
- `docs/PM_BA_CHANGELOG.md`
- `docs/TRIAGE_NOTE_2026-04-28_T031_DUST_STORM_LOCKS_BLOCK_HOME_QUOTE_ACTION.md`
- `docs/SESSION_BRIEF.md`
- `docs/DELIVERY_BOARD.md`
- `docs/STRATEGY_COVERAGE.md`
- `docs/easy_process/ACTIVE_TICKET.md`
- `docs/easy_process/LATEST_BATCH_DECISION.md`
- `docs/easy_process/NEXT_BATCH_PLAN.md`
- `docs/easy_process/PATCH_RESULT.md`

## Exact behavior changed
- `GRID_SELL_NOT_ACTIONABLE` storm locks no longer block dust-sized home-quote candidates in `NORMAL` mode when there are no active orders.
- the same storm locks still block outside that bounded case, including `CAUTION`.
- `NO_FEASIBLE_RECOVERY_MIN_ORDER` parking now lasts `12h` at risk `0` and `6h` at risk `100`.

## Why this is the minimum viable patch
- it targets the April 28 evidence: large spendable `USDC`, no active orders, `NORMAL` risk state, but stale home-quote sell-storm locks and below-minimum recovery dust kept the bot inactive.
- it does not change exposure caps, fee floors, daily-loss thresholds, quote routing, or `T-032` downside-control policy.

## Hypothesis addressed
- the bot was still not adapting because stale dust sell-storm locks were treated like live actionable inventory blockers, and recovery dust was retried too frequently.

## Tests added/updated
- updated storm-lock regression coverage to allow normal-mode dust home-quote candidates and keep the same storm lock blocking in `CAUTION`.
- added regression coverage for multi-hour recovery min-order dust parking.

## Validation run
- `./scripts/pmba-gate.sh start` ✅
- `docker compose -f docker-compose.ci.yml run --rm ci` ✅
- `./scripts/validate-active-ticket.sh` ✅
- `git diff --check` ✅
- `./scripts/pmba-gate.sh end` remains blocked by the already-ingested pre-patch fresh bundle pair (`70 -> 59`); this is expected until the next fresh bundle validates the patch.

## Remaining risk
- if home-quote candidates progress beyond the stale lock but fail a later policy/edge filter, the next bundle should expose that blocker more specifically.

## Rollback trigger
- the patch permits dust-storm bypass outside `NORMAL`, bypasses hard/global risk locks, or creates excessive new buy exposure.

## What the next bundle must confirm
- reduced `Skip: No feasible candidates after policy/exposure filters`.
- no repeated `TRXBTC` minQty recovery retries on a 20-minute cadence.
- at least one home-quote candidate progresses beyond stale `GRID_SELL_NOT_ACTIONABLE` storm locks while risk remains `NORMAL`.
