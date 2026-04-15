# NEXT_BATCH_PLAN

Last updated: 2026-04-15 10:45 EEST  
Owner: PM/BA + Codex

## Exact scope
Keep `T-031` active. Implement one bounded correction so the first-pass dust-cooldown bypass still allows tiny residual recovery, but does not bypass active `Skip storm (...) Grid sell leg not actionable yet` locks. Preserve the April 12 linked-support thaw, April 14 widened residual storm behavior, March 30-31 `T-032` downside-control behavior, and `T-034` funding stability.

Linked support mode:
- `T-032` support slices are allowed in the same batch only when fresh evidence shows downside-control behavior is the immediate blocker to validating the active `T-031` strategy slice.

## In scope
- honor active skip-storm locks in runtime code + tests
- collect the next fresh bundle to validate lower storm-lock re-selection without restoring the older no-feasible deadlock

## Out of scope
- reopening any DONE ticket
- quote-routing redesign (`T-034` remains closed)
- reopening `T-032` as the active blocker without fresh evidence
- AI/news lane work

## Acceptance criteria
- the repo handoff reflects the active `T-031` batch correctly
- the storm-lock bypass correction lands with tests
- the next fresh bundle can show lower residual storm-lock re-selection without reopening funding or downside-control regressions

## Rollback condition
- the first post-deploy `T-031` bundle reopens a `T-034` funding regression, materially weakens downside control, or restores repeated impossible sell-leg churn on countable inventory

## What capability this moves forward
Moves `Lane A — Strategy quality / regime routing` by preserving the caution thaw while preventing residual dust from simply rotating across symbols after candidate activity resumes.
