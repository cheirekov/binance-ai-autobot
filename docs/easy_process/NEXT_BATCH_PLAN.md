# NEXT_BATCH_PLAN

Last updated: 2026-04-13 11:45 EEST  
Owner: PM/BA + Codex

## Exact scope
Keep `T-031` active. Implement one bounded family-level residual storm slice so repeated `Grid sell leg not actionable yet` skips across multiple home-quote dust symbols trigger a longer retry cooldown as a cluster. Preserve the April 12 linked-support thaw, the broader April 2 deadlock recovery, April 9-10 residual mitigation, March 30-31 `T-032` downside-control behavior, and `T-034` funding stability.

Linked support mode:
- `T-032` support slices are allowed in the same batch only when fresh evidence shows downside-control behavior is the immediate blocker to validating the active `T-031` strategy slice.

## In scope
- implement the family-level residual storm slice in runtime code + tests
- collect the next fresh bundle to validate lower repeated residual-family churn without restoring the older no-feasible deadlock

## Out of scope
- reopening any DONE ticket
- quote-routing redesign (`T-034` remains closed)
- reopening `T-032` as the active blocker without fresh evidence
- AI/news lane work

## Acceptance criteria
- the repo handoff reflects the active `T-031` batch correctly
- the family-level residual storm slice lands with tests
- the next fresh bundle can show lower repeated residual-family churn without reopening funding or downside-control regressions

## Rollback condition
- the first post-deploy `T-031` bundle reopens a `T-034` funding regression, materially weakens downside control, or restores repeated impossible sell-leg churn on countable inventory

## What capability this moves forward
Moves `Lane A — Strategy quality / regime routing` by preserving the caution thaw while preventing residual dust from simply rotating across symbols after candidate activity resumes.
