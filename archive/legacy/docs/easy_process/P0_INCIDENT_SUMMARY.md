# P0_INCIDENT_SUMMARY

Last updated: 2026-03-26 18:47 EET  
Owner: PM/BA + Codex

## Follow-up incident classification
- `P0 runtime-boxed / incomplete no-feasible recovery incident`
- Runtime classification:
  - `strategy-idle / boxed-in`, not proven engine-dead
- State/process overlay:
  - `restart/recovery cadence issue`, but not the primary blocker

## Current symptoms
- latest fresh bundle `autobot-feedback-20260326-164157.tgz` runs `git.commit=3a6a14f`, so the previous no-feasible patch did deploy
- cumulative top skips still show the old Mar 23 guard-pause pattern
- latest recent state decisions are still mostly `Skip: No feasible candidates after policy/exposure filters` with restart markers in between
- latest no-feasible details still show `noFeasibleRecovery.enabled=false`, `recentCount=1`, `threshold=2`, `quoteLiquidityThreshold=1`, and `maxExecutionQuoteSpendableHome=2.841632`
- no recovery trade appears despite persistent reserve-starvation evidence

## Mandatory follow-up audit
1. What was the previous recovery action?
- March 26 `3a6a14f` same-ticket `PATCH_NOW` on the no-feasible liquidity-recovery path.
- It followed an earlier March 26 `OPERATIONS_ADJUSTMENT` that repaired observability/process trust.

2. Did it touch the bot-engine path, state-recovery path, or only observability/reporting/docs?
- The immediate previous intervention touched the bot-engine path.
- The earlier ops batch touched observability/process trust.

3. Why did the latest fresh bundle still show the same dominant loop?
- `observed`: the bundle top-skip table is cumulative from a run that still starts on `2026-02-17`.
- `observed`: the current bundle proves the no-feasible patch deployed, but the recent decisions still remain `No feasible` / `No eligible`.
- `observed`: the patched runtime still records `noFeasibleRecovery.enabled=false` because the repeat-count window stayed too tight and the liquidity threshold stayed below the live funding floor.
- `inferred`: the previous patch improved the right subsystem, but it was incomplete.

4. Is the current best explanation bad prior patch, patch on wrong surface, unresolved pre-existing engine defect, state/persistence issue, ticket-scope confusion, or a combination?
- `combination`
  - incomplete prior patch on the correct surface
  - unresolved same-surface engine defect
  - restart/recovery cadence issue as an amplifier

## Code-surface discovery
- Previous bot-engine recovery surface:
  - March 26 no-feasible reason matching and spendable-quote gating
- Active live blocker:
  - `deriveNoFeasibleRecoveryPolicy(...)` still required a 10-minute no-feasible cluster
  - `shouldAttemptNoFeasibleRecovery(...)` still used a `1` home-unit threshold instead of the candidate funding floor
- Decision history / runtime continuity surface:
  - `buildBaselineStats(...)` and persisted `startedAt` keep cumulative top-skip counts across a long-lived run
  - `onModuleInit()` writes `Recovered running bot state after process restart; resuming engine loop`
- Likely rollback surface:
  - only the new threshold/window amendment if it over-fires after deployment
  - broad rollback before `3a6a14f` is not preferred
- Likely patch surface:
  - `apps/api/src/modules/bot/bot-engine.service.ts`
  - `deriveNoFeasibleRecoveryPolicy(...)`
  - `deriveMinQuoteLiquidityHome(...)`
  - `shouldAttemptNoFeasibleRecovery(...)`
- Likely state/ops recovery surface:
  - clean recreate only
  - no reseed / cleanup beyond recreate is proven necessary
- Primary incident type:
  - `engine defect`, with restart/recovery cadence as a secondary overlay

## Final batch decision
- `BATCH_ACTION_CLASS`: `PATCH_NOW`
- Ticket decision: `patch_same_ticket`
- Allowed work mode: `PATCH_ALLOWED`
- Rollback considered: `yes`
- Rollback chosen: `no`

## Executed action
- changed [apps/api/src/modules/bot/bot-engine.service.ts](/home/yc/work/binance-ai-autobot/apps/api/src/modules/bot/bot-engine.service.ts) so no-feasible recovery uses the same minimum quote-liquidity floor as candidate feasibility
- changed [apps/api/src/modules/bot/bot-engine.service.ts](/home/yc/work/binance-ai-autobot/apps/api/src/modules/bot/bot-engine.service.ts) so repeated no-feasible skips can accumulate across the real live starvation cadence, resetting after trades
- added regression coverage in [apps/api/src/modules/bot/bot-engine.service.test.ts](/home/yc/work/binance-ai-autobot/apps/api/src/modules/bot/bot-engine.service.test.ts)

## Validation
- `./scripts/validate-active-ticket.sh` ✅
- `docker compose -f docker-compose.ci.yml run --rm ci` ✅

## What must happen next
- deploy this engine patch
- clean-recreate the runtime
- collect one short fresh bundle
- inspect recent decisions and `noFeasibleRecovery` details, not only the cumulative top-skip table
