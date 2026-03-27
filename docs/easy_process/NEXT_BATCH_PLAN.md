# NEXT_BATCH_PLAN

Last updated: 2026-03-27 18:03 EET  
Owner: PM/BA + Codex

## Exact scope
Validate the new defensive BUY-limit cancel gating patch against the next fresh live bundle. Confirm that `DEFENSIVE` no longer cancels resting BUY ladder orders when regime is only `NEUTRAL`/`RANGE` and buys are allowed, while keeping actual caution/grid-guard pauses and the proven no-feasible recovery behavior intact.

## In scope
- keep `T-032` as the sole active ticket
- ingest the next fresh bundle after this patch is deployed
- verify the bundle no longer alternates `grid-ladder-buy` with defensive cancel cleanup on `BTCUSDC` / `ETHUSDC` when buys are allowed
- verify symbol-level or caution-driven BUY pause evidence can still appear when warranted
- verify the prior `no-feasible-liquidity-recovery` path does not regress
- confirm any remaining defensive BUY-order cancel is tied to an actual active buy pause

## Out of scope
- reopening any DONE ticket
- broad exit-manager redesign outside this defensive cancel-gating slice
- strategy retuning unrelated to defensive-entry release behavior
- a new ticket unless fresh evidence proves this patch hypothesis wrong

## Acceptance criteria
- focused bot-engine tests stay green
- next fresh bundle no longer shows repeated defensive BUY-limit cancel/recreate churn while buys are allowed
- next fresh bundle still preserves caution/grid-guard BUY pause evidence where appropriate
- next fresh bundle still preserves the earlier no-feasible recovery fix
- runtime remains `T-032` same-ticket work rather than a new `P0/P1` incident

## Rollback condition
- the next bundle still shows the same defensive cancel/recreate churn
- the next bundle shows this patch reintroduces harmful re-risking after giveback
- the next bundle regresses the no-feasible recovery behavior
- fresh evidence reveals a different root cause outside `T-032`

## What capability this moves forward
Moves `Lane A — Runtime stability` directly and sets up `Lane B — Deterministic validation` on the next live bundle.
