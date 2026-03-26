# ACTIVE_TICKET

Last updated: 2026-03-26 12:13 EET  
Owner: PM/BA + Codex

## Ticket
- ID: `T-032`
- Title: `Exit manager v2`
- Status: `IN_PROGRESS`
- Next behavior lane: `Lane A — Runtime stability`
- Current incident override: `Lane A — Runtime stability`

## Problem statement
`T-032` remains the correct active ticket, but the March 25 guard-pause slice introduced a runtime-regression surface on top of an already boxed-in live state. The latest UI/reporting P0 batch did not restore engine behavior.

## Current decision
- `BATCH_ACTION_CLASS`: `PATCH_NOW`
- Ticket decision: `patch_same_ticket`
- Process rule:
  - treat `docs/easy_process/P0_INCIDENT_SUMMARY.md` and `docs/easy_process/LATEST_BATCH_DECISION.md` as the batch authority
  - treat `docs/SESSION_BRIEF.md` as mixed / non-authoritative for this incident batch

## Hypothesis under test
- the March 25 guard-pause cooldown semantics were materially helping trap the runtime in non-productive `T-032` behavior

## What counts as success
- the engine emits fresh decisions after clean recreate
- the next short bundle shows materially different runtime behavior from the March 26 boxed-in baseline

## Stop / rollback conditions
- the next short fresh bundle still shows unchanged guard/wait loop pressure
- the smallest safe next move becomes rollback toward `cce2322` engine behavior
