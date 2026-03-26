# ACTIVE_TICKET

Last updated: 2026-03-26 11:44 EET  
Owner: PM/BA + Codex

## Ticket
- ID: `T-032`
- Title: `Exit manager v2`
- Status: `IN_PROGRESS`
- Next behavior lane: `Lane B — Deterministic validation`
- Current incident override: `Lane E — State/process hygiene`

## Problem statement
`T-032` remains the correct active trading-behavior ticket, but the repo entered a P0 non-credibility state. The March 25 guard-pause slice was already live in the March 26 fresh bundle and did not restore credible runtime behavior, while telemetry/process surfaces were also misleading.

## Current decision
- `BATCH_ACTION_CLASS`: `OPERATIONS_ADJUSTMENT`
- Ticket decision: `continue_same_ticket`
- Process rule:
  - treat [P0_INCIDENT_SUMMARY.md](/home/yc/work/binance-ai-autobot/docs/easy_process/P0_INCIDENT_SUMMARY.md) and [LATEST_BATCH_DECISION.md](/home/yc/work/binance-ai-autobot/docs/easy_process/LATEST_BATCH_DECISION.md) as the batch authority
  - do not use `docs/SESSION_BRIEF.md` as sole authority for this incident batch
  - return to deterministic `T-032` proof after this ops adjustment is deployed

## Hypothesis under test
The unresolved `T-032` behavior is one of:
- the March 25 guard-pause `COOLDOWN` is a real regression that blocks unwind
- a smaller non-blocking guard-pause patch is safer than rollback
- the boxed-in state is strategy-consistent and `T-032` should pivot

## What counts as success
- post-adjustment telemetry is trustworthy again
- deterministic validation proves rollback vs replacement patch vs pivot
- PM/BA can make the next behavior decision from proof

## Stop / rollback conditions
- the March 25 guard-pause `COOLDOWN` is shown to preempt the intended unwind path
- fresh post-adjustment evidence shows a different dominant runtime problem
