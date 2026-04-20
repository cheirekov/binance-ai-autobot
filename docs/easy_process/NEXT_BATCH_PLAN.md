# NEXT_BATCH_PLAN

Last updated: 2026-04-20 18:20 EEST
Owner: PM/BA + Codex

## Exact scope
Keep `T-031` active. Implement one bounded linked-support `T-032` correction so `PROFIT_GIVEBACK` `HALT` only counts managed exposure that is still actually unwindable in balances. Preserve the April 20 quote-pressure quarantine, April 17 dust cooldown, April 15 fee-edge quarantine, April 12 linked-support thaw, March 30-31 `T-032` downside-control behavior, and `T-034` funding stability.

Linked support mode:
- `T-032` support slices are allowed in the same batch only when fresh evidence shows downside-control behavior is the immediate blocker to validating the active `T-031` strategy slice.

## In scope
- thread live balances into daily-loss guard managed-exposure evaluation
- clip `PROFIT_GIVEBACK` managed exposure to the portion of managed base inventory that still exists in balances
- collect the next fresh bundle to validate that false `HALT` persistence clears without reopening the old quote-pressure loops

## Out of scope
- reopening any DONE ticket
- quote-routing redesign (`T-034` remains closed)
- reopening `T-032` as the active blocker without fresh evidence
- AI/news lane work

## Acceptance criteria
- the repo handoff reflects the active `T-031` batch correctly
- the linked-support `T-032` slice lands with tests
- the next fresh bundle no longer stays latched in false `PROFIT_GIVEBACK` `HALT` because of already-spent base exposure
- the April 20 quote-pressure quarantine behavior remains preserved

## Rollback condition
- the first post-patch bundle reopens the old near-flat freeze, materially weakens downside control, blocks reachable home-quote / managed sell paths, or proves this support slice weakened the April 20 quote-pressure mitigation

## What capability this moves forward
Moves `Lane A — Strategy quality / regime routing` by removing false downside-control `HALT` persistence that currently blocks validation of the active strategy-quality lane.
