# NEXT_BATCH_PLAN

Last updated: 2026-04-07 21:20 EEST  
Owner: PM/BA + Codex

## Exact scope
Keep `T-031` active. Implement the next bounded `T-031` slice so repeated solo `Grid sell leg not actionable yet` retries on the same home-quote dust residual are re-blocked after a higher local threshold, while preserving the broader April 2 deadlock recovery and the April 7 morning paired-loop reduction. Preserve March 30-31 `T-032` downside-control behavior and `T-034` funding stability.

Linked support mode:
- `T-032` support slices are allowed in the same batch only when fresh evidence shows downside-control behavior is the immediate blocker to validating the active `T-031` strategy slice.

## In scope
- implement the next `T-031` slice in runtime code + tests
- collect the next fresh bundle to validate lower repeated solo residual-loop churn without restoring the older no-feasible deadlock

## Out of scope
- reopening any DONE ticket
- quote-routing redesign (`T-034` remains closed)
- reopening `T-032` as the active blocker without fresh evidence
- AI/news lane work

## Acceptance criteria
- the repo handoff reflects the active `T-031` batch correctly
- the current `T-031` slice lands with tests
- the next fresh bundle can show lower repeated solo residual-loop churn without reopening funding or downside-control regressions

## Rollback condition
- the first post-deploy `T-031` bundle reopens a `T-034` funding regression, materially weakens downside control, or restores repeated impossible sell-leg churn on countable inventory

## What capability this moves forward
Moves `Lane A — Strategy quality / regime routing` by preserving the dust-cooldown recovery path for first-pass deadlock resolution while preventing one residual family from resurfacing through repeated solo sell-leg retries.
