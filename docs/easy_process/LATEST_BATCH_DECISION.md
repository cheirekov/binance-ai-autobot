# LATEST_BATCH_DECISION

Last updated: 2026-03-26 11:44 EET  
Owner: PM/BA + Codex

## Batch outcome
- `PROCESS_STATE_CONFLICT`: `true`
- Incident classification: `P0 combined operational non-credibility incident`
- `BATCH_ACTION_CLASS`: `OPERATIONS_ADJUSTMENT`
- Authoritative sources for this batch:
  - `docs/RETROSPECTIVE_AUTO.md`
  - `docs/easy_process/P0_INCIDENT_SUMMARY.md`
  - `docs/easy_process/LATEST_BATCH_DECISION.md`
- Still-stale or conflicting inputs:
  - `docs/SESSION_BRIEF.md` remains internally mixed for this incident batch
  - `docs/easy_process/STATE_DIGEST.md` was stale before this batch
  - local `data/state.json` says `running=true` while `docker compose ps` showed no active local services

## Production capability lane
- Chosen: `Lane E — State/process hygiene`
- Capability moved forward: `operator trust + incident-grade state clarity`
- Why:
  - `observed`: the latest fresh bundle `autobot-feedback-20260326-090817.tgz` on `a2a9ad0` still showed `Skip BTCUSDC: Grid guard paused BUY leg (17 -> 17)` with no `grid-guard-defensive-unwind`
  - `observed`: the operator-facing telemetry path was non-credible because `last_run_summary.pnl.daily_net_usdt` was being written from overall `net`, not a distinct rolling 24h figure
  - `observed`: the local workspace also showed stale process memory (`running=true` in state, no active Compose services)
  - `inferred`: rollback or strategy patch from this state would still leave the operator blind on whether the bot is truly dead, boxed-in, or simply misreported

## Chosen active ticket
- Current: `T-032` (Exit manager v2)
- Status: `IN_PROGRESS`
- Decision: `continue_same_ticket`
- PM/BA resolution:
  - keep `T-032` as the only active trading-behavior ticket
  - do not continue routine same-ticket hotfixing from the March 25 / March 26 bundle pair
  - finish the operator-trust adjustment now, then return to deterministic `T-032` proof for rollback vs patch

## Evidence class
- Current: `fresh` for the March 26 bundle, with a separate stale local runtime/state surface
- Evidence tags:
  - `observed`: `T-031` was the active ticket before `T-032`
  - `observed`: the `T-031 -> T-032` switch changed the code from candidate-hygiene work to downside-control/unwind work
  - `observed`: the March 25 slice added a generic guard-pause `COOLDOWN` that can hard-block a symbol before unwind paths are evaluated
  - `observed`: `daily_net_usdt` in `last_run_summary` was not a rolling 24h field
  - `inferred`: the current incident is not one thing; it is a combined runtime + process/state + telemetry credibility failure

## Allowed work mode
- Decision: `PATCH_ALLOWED`
- Reason:
  - the safest immediate action is an ops-credibility patch that does not change trading behavior
  - rollback was considered, but it would not fix the confirmed reporting/state defects and is not yet clearly safer than a non-behavioral adjustment

## Ticket/change audit
- Ticket active before `T-032`: `T-031`
- What changed around the switch:
  - `T-032` first added CAUTION/`PROFIT_GIVEBACK` unwind behavior
  - `T-032` then added defensive bear-loop unwind behavior
  - the March 25 slice added guard-pause storm handling plus a generic symbol `COOLDOWN`
- Did implementation drift from ticket intent?
  - `yes, partially`
  - the March 25 slice mostly rotated away from repeated guard-paused symbols; that is weaker and more candidate-hygiene-like than the core `T-032` intent of earlier de-risking and stronger downside exits
- Current incident is most likely:
  - `combined failure`
  - components: `strategy-idle boxed-in runtime` + `March 25 off-intent regression surface` + `metrics/reporting defect` + `process/state confusion`

## Code-surface discovery
- Likely rollback surface:
  - the March 25 guard-pause `COOLDOWN` slice in [bot-engine.service.ts](/home/yc/work/binance-ai-autobot/apps/api/src/modules/bot/bot-engine.service.ts)
  - helper tests added for that slice in [bot-engine.service.test.ts](/home/yc/work/binance-ai-autobot/apps/api/src/modules/bot/bot-engine.service.test.ts)
- Likely patch surface:
  - guard-pause lock semantics around `buyPaused` handling and symbol blocking in [bot-engine.service.ts](/home/yc/work/binance-ai-autobot/apps/api/src/modules/bot/bot-engine.service.ts)
  - operator-facing telemetry/timeline trust surfaces in [generate-last-run-summary.sh](/home/yc/work/binance-ai-autobot/scripts/generate-last-run-summary.sh) and [DashboardPage.tsx](/home/yc/work/binance-ai-autobot/apps/ui/src/pages/DashboardPage.tsx)
- Likely validation surface:
  - [bot-engine.service.test.ts](/home/yc/work/binance-ai-autobot/apps/api/src/modules/bot/bot-engine.service.test.ts)
  - [validate-active-ticket.sh](/home/yc/work/binance-ai-autobot/scripts/validate-active-ticket.sh)
- Primary issue type:
  - `combination`
  - not process-only
  - not PnL-only
  - not yet proven to be a pure March 25 regression either

## Execution result
- Code changed: `yes`
- Files changed:
  - [generate-last-run-summary.sh](/home/yc/work/binance-ai-autobot/scripts/generate-last-run-summary.sh)
  - [DashboardPage.tsx](/home/yc/work/binance-ai-autobot/apps/ui/src/pages/DashboardPage.tsx)
- Executed action:
  - `daily_net_usdt` now comes from a rolling 24h wallet-delta path with a realized-PnL fallback, instead of reusing lifetime `net`
  - the dashboard now exposes stale state/run-stats/adaptive timelines with absolute timestamps
- Validation run:
  - `bash -n scripts/generate-last-run-summary.sh`
  - `./scripts/generate-last-run-summary.sh /tmp/last_run_summary.p0.json`
  - `docker compose -f docker-compose.ci.yml run --rm ci`
