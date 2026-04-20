# NEXT_BATCH_PLAN

Last updated: 2026-04-20 11:00 EEST
Owner: PM/BA + Codex

## Exact scope
Keep `T-031` active. Implement one bounded correction so repeated no-feasible loops driven entirely by non-home quote pressure can seed the existing `GRID_BUY_QUOTE` quarantine path when the recovery attempt also fails on exchange minimums. Preserve the April 17 dust cooldown, April 15 fee-edge quarantine, April 12 linked-support thaw, March 30-31 `T-032` downside-control behavior, and `T-034` funding stability.

Linked support mode:
- `T-032` support slices are allowed in the same batch only when fresh evidence shows downside-control behavior is the immediate blocker to validating the active `T-031` strategy slice.

## In scope
- wire no-feasible quote-pressure evidence into the existing `GRID_BUY_QUOTE` quarantine path
- collect the next fresh bundle to validate lower no-feasible churn without reopening `T-032`

## Out of scope
- reopening any DONE ticket
- quote-routing redesign (`T-034` remains closed)
- reopening `T-032` as the active blocker without fresh evidence
- AI/news lane work

## Acceptance criteria
- the repo handoff reflects the active `T-031` batch correctly
- the new quote-pressure quarantine path lands with tests
- the next fresh bundle shows lower repeated no-feasible churn without reopening funding or downside-control regressions

## Rollback condition
- the first post-patch bundle reopens the old near-flat freeze, materially weakens downside control, blocks reachable home-quote / managed sell paths, or proves `T-032` is again the dominant blocker

## What capability this moves forward
Moves `Lane A — Strategy quality / regime routing` by stopping quote-starved non-home quote families from re-entering selection through the no-feasible path.
