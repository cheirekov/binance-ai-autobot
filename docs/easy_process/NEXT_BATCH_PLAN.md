# NEXT_BATCH_PLAN

Last updated: 2026-03-26 18:47 EET  
Owner: PM/BA + Codex

## Exact scope
Deploy the amended no-feasible recovery patch, clean-recreate the runtime, and confirm from one short fresh bundle that the bot can actually arm liquidity recovery under the live reserve-starvation pattern seen in `autobot-feedback-20260326-164157.tgz`.

## In scope
- deploy the patched bot-engine runtime
- preserve current `state.json` and config; do not wipe state unless the patch itself proves unsafe
- clean-recreate the runtime before collecting evidence
- collect one short fresh bundle after recreate
- inspect recent `noFeasibleRecovery` details, not only the cumulative top-skip table
- decide whether `T-032` continues cleanly or needs one more same-ticket reachability slice

## Out of scope
- dashboard-only or reporting-only work
- broad `T-032` strategy redesign
- reopening `T-031` or `T-034`
- AI-lane or auth/UI work

## Acceptance criteria
- the runtime emits fresh decisions after clean recreate
- repeated no-feasible skips across the live cadence now make `noFeasibleRecovery` eligible
- low spendable quote after reserve now uses the same funding floor for recovery as for candidate feasibility
- at least one of:
  - `no-feasible-liquidity-recovery`
  - `noFeasibleRecovery.enabled=true`
  - materially changed recent decision mix away from pure post-restart idling
- no dominant funding or churn regression returns

## Rollback condition
- this amendment introduces validation failure, repeated unnecessary recovery sells, or a fresh funding regression
- do not broad-rollback before `3a6a14f` only because the cumulative guard-pause counts remain high; require fresh post-patch evidence of over-fire or regression first

## What capability this moves forward
Moves `Lane A — Runtime stability` forward by aligning the engine’s starvation-recovery trigger with the production funding floor and production decision cadence.
