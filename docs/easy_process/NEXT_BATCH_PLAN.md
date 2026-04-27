# NEXT_BATCH_PLAN

Last updated: 2026-04-27 15:15 EEST
Owner: PM/BA + Codex

## Exact scope
Keep `T-031` active. Implement one bounded correction so no-feasible recovery prefers reachable home-stable managed sells, bypasses only soft buy/quote/grid-wait locks for recovery SELL validation, and parks below-minimum recovery dust instead of retrying it every cycle. Preserve the April 20 linked-support `T-032` fix, April 23 buy-quote quarantine, April 20 quote-pressure quarantine, April 17 dust cooldown, April 15 fee-edge quarantine, and `T-034` funding stability.

Linked support mode:
- `T-032` support slices are allowed in the same batch only when fresh evidence shows downside-control behavior is the immediate blocker to validating the active `T-031` strategy slice.

## In scope
- rank no-feasible recovery sell candidates home-stable first
- let recovery SELL validation bypass only soft symbol cooldowns that are not hard/global risk locks
- add bounded `NO_FEASIBLE_RECOVERY_MIN_ORDER` parking for below-minimum recovery candidates
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
- no-feasible recovery stops repeatedly selecting the same below-minimum `TRXBTC` dust candidate
- reachable home-quote recovery sells remain eligible for exchange validation
- the April 20 `T-032` support fix remains preserved

## Rollback condition
- the first post-patch bundle reopens the old near-flat freeze, materially weakens downside control, blocks reachable home-quote / managed sell paths, or proves the fresh-family suppression weakens valid candidate reachability

## What capability this moves forward
Moves `Lane A — Strategy quality / regime routing` by making no-feasible recovery choose actually reachable sell candidates before rotating through quote-pressure dust dead ends.
