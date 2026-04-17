# NEXT_BATCH_PLAN

Last updated: 2026-04-17 20:15 EEST
Owner: PM/BA + Codex

## Exact scope
Keep `T-031` active. Implement one bounded correction so near-flat `PROFIT_GIVEBACK` `CAUTION` books with `activeOrders=0` can park repeated no-feasible recovery attempts when the fallback sell is still below exchange minimums. Preserve the April 15 global fee-edge quarantine correction, April 13-15 residual storm behavior, April 12 linked-support thaw, March 30-31 `T-032` downside-control behavior, and `T-034` funding stability.

Linked support mode:
- `T-032` support slices are allowed in the same batch only when fresh evidence shows downside-control behavior is the immediate blocker to validating the active `T-031` strategy slice.

## In scope
- add the bounded no-feasible dust recovery cooldown in runtime code + tests
- collect the next fresh bundle to validate lower no-feasible churn without hiding actionable sells or caution unwind behavior

## Out of scope
- reopening any DONE ticket
- quote-routing redesign (`T-034` remains closed)
- reopening `T-032` as the active blocker without fresh evidence
- AI/news lane work

## Acceptance criteria
- the repo handoff reflects the active `T-031` batch correctly
- the no-feasible dust recovery cooldown lands with tests
- the next fresh bundle can show lower no-feasible churn without reopening funding or downside-control regressions

## Rollback condition
- the first post-deploy `T-031` bundle reopens a `T-034` funding regression, materially weakens downside control, blocks actionable managed sell legs, or still burns most decisions inside the same near-flat no-feasible loop

## What capability this moves forward
Moves `Lane A — Strategy quality / regime routing` by making near-flat no-feasible recovery behavior auditable and bounded instead of letting the bot hammer an exchange-infeasible dust recovery path every tick.
