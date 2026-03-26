# P0_INCIDENT_SUMMARY

Last updated: 2026-03-26 15:16 EET  
Owner: PM/BA + Codex

## Follow-up incident classification
- `P0 runtime-boxed / recovery-continuity incident`
- Runtime classification:
  - `strategy-idle / boxed-in`, not proven engine-dead
- State/process overlay:
  - `restart/recovery continuity issue`

## Current symptoms
- latest fresh bundle `autobot-feedback-20260326-130152.tgz` runs `git.commit=2914263`, so the previous hotfix did deploy
- cumulative top skips still show the old Mar 23 guard-pause pattern
- latest recent state decisions after restart are mostly `Skip: No feasible candidates after policy/exposure filters`
- latest no-feasible details still show `noFeasibleRecovery.enabled=false`
- no trade/order progression appears after the immediate restart burst

## Mandatory follow-up audit
1. What was the previous recovery action?
- March 26 `2914263` same-ticket `PATCH_NOW` on the March 25 guard-pause cooldown path.
- It followed an earlier `OPERATIONS_ADJUSTMENT` that repaired observability/process trust.

2. Did it touch the bot-engine path, state-recovery path, or only observability/reporting/docs?
- The March 26 intervention touched the bot-engine path.
- The earlier ops batch touched observability/process trust.

3. Why did the latest fresh bundle still show the same dominant loop?
- `observed`: the bundle top-skip table is cumulative from a run that still starts on `2026-02-17`.
- `observed`: the live hotfix deployed, but the actual recent decisions after restart are now `No feasible` / `No eligible` skips.
- `observed`: the live bundle still records `noFeasibleRecovery.enabled=false` while spendable quote after reserve is below the recovery threshold.
- `inferred`: the hotfix landed, but on the wrong live surface.

4. Is the current best explanation bad prior patch, patch on wrong surface, unresolved pre-existing engine defect, state/persistence issue, ticket-scope confusion, or a combination?
- `combination`
  - patch on wrong surface
  - unresolved pre-existing engine defect
  - restart/recovery continuity issue

## Code-surface discovery
- Previous bot-engine recovery surface:
  - March 25/26 guard-pause path around `GRID_GUARD_BUY_PAUSE`, cooldown persistence, and guard/wait handling
- Active live blocker:
  - `deriveNoFeasibleRecoveryPolicy(...)` only recognized `No feasible candidates after sizing/cap filters`
  - the main no-feasible recovery gate compared raw `quoteFree`, not spendable quote after reserve
- Decision history / runtime continuity surface:
  - `buildBaselineStats(...)` and persisted `startedAt` keep cumulative top-skip counts across a long-lived run
  - `onModuleInit()` writes `Recovered running bot state after process restart; resuming engine loop`
- Likely rollback surface:
  - narrow: `2914263 -> a2a9ad0`
  - deeper but weak: `a2a9ad0 -> cce2322`
- Likely patch surface:
  - `apps/api/src/modules/bot/bot-engine.service.ts`
  - `deriveNoFeasibleRecoveryPolicy(...)`
  - no-feasible recovery gate in the main tick flow
- Likely state/ops recovery surface:
  - clean recreate only
  - no reseed / cleanup beyond recreate is proven necessary
- Primary incident type:
  - `combination`, with the engine defect now primary

## Final batch decision
- `BATCH_ACTION_CLASS`: `PATCH_NOW`
- Ticket decision: `patch_same_ticket`
- Allowed work mode: `PATCH_ALLOWED`
- Rollback considered: `yes`
- Rollback chosen: `no`

## Executed action
- changed `apps/api/src/modules/bot/bot-engine.service.ts` so no-feasible recovery recognizes both `sizing/cap filters` and `policy/exposure filters`
- changed `apps/api/src/modules/bot/bot-engine.service.ts` so no-feasible recovery is gated on max spendable execution-quote liquidity after reserve, in home units
- added regression coverage in `apps/api/src/modules/bot/bot-engine.service.test.ts`
- widened `scripts/validate-active-ticket.sh` so targeted T-032 validation includes no-feasible recovery coverage

## Validation
- `./scripts/validate-active-ticket.sh` ✅
- `docker compose -f docker-compose.ci.yml run --rm ci` ✅

## What must happen next
- deploy this engine patch
- clean-recreate the runtime
- collect one short fresh bundle
- inspect recent decisions and `noFeasibleRecovery` details, not only the cumulative top-skip table
