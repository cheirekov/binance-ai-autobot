# LATEST_BATCH_DECISION

Last updated: 2026-03-26 15:16 EET  
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Lane A — Runtime stability`
- Evidence tags:
  - `observed`: latest fresh bundle `autobot-feedback-20260326-130152.tgz` runs `git.commit=2914263`
  - `observed`: cumulative top skips still show `Skip BTCUSDC: Grid guard paused BUY leg (17)` and `Grid waiting for ladder slot or inventory (16)`
  - `observed`: latest recent state decisions after restart are mostly `Skip: No feasible candidates after policy/exposure filters`
  - `observed`: latest no-feasible skip details still show `noFeasibleRecovery.enabled=false` while spendable USDC after reserve is only `0.97400227`
  - `inferred`: the March 26 guard-pause hotfix deployed, but it did not touch the active live blocker

## Chosen active ticket
- Current: `T-032` (Exit manager v2)
- Decision: `patch_same_ticket`
- Why:
  - `observed`: the current failure is still an exit/liquidity-recovery failure inside `T-032`
  - `observed`: pre-patch `cce2322` already showed the same boxed-in runtime
  - `inferred`: `ROLLBACK_NOW` is weaker than a bounded patch on the actual live surface

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260326-130152.tgz`
- Compared bundle: `autobot-feedback-20260326-090817.tgz`

## Allowed work mode
- `PATCH_ALLOWED`

## Batch decision
- `BATCH_ACTION_CLASS`: `PATCH_NOW`
- Incident classification: `P0 runtime-boxed / recovery-continuity incident`
- Primary incident type:
  - unresolved pre-existing engine defect on the no-feasible recovery path
  - restart/recovery continuity confusion
- Previous recovery action:
  - `2026-03-26` same-ticket bot-engine hotfix `2914263` on the March 25 guard-pause path
  - preceded by an earlier observability/process `OPERATIONS_ADJUSTMENT`
- Why the previous intervention did not restore runtime behavior:
  - it touched bot-engine, but on the wrong surface
  - the latest deployed bundle still had `noFeasibleRecovery.enabled=false`
  - the recovery policy still matched only `sizing/cap filters` while live skips now say `policy/exposure filters`
  - the recovery gate still used raw `quoteFree`, not spendable quote after reserve
- Likely rollback surface:
  - narrow: `2914263 -> a2a9ad0`
  - deeper but weak: `a2a9ad0 -> cce2322`
- Likely patch surface:
  - `apps/api/src/modules/bot/bot-engine.service.ts`
  - `deriveNoFeasibleRecoveryPolicy(...)`
  - the no-feasible recovery gate in the main tick flow
- Likely state/ops recovery surface:
  - clean recreate only
  - no reseed / wipe is proven necessary
- Validation:
  - `./scripts/validate-active-ticket.sh` ✅
  - `docker compose -f docker-compose.ci.yml run --rm ci` ✅
