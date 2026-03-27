# NEXT_BATCH_PLAN

Last updated: 2026-03-27 14:40 EET  
Owner: PM/BA + Codex

## Exact scope
Validate the new profit-giveback `CAUTION` threshold patch against the next fresh live bundle. Confirm that once managed exposure is already low-to-moderate, the bot no longer globally pauses all new symbols, while keeping symbol-level bearish BUY pauses and the proven no-feasible recovery behavior intact.

## In scope
- keep `T-032` as the sole active ticket
- ingest the next fresh bundle after this patch is deployed
- verify the dominant latest skip is no longer `daily loss caution paused new symbols`
- verify symbol-level bearish pause evidence can still appear on `BTCUSDC` or another managed risk symbol when warranted
- verify the prior `no-feasible-liquidity-recovery` path does not regress
- confirm the next bundle no longer shows the `59 filtered` managed-symbol-only loop once exposure has already de-risked below the new trigger-aware threshold

## Out of scope
- reopening any DONE ticket
- broad exit-manager redesign outside this caution-threshold slice
- strategy retuning unrelated to defensive-entry release behavior
- a new ticket unless fresh evidence proves this patch hypothesis wrong

## Acceptance criteria
- focused bot-engine tests stay green
- next fresh bundle no longer has global new-symbol pause as the dominant blocker while managed exposure is already low-to-moderate
- next fresh bundle still preserves bearish symbol-level entry pauses where appropriate
- next fresh bundle still preserves the earlier no-feasible recovery fix
- runtime remains `T-032` same-ticket work rather than a new `P0/P1` incident

## Rollback condition
- the next bundle shows this patch reintroduces churn or premature re-risking after giveback
- the next bundle regresses the no-feasible recovery behavior
- the next bundle still shows the same global `daily loss caution paused new symbols` loop at low managed exposure
- fresh evidence reveals a different root cause outside `T-032`

## What capability this moves forward
Moves `Lane A — Runtime stability` directly and sets up `Lane B — Deterministic validation` on the next live bundle.
