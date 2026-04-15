# NEXT_BATCH_PLAN

Last updated: 2026-04-15 19:55 EEST
Owner: PM/BA + Codex

## Exact scope
Keep `T-031` active. Implement one bounded correction so active global `FEE_EDGE` quarantine suppresses fresh non-home-quote grid candidates that have no actionable sell leg, without weakening the fee floor or blocking home-quote / managed sell-leg paths. Preserve the April 12 linked-support thaw, April 15 storm-lock bypass correction, March 30-31 `T-032` downside-control behavior, and `T-034` funding stability.

Linked support mode:
- `T-032` support slices are allowed in the same batch only when fresh evidence shows downside-control behavior is the immediate blocker to validating the active `T-031` strategy slice.

## In scope
- make global fee-edge quarantine effective across fresh cross-quote candidates in runtime code + tests
- collect the next fresh bundle to validate lower `ETH`/cross-quote fee-edge rotation without restoring the older no-feasible deadlock

## Out of scope
- reopening any DONE ticket
- quote-routing redesign (`T-034` remains closed)
- reopening `T-032` as the active blocker without fresh evidence
- AI/news lane work

## Acceptance criteria
- the repo handoff reflects the active `T-031` batch correctly
- the global fee-edge quarantine correction lands with tests
- the next fresh bundle can show lower cross-quote fee-edge rotation without reopening funding or downside-control regressions

## Rollback condition
- the first post-deploy `T-031` bundle reopens a `T-034` funding regression, materially weakens downside control, blocks actionable managed sell legs, or restores a no-feasible deadlock

## What capability this moves forward
Moves `Lane A — Strategy quality / regime routing` by making global fee-edge evidence affect candidate quality before the bot rotates through fresh cross-quote symbols.
