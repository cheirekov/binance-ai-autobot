# ACTIVE_TICKET

Last updated: 2026-03-26 18:47 EET  
Owner: PM/BA + Codex

## Ticket
- ID: `T-032`
- Title: `Exit manager v2`
- Status: `IN_PROGRESS`
- Next behavior lane: `Lane A — Runtime stability`
- Current incident override: `Lane A — Runtime stability`

## Problem statement
`T-032` remains the correct active ticket. The latest fresh bundle on `3a6a14f` proves the previous no-feasible patch deployed, but the runtime is still boxed into `No feasible` / `No eligible` post-restart behavior because the remaining recovery trigger is too strict for live funding floors and live cadence.

## Current decision
- `BATCH_ACTION_CLASS`: `PATCH_NOW`
- Ticket decision: `patch_same_ticket`
- Process rule:
  - treat `docs/easy_process/P0_INCIDENT_SUMMARY.md` and `docs/easy_process/LATEST_BATCH_DECISION.md` as the batch authority
  - treat `docs/SESSION_BRIEF.md` and `docs/RETROSPECTIVE_AUTO.md` as fresh evidence, but not as the final diagnosis

## Hypothesis under test
- the live runtime remains boxed because the no-feasible liquidity-recovery path still under-triggers: its repeat window is too tight and its quote-liquidity threshold is too low

## What counts as success
- the engine emits fresh decisions after clean recreate
- the next short bundle shows `noFeasibleRecovery` becoming eligible again or a `no-feasible-liquidity-recovery` trade
- the recent decision mix changes materially away from pure post-restart idling

## Stop / rollback conditions
- this patch introduces a fresh validation/runtime regression
- if the next short bundle still shows no progression after recreate, reopen same-ticket sell-side reachability / loop-continuity investigation before any broad rollback
