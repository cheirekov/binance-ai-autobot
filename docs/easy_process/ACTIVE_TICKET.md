# ACTIVE_TICKET

Last updated: 2026-03-27 12:46 EET  
Owner: PM/BA + Codex

## Ticket
- ID: `T-032`
- Title: `Exit manager v2`
- Status: `IN_PROGRESS`
- Current lane: `Lane A — Runtime stability`
- Current incident override: `none active`

## Problem statement
The March 27 bundle keeps `T-032` active and shows a narrow same-ticket mismatch: `noFeasibleRecovery.enabled=true` is already reached, but the runtime can still skip recovery because the gate only considers raw spendable quote across execution-quote families. That lets liquidity on an unusable quote family suppress recovery even while the active candidate set is boxed in by `quote-spendable-floor`, `quote-spendable`, or `quote-exposure-cap` pressure.

## Current decision
- Ticket decision: `patch_same_ticket`
- Work mode: `PATCH_ALLOWED`
- Process rule:
  - treat `docs/DELIVERY_BOARD.md` and `docs/PM_BA_CHANGELOG.md` as authoritative for ticket status and history
  - treat the March 27 session brief / retrospective as authoritative for current runtime evidence
  - treat `docs/easy_process/*` as current working memory only after it reflects this patch batch

## Hypothesis under test
- if no-feasible recovery is re-enabled by repeated quote-pressure skips, the gate should attempt bounded recovery when rejection samples already prove trapped-liquidity conditions, even if another execution quote still shows raw spendable balance

## What counts as success
- focused tests stay green
- the next live bundle shows `gateAttempted=true` under renewed quote-pressure loops
- the next live bundle produces either a bounded recovery sell or a non-null `attemptedReason`

## Stop / rollback conditions
- fresh evidence re-establishes a live `P0/P1` incident
- the next bundle shows harmful recovery churn
- the next bundle proves the boxed-in behavior is caused by a different subsystem outside `T-032`
