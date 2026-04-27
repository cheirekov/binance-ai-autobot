# PATCH_RESULT

Last updated: 2026-04-27 15:15 EEST
Owner: PM/BA + Codex

## Incident classification
- `P1 long no-action recovery-selection loop`

## Chosen action class
- `PATCH_NOW`

## Whether bot-engine changed
- `yes`

## Files changed
- `apps/api/src/modules/bot/bot-engine.service.ts`
- `apps/api/src/modules/bot/bot-engine.service.test.ts`
- `docs/PM_BA_CHANGELOG.md`
- `docs/TRIAGE_NOTE_2026-04-27_T031_NO_FEASIBLE_RECOVERY_RESELECTS_DUST.md`
- `docs/SESSION_BRIEF.md`
- `docs/DELIVERY_BOARD.md`
- `docs/STRATEGY_COVERAGE.md`
- `docs/easy_process/ACTIVE_TICKET.md`
- `docs/easy_process/LATEST_BATCH_DECISION.md`
- `docs/easy_process/NEXT_BATCH_PLAN.md`
- `docs/easy_process/PATCH_RESULT.md`

## Exact behavior changed
- no-feasible recovery SELL selection now bypasses soft buy/quote/grid-wait symbol cooldowns that are not hard risk locks.
- no-feasible recovery SELL candidates now rank home-stable managed positions before non-home quote-pressure positions.
- no-feasible recovery candidates that fail market-sell minimum validation now receive a bounded symbol-level `NO_FEASIBLE_RECOVERY_MIN_ORDER` cooldown.

## Why this is the minimum viable patch
- it targets the active April 27 blocker: `TRXBTC` recovery repeatedly failed on `Below minQty 1.00000000` while no orders/fills landed.
- it reuses the existing no-feasible liquidity recovery sell path instead of adding a new strategy lane.
- it does not change exposure caps, fee floors, daily-loss thresholds, or `T-032` downside-control policy.

## Hypothesis addressed
- the bot was not adapting because recovery excluded better managed positions through soft symbol locks before exchange validation, then repeatedly retried a below-minimum dust candidate.

## Tests added/updated
- added regression coverage that recovery SELL can bypass grid wait locks while `NO_FEASIBLE_RECOVERY_MIN_ORDER` still blocks dust retries.
- added regression coverage that home-stable managed positions are prioritized before pressure-quote positions.

## Validation run
- `./scripts/pmba-gate.sh start` ✅
- `docker compose -f docker-compose.ci.yml run --rm ci` ✅
- `./scripts/validate-active-ticket.sh` ✅
- `./scripts/pmba-gate.sh end` ✅
- `git diff --check` ✅

## Remaining risk
- if every home-stable managed position is genuinely below exchange minimums, the next bundle may still show no trade; the difference should be explicit parking of each failed recovery candidate instead of retrying the same one.

## Rollback trigger
- this patch bypasses a hard/global risk lock, weakens downside-control behavior, or creates recovery sell churn.

## What the next bundle must confirm
- no repeated `TRXBTC` no-feasible recovery attempt on the same below-minimum dust balance.
- recovery attempts prefer home-stable managed positions when exchange filters allow them.
- repeated `Skip: No feasible candidates after policy/exposure filters` count drops or the remaining blocker becomes more specific than the current generic no-feasible loop.
