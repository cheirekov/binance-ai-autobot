# NEXT_BATCH_PLAN

Last updated: 2026-03-27 12:46 EET  
Owner: PM/BA + Codex

## Exact scope
Validate the March 27 `T-032` recovery-gate patch against the next fresh live bundle. Confirm that repeated no-feasible pressure now produces either a bounded recovery sell or an explicit recovery-attempt reason, without widening into unrelated strategy work.

## In scope
- keep `T-032` as the sole active ticket
- ingest the next fresh bundle after this patch is deployed
- verify `noFeasibleRecovery.gateAttempted=true` when quote-pressure rejection stages recur
- verify `pressureDetected=true` when the rejection trail is quote-spendable or quote-exposure-cap driven
- confirm the next bundle shows either:
  - a `no-feasible-liquidity-recovery` trade, or
  - a non-null `attemptedReason` explaining why recovery still did not fire

## Out of scope
- reopening any DONE ticket
- broad exit-manager redesign outside this gate slice
- strategy retuning unrelated to no-feasible recovery
- a new ticket unless fresh evidence proves this patch hypothesis wrong

## Acceptance criteria
- focused bot-engine tests stay green
- next fresh bundle no longer reports the old combination `enabled=true` with `attemptedSymbol=null` and no gate context
- runtime remains `T-032` same-ticket work rather than a new `P0/P1` incident

## Rollback condition
- the next bundle shows this patch triggers harmful churn or unnecessary recovery sells in healthy-liquidity conditions
- the next bundle still proves the bot is boxed in while `gateAttempted=false`
- fresh evidence reveals a different root cause outside `T-032`

## What capability this moves forward
Moves `Lane A — Runtime stability` directly and sets up `Lane B — Deterministic validation` on the next live bundle.
