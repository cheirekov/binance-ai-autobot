# NEXT_BATCH_PLAN

Last updated: 2026-04-23 11:20 EEST
Owner: PM/BA + Codex

## Exact scope
Keep `T-031` active. Implement one bounded correction so active `GRID_BUY_QUOTE` quarantine suppresses fresh non-home quote families with no actionable sell leg even when they do not yet have local quote-insufficient skip history. Preserve the April 20 linked-support `T-032` fix, April 20 quote-pressure quarantine, April 17 dust cooldown, April 15 fee-edge quarantine, and `T-034` funding stability.

Linked support mode:
- `T-032` support slices are allowed in the same batch only when fresh evidence shows downside-control behavior is the immediate blocker to validating the active `T-031` strategy slice.

## In scope
- make active `GRID_BUY_QUOTE` quarantine effective across fresh non-home quote families
- preserve home-quote / actionable sell-leg reachability
- collect the next fresh bundle to validate lower repeated no-feasible churn without reopening downside-control regressions

## Out of scope
- reopening any DONE ticket
- quote-routing redesign (`T-034` remains closed)
- reopening `T-032` as the active blocker without fresh evidence
- AI/news lane work

## Acceptance criteria
- the repo handoff reflects the active `T-031` batch correctly
- the new `T-031` slice lands with tests
- the next fresh bundle shows lower repeated `No feasible candidates after policy/exposure filters`
- active `GRID_BUY_QUOTE` quarantine is effective on fresh non-home quote families
- the April 20 `T-032` support fix remains preserved

## Rollback condition
- the first post-patch bundle reopens the old near-flat freeze, materially weakens downside control, blocks reachable home-quote / managed sell paths, or proves the fresh-family suppression weakens valid candidate reachability

## What capability this moves forward
Moves `Lane A — Strategy quality / regime routing` by making the existing buy-quote quarantine effective against fresh non-home quote families during repeated no-feasible quote-pressure loops.
