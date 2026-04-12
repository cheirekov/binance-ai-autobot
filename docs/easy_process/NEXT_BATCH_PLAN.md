# NEXT_BATCH_PLAN

Last updated: 2026-04-12 21:20 EEST  
Owner: PM/BA + Codex

## Exact scope
Keep `T-031` active. Implement one bounded linked-support `T-032` slice so `ABS_DAILY_LOSS` `CAUTION` does not keep new-symbol pause frozen once the book is already near-flat and orderless. Preserve the broader April 2 deadlock recovery, April 9-10 residual mitigation, March 30-31 `T-032` downside-control behavior, and `T-034` funding stability.

Linked support mode:
- `T-032` support slices are allowed in the same batch only when fresh evidence shows downside-control behavior is the immediate blocker to validating the active `T-031` strategy slice.

## In scope
- implement the linked-support thaw in runtime code + tests
- collect the next fresh bundle to validate post-caution candidate activity without restoring the older no-feasible deadlock

## Out of scope
- reopening any DONE ticket
- quote-routing redesign (`T-034` remains closed)
- reopening `T-032` as the active blocker without fresh evidence
- AI/news lane work

## Acceptance criteria
- the repo handoff reflects the active `T-031` batch correctly
- the linked-support slice lands with tests
- the next fresh bundle can show fresher candidate activity after near-flat `CAUTION` without reopening funding or downside-control regressions

## Rollback condition
- the first post-deploy `T-031` bundle reopens a `T-034` funding regression, materially weakens downside control, or restores repeated impossible sell-leg churn on countable inventory

## What capability this moves forward
Moves `Lane A — Strategy quality / regime routing` by preserving the residual-family mitigations while removing a downside-control policy freeze that blocks further candidate-quality validation after the book is already near-flat.
