# ACTIVE_TICKET

Last updated: 2026-03-27 18:03 EET  
Owner: PM/BA + Codex

## Ticket
- ID: `T-032`
- Title: `Exit manager v2`
- Status: `IN_PROGRESS`
- Current lane: `Lane A — Runtime stability`
- Current incident override: `none active`

## Problem statement
The newest March 27 bundle still keeps `T-032` active, but the automatic `pivot_required` result is too coarse on its own. Raw decisions show that the engine is already placing BUY ladder orders and then canceling them in `DEFENSIVE` mode even while regime is only `NEUTRAL`; this defensive cancel/recreate churn is the current same-ticket defect.

## Current decision
- Ticket decision: `patch_same_ticket`
- Work mode: `PATCH_ALLOWED`
- Process rule:
  - treat `docs/DELIVERY_BOARD.md` and `docs/PM_BA_CHANGELOG.md` as authoritative for ticket status and history
  - treat the March 27 session brief / retrospective as authoritative for current runtime evidence
  - treat `docs/easy_process/*` as current working memory only after it reflects this patch batch

## Hypothesis under test
- once defensive BUY-order cleanup is limited to true buy-pause states, `DEFENSIVE` can keep valid resting ladder orders on `BTCUSDC` / `ETHUSDC` instead of canceling and recreating them every tick

## What counts as success
- focused tests stay green
- the next live bundle no longer shows repeated defensive BUY-limit cancel/recreate churn while buys are allowed
- the next live bundle still preserves actual caution/grid-guard BUY pause evidence where warranted
- the next live bundle does not regress the earlier no-feasible recovery sell path

## Stop / rollback conditions
- fresh evidence re-establishes a live `P0/P1` incident
- the next bundle still shows the same defensive cancel/recreate churn
- the next bundle shows harmful churn or premature re-risking
- the next bundle regresses no-feasible recovery behavior
- the next bundle proves the boxed-in behavior is caused by a different subsystem outside `T-032`
