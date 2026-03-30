# NEXT_BATCH_PLAN

Last updated: 2026-03-30 17:40 EEST  
Owner: PM/BA + Codex

## Exact scope
Keep `T-032` active. Implement the next bounded `T-032` slice so materially exposed `ABS_DAILY_LOSS` caution can reach best-effort unwind instead of mostly pausing GRID buy legs. Preserve the earlier flat-book thaw, March 28-29 `T-031` strategy-quality slices, and `T-034` funding stability.

## In scope
- implement the next `T-032` slice in runtime code + tests
- collect the next fresh bundle to validate caution unwind reachability under material exposure

## Out of scope
- reopening any DONE ticket
- quote-routing redesign (`T-034` remains closed)
- broader regime-engine rewrite beyond preserving current `T-031` behavior
- AI/news lane work

## Acceptance criteria
- the repo handoff reflects the active `T-032` batch correctly
- the current `T-032` slice lands with tests
- the next fresh bundle can show lower managed-symbol `Daily loss caution paused GRID BUY leg` churn and visible caution-unwind reachability without reopening funding or downside-control regressions

## Rollback condition
- the first post-deploy `T-032` bundle reopens a `T-034` funding regression or materially weakens downside control while exposure is still real

## What capability this moves forward
Moves `Lane A — Exit manager / downside control` by letting the engine start best-effort unwind earlier during materially exposed `ABS_DAILY_LOSS` caution instead of only pausing managed buy legs.
