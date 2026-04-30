# PATCH_RESULT

Last updated: 2026-04-30 11:45 EEST
Owner: PM/BA + Codex

## Incident classification
- `P1 long no-action dust sell-leg loop`

## Chosen action class
- `PATCH_NOW`

## Whether bot-engine changed
- `yes`

## Files changed
- `apps/api/src/modules/bot/bot-engine.service.ts`
- `apps/api/src/modules/bot/bot-engine.service.test.ts`
- `docs/PM_BA_CHANGELOG.md`
- `docs/TRIAGE_NOTE_2026-04-30_T031_GRID_SELL_LEG_DUST_BLOCKS_BUY.md`
- `docs/SESSION_BRIEF.md`
- `docs/DELIVERY_BOARD.md`
- `docs/STRATEGY_COVERAGE.md`
- `docs/easy_process/ACTIVE_TICKET.md`
- `docs/easy_process/LATEST_BATCH_DECISION.md`
- `docs/easy_process/NEXT_BATCH_PLAN.md`
- `docs/easy_process/PATCH_RESULT.md`

## Exact behavior changed
- home-quote dust is not counted as actionable grid inventory unless latest price value reaches the risk-linked countable-exposure floor.
- feasible-live routing skips buy-paused/grid-guarded symbols when live sell inventory is below actionable size.
- grid execution does not return on a dust/zero SELL leg when a BUY leg can still act or is already working.

## Why this is the minimum viable patch
- it targets the April 30 evidence directly: `NORMAL`, `activeOrders=0`, no new trades, and repeated `Grid sell leg not actionable yet` on dust/zero base balances.
- it does not change exposure caps, fee floors, daily-loss thresholds, quote routing, or `T-032` downside-control policy.

## Hypothesis addressed
- the bot was still not adapting because impossible SELL-leg checks preempted reachable BUY progression and stale/dust inventory was treated as actionable.

## Tests added/updated
- home-quote dust inventory is non-actionable until it reaches countable exposure.
- feasible-live candidate selection rotates from grid-guarded BTC dust to a reachable alternative.
- a dust/zero SELL leg does not block an actionable grid BUY leg.

## Validation run
- `pnpm -C apps/api test -- src/modules/bot/bot-engine.service.test.ts` unavailable locally (`pnpm` not installed).
- `docker compose -f docker-compose.ci.yml run --rm ci` ✅
- `./scripts/validate-active-ticket.sh` ✅
- `git diff --check` ✅
- `./scripts/pmba-gate.sh start` ✅
- `./scripts/pmba-gate.sh end` remains blocked by the already-ingested pre-patch bundle pair (`63 -> 86`); this is expected until the next fresh bundle validates the patch.

## Remaining risk
- the next bundle may expose a different first blocker after BUY progression becomes reachable, likely fee/edge or quote spendability.

## Rollback trigger
- the patch permits new BUY exposure under hard `CAUTION/HALT` constraints, bypasses hard/global risk locks, or suppresses reachable sell/unwind behavior.

## What the next bundle must confirm
- reduced `Skip BTCUSDC: Grid sell leg not actionable yet`.
- no repeated zero-base `PENGUUSDC` sell-leg churn.
- active grid orders appear if fee/edge and quote checks pass; otherwise the next blocker is specific and patchable.
