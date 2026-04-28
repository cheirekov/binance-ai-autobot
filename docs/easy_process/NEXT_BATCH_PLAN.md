# NEXT_BATCH_PLAN

Last updated: 2026-04-28 13:50 EEST
Owner: PM/BA + Codex

## Exact scope
Keep `T-031` active. Implement one bounded correction so normal-mode dust home-quote candidates are not blocked by stale `GRID_SELL_NOT_ACTIONABLE` storm locks, and recovery min-order dust stays parked for hours instead of retrying every ~20 minutes. Preserve the April 20 linked-support `T-032` fix, April 23 buy-quote quarantine, April 20 quote-pressure quarantine, April 17 dust cooldown, April 15 fee-edge quarantine, and `T-034` funding stability.

Linked support mode:
- `T-032` support slices are allowed in the same batch only when fresh evidence shows downside-control behavior is the immediate blocker to validating the active `T-031` strategy slice.

## In scope
- allow dust-sized home-quote candidates through sell-storm locks only in `NORMAL` mode with zero active orders
- extend `NO_FEASIBLE_RECOVERY_MIN_ORDER` parking to multi-hour windows
- preserve home-quote / actionable sell-leg reachability and collect the next fresh bundle to validate lower repeated no-feasible churn

## Out of scope
- reopening any DONE ticket
- quote-routing redesign (`T-034` remains closed)
- reopening `T-032` as the active blocker without fresh evidence
- AI/news lane work

## Acceptance criteria
- the repo handoff reflects the active `T-031` batch correctly
- the new `T-031` slice lands with tests
- the next fresh bundle shows lower repeated `No feasible candidates after policy/exposure filters`
- no-feasible recovery stops repeatedly selecting the same below-minimum `TRXBTC` dust candidate on a minutes cadence
- home-quote candidates progress past stale dust sell-storm locks in `NORMAL`
- the April 20 `T-032` support fix remains preserved

## Rollback condition
- the first post-patch bundle reopens the old near-flat freeze, materially weakens downside control, blocks reachable home-quote / managed sell paths, or proves the fresh-family suppression weakens valid candidate reachability

## What capability this moves forward
Moves `Lane A — Strategy quality / regime routing` by separating stale dust lock handling from real risk locks, so the bot can act when it has spendable home quote and no active orders.
