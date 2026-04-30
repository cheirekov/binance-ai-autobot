# NEXT_BATCH_PLAN

Last updated: 2026-04-30 11:45 EEST
Owner: PM/BA + Codex

## Exact scope
Keep `T-031` active. Implement one bounded correction so dust/zero grid SELL legs do not block reachable BUY progression, and grid-guarded symbols with no actionable live sell inventory rotate away before consuming the decision window.

Linked support mode:
- `T-032` support slices are allowed in the same batch only when fresh evidence shows downside-control behavior is the immediate blocker to validating the active `T-031` strategy slice.

## In scope
- value home-quote inventory against the risk-linked countable-exposure floor before treating it as actionable.
- skip feasible-live candidates that are buy-paused while live inventory is below actionable sell size.
- allow grid BUY evaluation to continue when the missing SELL leg is dust-sized or zero.
- preserve April 28 stale-dust storm-lock behavior and April 27 no-feasible recovery dust parking.

## Out of scope
- reopening any DONE ticket.
- quote-routing redesign (`T-034` remains closed).
- reopening `T-032` as the active blocker without fresh downside-control evidence.
- fee-floor weakening, PnL schema changes, AI/news lane work.

## Acceptance criteria
- code and tests land under `T-031`.
- next fresh bundle no longer repeats `BTCUSDC Grid sell leg not actionable yet` as the dominant loop.
- next fresh bundle shows either active grid orders or the next concrete blocker.
- `T-032` support behavior remains preserved.

## Rollback condition
- the first post-patch bundle reopens a hard risk freeze, buys when `CAUTION/HALT` should block new exposure, or weakens reachable sell/unwind behavior.

## What capability this moves forward
Moves `Lane A — Strategy quality / regime routing` by making candidate actionability depend on live sellability and by preventing an impossible SELL leg from suppressing a valid BUY leg.
