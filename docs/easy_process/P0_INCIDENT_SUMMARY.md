# P0_INCIDENT_SUMMARY

Last updated: 2026-03-26 12:13 EET  
Owner: PM/BA + Codex

## Incident classification
- `P0 combined runtime-idle / process-confused incident`
- Runtime classification:
  - `strategy-idle / boxed-in`, not proven engine-dead
- Operator-surface classification:
  - `process-confused`

## Current symptoms
- the bot appears effectively inert from the operator side
- there are almost no meaningful new decisions
- the latest fresh bundle after the March 25 patch still showed the same dominant guard-pause loop
- the latest P0 batch before this one repaired UI/reporting credibility but did not restore bot-engine behavior

## Engine-first audit
1. What was the last commit that changed `apps/api/src/modules/bot/bot-engine.service.ts`?
- `11cadf29d7b3c8d564a5ee5cab4ab4e1b33fbf50`
- merged into `main` as `a2a9ad01cd87642c4c2c69eab7e73529ec183399`

2. What was the ticket intent of that change?
- same-ticket `T-032` mitigation:
  - make repeated `Grid guard paused BUY leg` skips storm-eligible
  - persist cooldown-driven rotation away from the dead-end symbol

3. Did engine behavior likely regress after that change?
- `yes`
- observed/inferred reason:
  - the non-caution guard-pause branch started writing a generic symbol `COOLDOWN`
  - that state could become the terminal no-action result before the later `Grid waiting for ladder slot or inventory` / no-inventory path ran
  - the same generic `COOLDOWN` also acted as a hard symbol block through `isSymbolBlocked(...)`

4. Is rollback to the prior engine state safer than another forward patch?
- `no`
- reason:
  - the fresh March 25 bundle that triggered the patch already showed the same dominant loop on the pre-patch engine
  - full rollback to `cce2322` would restore an already unresolved runtime, not a known-good one

5. If not rollback, what is the smallest safe engine patch?
- treat legacy non-caution `GRID_GUARD_BUY_PAUSE` cooldown locks as non-blocking
- stop terminally persisting non-caution guard-pause cooldown as the final no-action state
- keep the rest of `T-032` unwind logic unchanged

## Root-cause assessment
- `observed`: `T-031 -> T-032` switch was justified; candidate hygiene had improved but downside control had not
- `observed`: the latest fresh bundle on `a2a9ad0` did not show meaningful runtime recovery
- `observed`: the prior P0 commit repaired telemetry trust but explicitly did not change trading behavior
- `inferred`: the March 25 guard-pause slice is an engine-regression assist on top of an already boxed-in `T-032` runtime

## Final batch decision
- `BATCH_ACTION_CLASS`: `PATCH_NOW`
- Ticket decision: `patch_same_ticket`
- Allowed work mode: `HOTFIX_ONLY`
- Rollback considered: `yes`
- Rollback chosen: `no`

## Executed action
- changed `apps/api/src/modules/bot/bot-engine.service.ts` so non-caution guard-pause ticks no longer terminate the tick with the March 25 cooldown state
- changed `apps/api/src/modules/bot/bot-engine.service.ts` so legacy non-caution `GRID_GUARD_BUY_PAUSE` cooldown locks do not hard-block runtime progression
- added regression coverage in `apps/api/src/modules/bot/bot-engine.service.test.ts`
- widened `scripts/validate-active-ticket.sh` so the targeted T-032 validator includes the new guard-pause cooldown coverage

## Validation
- `./scripts/validate-active-ticket.sh` ✅
- `docker compose -f docker-compose.ci.yml run --rm ci` ✅

## What must happen next
- deploy this engine hotfix
- clean-recreate the runtime
- collect one short fresh bundle
- if the bundle still shows unchanged boxed-in behavior, the next action is `ROLLBACK_NOW` against the March 25 slice back toward `cce2322`
