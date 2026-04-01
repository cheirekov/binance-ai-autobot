# NEXT_BATCH_PLAN

Last updated: 2026-04-01 18:17 EEST  
Owner: PM/BA + Codex

## Exact scope
Keep `T-031` active. Implement the next bounded `T-031` slice so guarded cross-quote sell ladders stop re-entering rotation immediately after the sell leg is parked. Preserve March 30-31 `T-032` downside-control behavior and `T-034` funding stability.

## In scope
- implement the next `T-031` slice in runtime code + tests
- collect the next fresh bundle to validate guarded sell-ladder rotation on cross-quote pairs

## Out of scope
- reopening any DONE ticket
- quote-routing redesign (`T-034` remains closed)
- reopening `T-032` as the active blocker without fresh evidence
- AI/news lane work

## Acceptance criteria
- the repo handoff reflects the active `T-031` batch correctly
- the current `T-031` slice lands with tests
- the next fresh bundle can show lower `Grid guard paused BUY leg` / `Grid waiting for ladder slot or inventory` churn on guarded cross-quote pairs without reopening funding or downside-control regressions

## Rollback condition
- the first post-deploy `T-031` bundle reopens a `T-034` funding regression or materially weakens downside control while exposure is still real

## What capability this moves forward
Moves `Lane A — Strategy quality / regime routing` by rotating away from parked guarded sell ladders once the sell leg is already working, instead of reselecting the same cross-quote dead ends.
