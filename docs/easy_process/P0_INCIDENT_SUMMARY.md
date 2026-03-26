# P0_INCIDENT_SUMMARY

Last updated: 2026-03-26 11:44 EET  
Owner: PM/BA + Codex

## Incident classification
- `P0 combined operational non-credibility incident`
- Bot status classification:
  - `March 26 fresh bundle`: `strategy-idle / boxed-in`, not clearly engine-dead
  - `current repo + local state surface`: `process-confused and telemetry-non-credible`

## Current symptoms
- almost no meaningful new decisions over long periods
- displayed PnL appeared frozen even when described as 24h-based
- the March 25 patch was deployed in `a2a9ad0` but did not improve the dominant March 26 loop
- local state also showed `running=true` while `docker compose ps` showed no active local services

## Mandatory incident audit
1. What ticket was active before `T-032`?
- `T-031`

2. What code changes happened around the switch?
- the switch from `T-031` to `T-032` moved implementation from candidate-hygiene work to downside-control work:
  - first CAUTION / `PROFIT_GIVEBACK` unwind
  - then defensive bear-loop unwind
  - later, on 2026-03-25, a guard-pause storm + `COOLDOWN` slice was added

3. Did implementation drift from ticket intent?
- `yes, partially`
- the March 25 slice mainly added cooldown-driven rotation around repeated guard-paused symbols, which is weaker and more candidate-hygiene-like than the core `T-032` intent of earlier de-risking and stronger exits

4. What is the current incident most likely?
- `combined failure`
- components:
  - unresolved `T-032` boxed-in runtime state
  - plausible March 25 regression surface in guard-pause `COOLDOWN` blocking
  - telemetry/reporting defect (`daily_net_usdt` was not a real rolling 24h figure)
  - process/state confusion (`running=true` with no local runtime)

## Root-cause assessment
- `observed`: `T-031 -> T-032` switch was justified; candidate hygiene had improved but wallet/equity protection had not
- `observed`: the March 25 same-ticket patch did not restore credible runtime behavior in the next fresh bundle
- `observed`: metrics and timeline trust were independently broken, so the operator could not reliably distinguish dead/stale process, boxed-in strategy idle, and reporting freeze
- `inferred`: the safest immediate action was not another strategy hotfix or blind rollback; it was to repair the operator-facing credibility surfaces first

## Final batch decision
- `PROCESS_STATE_CONFLICT`: `true`
- `BATCH_ACTION_CLASS`: `OPERATIONS_ADJUSTMENT`
- Ticket decision: `continue_same_ticket`
- `T-032` remains the correct active trading-behavior ticket:
  - `yes`, but only after this batch's ops-credibility fix and a deterministic proof batch

## Executed action
- corrected `last_run_summary.pnl.daily_net_usdt` to use a rolling 24h wallet-delta path with realized-PnL fallback
- made stale state, stale run-stats, and stale adaptive timelines explicit in the dashboard with absolute timestamps

## Rollback consideration
- rollback was considered for the March 25 guard-pause `COOLDOWN` slice
- rollback was not chosen in this batch because:
  - the regression surface is plausible but not yet proven as the dominant cause
  - rollback would not fix the confirmed reporting and process-state credibility defects

## What must happen next
- deploy this ops adjustment
- do a clean recreate on the runtime instead of trusting recovered `running=true` state
- collect one short post-adjustment bundle for freshness confirmation
- then run the deterministic `T-032` proof batch that decides `ROLLBACK_NOW` vs `PATCH_NOW`
