# LATEST_BATCH_DECISION

Last updated: 2026-03-26 12:13 EET  
Owner: PM/BA + Codex

## Batch outcome
- `PROCESS_STATE_CONFLICT`: `true`
- Incident classification: `P0 combined runtime-idle / process-confused incident`
- Runtime class: `strategy-idle / boxed-in`, not proven engine-dead
- `BATCH_ACTION_CLASS`: `PATCH_NOW`
- Authoritative sources for this batch:
  - `docs/RETROSPECTIVE_AUTO.md`
  - `docs/TRIAGE_NOTE_2026-03-25_T032_GRID_GUARD_PAUSED_BUY_LEG_LOOP.md`
  - `docs/easy_process/P0_INCIDENT_SUMMARY.md`
  - `docs/easy_process/LATEST_BATCH_DECISION.md`

## Production capability lane
- Chosen: `Lane A — Runtime stability`
- Why:
  - `observed`: the latest fresh bundle `autobot-feedback-20260326-090817.tgz` on `a2a9ad0` still showed `Skip BTCUSDC: Grid guard paused BUY leg (17 -> 17)` and no `grid-guard-defensive-unwind`
  - `observed`: the last engine change on the bot path was `11cadf29` on 2026-03-25 22:45 +0200, merged to `main` as `a2a9ad01`
  - `observed`: that March 25 slice added a generic symbol `COOLDOWN` and terminal no-action save on non-caution guard-pause ticks
  - `inferred`: that change can hard-block symbol re-entry and preempt the later waiting / unwind path

## Chosen active ticket
- Current: `T-032` (Exit manager v2)
- Status: `IN_PROGRESS`
- Decision: `patch_same_ticket`
- Evidence tags:
  - `observed`: `T-031` was the active ticket before `T-032`
  - `observed`: `T-032` added caution unwind first, then defensive grid-guard unwind, then the March 25 guard-pause cooldown slice
  - `observed`: the March 25 slice did not restore meaningful runtime behavior in the next fresh bundle
  - `inferred`: the incident is partly engine-regression-driven, but not safely solved by a full rollback alone
  - `assumption`: the next short post-deploy bundle is enough to confirm the engine is no longer being boxed in by the March 25 lock semantics

## Evidence class
- Current: `fresh`
- Basis:
  - bundle: `autobot-feedback-20260326-090817.tgz`
  - reviewed deployed sha: `a2a9ad0`
  - audited engine range: `cce2322..a2a9ad0`

## Allowed work mode
- Decision: `HOTFIX_ONLY`
- Reason:
  - this is a P0 runtime recovery batch with a bounded engine-path fix
  - UI/reporting-only work is not sufficient

## Engine-first audit
1. Last commit that changed `apps/api/src/modules/bot/bot-engine.service.ts`:
   - `11cadf29d7b3c8d564a5ee5cab4ab4e1b33fbf50`
   - merged into `main` as `a2a9ad01cd87642c4c2c69eab7e73529ec183399`
2. Ticket intent of that change:
   - make repeated `Grid guard paused BUY leg` skips storm-eligible
   - persist a symbol cooldown so the bot rotates away from repeated guard-paused symbols
3. Did engine behavior likely regress after that change:
   - `yes`
   - the non-caution guard-pause branch now saves a generic symbol `COOLDOWN` and returns before later `Grid waiting for ladder slot or inventory` / no-inventory handling can run
4. Is rollback to the prior engine state safer than another forward patch:
   - `no`
   - pre-patch `cce2322` already had the same dominant live loop, so a full rollback would knowingly return to an already unresolved runtime
5. Smallest safe engine patch:
   - keep `grid guard pause` storm visibility
   - stop terminally persisting non-caution guard-pause cooldown as the final no-action state
   - treat legacy non-caution `GRID_GUARD_BUY_PAUSE` cooldown locks as non-blocking so deployed runtimes can recover immediately after rollout

## Executed action
- Code changed: `yes`
- Bot-engine changed: `yes`
- Files changed:
  - `apps/api/src/modules/bot/bot-engine.service.ts`
  - `apps/api/src/modules/bot/bot-engine.service.test.ts`
  - `scripts/validate-active-ticket.sh`
- Validation run:
  - `./scripts/validate-active-ticket.sh`
  - `docker compose -f docker-compose.ci.yml run --rm ci`
