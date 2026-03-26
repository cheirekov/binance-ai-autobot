# PATCH_RESULT

Last updated: 2026-03-26 12:13 EET  
Owner: PM/BA + Codex

## Incident classification
- `P0 combined runtime-idle / process-confused incident`

## Chosen action class
- `PATCH_NOW`

## Whether bot-engine changed
- `yes`

## Files changed
- `apps/api/src/modules/bot/bot-engine.service.ts`
- `apps/api/src/modules/bot/bot-engine.service.test.ts`
- `scripts/validate-active-ticket.sh`
- `docs/easy_process/LATEST_BATCH_DECISION.md`
- `docs/easy_process/NEXT_BATCH_PLAN.md`
- `docs/easy_process/PM_TASK_SPLIT.md`
- `docs/easy_process/OPERATOR_NOTE.md`
- `docs/easy_process/PRODUCTION_DELTA_NOTE.md`
- `docs/easy_process/P0_INCIDENT_SUMMARY.md`
- `docs/easy_process/P0_ROOT_CAUSE_TREE.md`
- `docs/easy_process/P0_RECOVERY_PLAN.md`
- `docs/easy_process/PATCH_RESULT.md`

## Exact behavior changed
- legacy non-caution `GRID_GUARD_BUY_PAUSE` cooldown locks no longer act as hard symbol blocks
- non-caution guard-pause no-action ticks no longer terminate the tick before later waiting / no-inventory handling can run

## Why this is the minimum viable patch
- it only touches the March 25 regression surface
- it does not change `T-032` unwind thresholds or risk policy
- it does not widen into a new ticket

## Hypothesis addressed
- the March 25 guard-pause cooldown slice was helping box the runtime in by blocking or preempting the path that should eventually lead to meaningful progression

## Tests added/updated
- added symbol-lock regression coverage for legacy guard-pause cooldown semantics in `apps/api/src/modules/bot/bot-engine.service.test.ts`
- updated `scripts/validate-active-ticket.sh` so the targeted T-032 validator includes the new guard-pause coverage

## Validation run
- `./scripts/validate-active-ticket.sh`
- `docker compose -f docker-compose.ci.yml run --rm ci`

## Remaining risk
- the pre-March25 `T-032` runtime was already not fully healthy
- this hotfix removes a confirmed regression surface, but the next short bundle still has to prove meaningful runtime improvement

## Rollback trigger
- the next short fresh bundle still shows unchanged boxed-in guard/wait loop behavior with no meaningful decision-mix improvement

## What the next bundle must confirm
- the bot produces fresh runtime decisions after recreate
- the March 26 boxed-in pattern changes materially
- no dominant quote-funding regression returns
