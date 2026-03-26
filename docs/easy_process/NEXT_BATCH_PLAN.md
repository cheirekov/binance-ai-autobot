# NEXT_BATCH_PLAN

Last updated: 2026-03-26 11:44 EET  
Owner: PM/BA + Codex

## Exact scope
Run a post-adjustment `T-032` proof batch that separates truthful runtime freshness from the unresolved guard-pause / unwind behavior.

## In scope
- confirm after deployment that decision timestamps, run-stats freshness, and rolling 24h `daily_net_usdt` are no longer misleading
- reproduce the March 26 boxed-in runtime conditions from `autobot-feedback-20260326-090817.tgz`
- add deterministic coverage for guard-pause `COOLDOWN` interaction with next-tick symbol blocking and `grid-guard-defensive-unwind`
- decide from proof whether the narrow March 25 guard-pause slice should be `ROLLBACK_NOW` or replaced by a smaller non-blocking patch

## Out of scope
- another long live run from stale or unreconciled process state
- a broad `T-032` strategy rewrite before the guard-pause interaction is proven
- reopening `T-031` or `T-034`
- AI-lane, auth, or unrelated UI work

## Acceptance criteria
- one short post-adjustment bundle shows fresh state timestamps and a non-misleading rolling 24h `daily_net_usdt`
- deterministic validation proves one of:
  - the March 25 guard-pause `COOLDOWN` is a real regression and should be rolled back
  - a smaller non-blocking guard-pause patch is safer than rollback
  - the remaining boxed-in behavior is strategy-consistent and the ticket should pivot
- PM/BA can choose the next single action from proof: `ROLLBACK_NOW`, `PATCH_NOW`, or `PIVOT_TICKET`

## Rollback condition
- the guard-pause `COOLDOWN` is shown to block or preempt the intended unwind path
- post-adjustment evidence still shows strategy-idle behavior with no benefit from the March 25 slice

## What capability this moves forward
Moves `Lane B — Deterministic validation` forward while preserving the operator-trust gains from this `Lane E` recovery batch.
