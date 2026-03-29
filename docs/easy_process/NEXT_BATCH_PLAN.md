# NEXT_BATCH_PLAN

Last updated: 2026-03-29 18:35 EET  
Owner: PM/BA + Codex

## Exact scope
Keep active development on `T-031`. Implement the next bounded `T-031` slice so already-open managed symbols are not blocked by fee-edge gating before defensive / loss-guard handling can run. Preserve current `T-032` downside controls and `T-034` funding stability.

## In scope
- implement the next `T-031` slice in runtime code + tests
- collect the next fresh bundle to validate strategy-quality change

## Out of scope
- reopening any DONE ticket
- quote-routing redesign (`T-034` remains closed)
- exit-manager rewrite beyond preserving current `T-032` behavior
- AI/news lane work

## Acceptance criteria
- the repo handoff reflects the active `T-031` batch correctly
- the current `T-031` slice lands with tests
- the next fresh bundle can show lower managed-symbol fee-edge churn during `CAUTION` without reopening funding or downside-control regressions

## Rollback condition
- the first post-deploy `T-031` bundle reopens a `T-034` funding regression or materially weakens downside control

## What capability this moves forward
Moves `Lane C — Strategy quality` by making downside-control reachability compatible with managed-symbol strategy handling instead of letting fee-edge returns short-circuit `CAUTION` management.
