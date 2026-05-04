# NEXT_BATCH_PLAN

Last updated: 2026-05-04 11:50 EEST
Owner: PM/BA + Codex

## Exact scope
Keep `T-031` active. Implement one bounded correction so restored trading is governed by fee-aware daily-loss/profit-giveback math and severe near-halt loss-budget usage cannot reopen fresh-symbol entries just because exposure is near-flat.

Linked support mode:
- `T-032` support slices are allowed in the same batch only when fresh evidence shows downside-control behavior is the immediate blocker to validating the active `T-031` strategy slice.

## In scope
- include buy and sell fees in closed-PnL events used by daily-loss/giveback protection.
- lower profit-giveback activation to preserve smaller net wins after fees.
- pause fresh symbols during severe near-halt daily-loss caution.
- preserve April 30 dust/zero SELL-leg BUY progression and earlier recovery/quarantine behavior.

## Out of scope
- reopening any DONE ticket.
- quote-routing redesign (`T-034` remains closed).
- promoting `T-032` to active without fresh downside-control evidence beyond this bounded support slice.
- fee-floor weakening, PnL schema changes, AI/news lane work.

## Acceptance criteria
- code and tests land under `T-031`.
- next fresh bundle shows fee-aware daily-loss/giveback details.
- next fresh bundle does not open fresh symbols while severe near-halt daily-loss caution is active.
- once the loss window clears, next fresh bundle shows either active grid orders or the next concrete blocker.

## Rollback condition
- the first post-patch bundle reopens a hard risk freeze, buys when `CAUTION/HALT` should block new exposure, or weakens reachable sell/unwind behavior.

## What capability this moves forward
Moves `Lane A — Strategy quality / regime routing` by making restored activity respect fee-aware drawdown protection before the next strategy-quality slice.
