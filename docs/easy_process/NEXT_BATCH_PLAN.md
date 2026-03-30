# NEXT_BATCH_PLAN

Last updated: 2026-03-30 12:45 EEST  
Owner: PM/BA + Codex

## Exact scope
Reactivate `T-032`. Implement the next bounded `T-032` slice so `ABS_DAILY_LOSS` caution no longer pauses new symbols once the book is effectively flat. Preserve March 28-29 `T-031` strategy-quality slices and `T-034` funding stability.

## In scope
- implement the next `T-032` slice in runtime code + tests
- collect the next fresh bundle to validate flat-book caution thaw

## Out of scope
- reopening any DONE ticket
- quote-routing redesign (`T-034` remains closed)
- broader regime-engine rewrite beyond preserving current `T-031` behavior
- AI/news lane work

## Acceptance criteria
- the repo handoff reflects the active `T-032` batch correctly
- the current `T-032` slice lands with tests
- the next fresh bundle can show lower flat-book `CAUTION` pause churn without reopening funding or downside-control regressions

## Rollback condition
- the first post-deploy `T-032` bundle reopens a `T-034` funding regression or materially weakens downside control while exposure is still real

## What capability this moves forward
Moves `Lane A — Exit manager / downside control` by letting the engine recover from `ABS_DAILY_LOSS` caution once the book is already de-risked instead of staying boxed in by a stale new-symbol pause.
