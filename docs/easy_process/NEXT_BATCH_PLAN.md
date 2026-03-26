# NEXT_BATCH_PLAN

Last updated: 2026-03-26 15:16 EET  
Owner: PM/BA + Codex

## Exact scope
Deploy the no-feasible recovery patch, clean-recreate the runtime, and confirm from one short fresh bundle that the bot can progress past low-spendable-quote deadlock instead of staying boxed in after restart.

## In scope
- deploy the patched bot-engine runtime
- preserve current `state.json` and config; do not wipe state unless the patch itself proves unsafe
- clean-recreate the runtime before collecting evidence
- collect one short fresh bundle after recreate
- inspect recent decisions, not only the cumulative top-skip table
- decide whether `T-032` continues cleanly or needs another same-ticket recovery slice

## Out of scope
- dashboard-only or reporting-only work
- broad `T-032` strategy redesign
- reopening `T-031` or `T-034`
- AI-lane or auth/UI work

## Acceptance criteria
- the runtime emits fresh decisions after clean recreate
- when spendable quote after reserve remains low, `noFeasibleRecovery` becomes enabled or a `no-feasible-liquidity-recovery` sell occurs
- otherwise the recent decision mix changes materially away from pure post-restart `No feasible` / `No eligible` idling
- no dominant funding regression returns

## Rollback condition
- this patch itself introduces validation failure, new churn, or a fresh funding regression
- do not blind-rollback to `cce2322` only because the cumulative guard-pause counts remain high; require fresh post-patch evidence of actual regression first

## What capability this moves forward
Moves `Lane A — Runtime stability` forward by restoring an existing liquidity-recovery path on the live engine surface and making the next short bundle decisively interpretable.
