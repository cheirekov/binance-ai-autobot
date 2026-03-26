# PATCH_RESULT

Last updated: 2026-03-26 18:47 EET  
Owner: PM/BA + Codex

## Incident classification
- `P0 runtime-boxed / incomplete no-feasible recovery incident`

## Chosen action class
- `PATCH_NOW`

## Whether bot-engine changed
- `yes`

## Files changed
- `apps/api/src/modules/bot/bot-engine.service.ts`
- `apps/api/src/modules/bot/bot-engine.service.test.ts`
- `docs/PM_BA_CHANGELOG.md`
- `docs/TRIAGE_NOTE_2026-03-26_T032_NO_FEASIBLE_RECOVERY_THRESHOLD_MISMATCH.md`
- `docs/easy_process/LATEST_BATCH_DECISION.md`
- `docs/easy_process/NEXT_BATCH_PLAN.md`
- `docs/easy_process/PM_TASK_SPLIT.md`
- `docs/easy_process/OPERATOR_NOTE.md`
- `docs/easy_process/PRODUCTION_DELTA_NOTE.md`
- `docs/easy_process/P0_INCIDENT_SUMMARY.md`
- `docs/easy_process/P0_ROOT_CAUSE_TREE.md`
- `docs/easy_process/P0_RECOVERY_PLAN.md`
- `docs/easy_process/PATCH_RESULT.md`
- `docs/easy_process/PROGRAM_STATUS.md`
- `docs/easy_process/ACTIVE_TICKET.md`
- `docs/easy_process/RUN_CONTEXT.md`
- `docs/easy_process/VALIDATION_LEDGER.md`
- `docs/easy_process/DECISION_LEDGER.md`

## Exact behavior changed
- no-feasible recovery now uses the same minimum quote-liquidity floor as candidate feasibility instead of a separate `1` home-unit threshold
- no-feasible recovery now counts repeated starvation across the live production cadence, resetting after trades, instead of requiring a tight 10-minute skip cluster

## Why this is the minimum viable patch
- it only touches the active live blocker shown in `autobot-feedback-20260326-164157.tgz`
- it reuses the existing `no-feasible-liquidity-recovery` sell path instead of inventing a new behavior
- it does not widen into a new ticket or change hard risk policy

## Hypothesis addressed
- the latest live runtime remains boxed because the previous no-feasible patch was incomplete: its repeat window and quote-liquidity threshold still prevented recovery activation even on the deployed fixed-matcher path

## Tests added/updated
- added regression coverage for spaced policy/exposure starvation skips in `apps/api/src/modules/bot/bot-engine.service.test.ts`
- added regression coverage that a normal intervening trade resets starvation accumulation in `apps/api/src/modules/bot/bot-engine.service.test.ts`
- updated no-feasible liquidity-threshold coverage in `apps/api/src/modules/bot/bot-engine.service.test.ts`

## Validation run
- `./scripts/validate-active-ticket.sh` ✅
- `docker compose -f docker-compose.ci.yml run --rm ci` ✅

## Remaining risk
- the runtime still may only advance after restart if another sell-side execution reachability bug exists after recovery becomes eligible
- the cumulative top-skip table may keep advertising the old Mar 23 guard-pause counts until new activity pushes them out

## Rollback trigger
- this patch introduces a fresh regression, unnecessary recovery churn, or validation failure

## What the next bundle must confirm
- recent decisions keep advancing after recreate
- `noFeasibleRecovery.enabled=true` or `no-feasible-liquidity-recovery` appears when quote remains starved
- the new trigger math does not over-fire into churn
