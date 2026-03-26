# PATCH_RESULT

Last updated: 2026-03-26 15:16 EET  
Owner: PM/BA + Codex

## Incident classification
- `P0 runtime-boxed / recovery-continuity incident`

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
- `docs/easy_process/PROGRAM_STATUS.md`
- `docs/easy_process/ACTIVE_TICKET.md`
- `docs/easy_process/RUN_CONTEXT.md`
- `docs/easy_process/VALIDATION_LEDGER.md`

## Exact behavior changed
- no-feasible recovery now recognizes both `sizing/cap filters` and `policy/exposure filters`
- no-feasible recovery now uses max spendable execution-quote liquidity after reserve, in home units, instead of raw `quoteFree`

## Why this is the minimum viable patch
- it only touches the active live blocker shown in `autobot-feedback-20260326-130152.tgz`
- it reuses the existing `no-feasible-liquidity-recovery` sell path instead of inventing a new behavior
- it does not widen into a new ticket or change hard risk policy

## Hypothesis addressed
- the latest live runtime remains boxed because the liquidity-recovery gate is disabled by reason drift and wrong quote-liquidity gating, not because the March 26 hotfix failed to deploy

## Tests added/updated
- added regression coverage for policy/exposure reason matching in `apps/api/src/modules/bot/bot-engine.service.test.ts`
- added regression coverage for spendable-liquidity gating in `apps/api/src/modules/bot/bot-engine.service.test.ts`
- updated `scripts/validate-active-ticket.sh` so targeted T-032 validation includes no-feasible recovery coverage

## Validation run
- `./scripts/validate-active-ticket.sh` ✅
- `docker compose -f docker-compose.ci.yml run --rm ci` ✅

## Remaining risk
- the runtime still may only advance after restart if another sell-side reachability bug exists
- the cumulative top-skip table may keep advertising the old Mar 23 guard-pause counts until new activity pushes them out

## Rollback trigger
- this patch introduces a fresh regression, funding churn, or validation failure

## What the next bundle must confirm
- recent decisions keep advancing after recreate
- `noFeasibleRecovery.enabled=true` or `no-feasible-liquidity-recovery` appears when quote remains starved
- no dominant quote-funding regression returns
