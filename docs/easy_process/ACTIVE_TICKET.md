# ACTIVE_TICKET

Last updated: 2026-03-27 14:40 EET  
Owner: PM/BA + Codex

## Ticket
- ID: `T-032`
- Title: `Exit manager v2`
- Status: `IN_PROGRESS`
- Current lane: `Lane A — Runtime stability`
- Current incident override: `none active`

## Problem statement
The newest March 27 bundle keeps `T-032` active and closes the prior recovery-gate hypothesis: the bot now shows a real `no-feasible-liquidity-recovery` sell and then de-risks the book heavily. The next same-ticket mismatch is that profit-giveback `CAUTION` still pauses all new symbols while managed exposure is only about `18%`, even though the remaining risky symbol already has its own bearish BUY pause.

## Current decision
- Ticket decision: `patch_same_ticket`
- Work mode: `PATCH_ALLOWED`
- Process rule:
  - treat `docs/DELIVERY_BOARD.md` and `docs/PM_BA_CHANGELOG.md` as authoritative for ticket status and history
  - treat the March 27 session brief / retrospective as authoritative for current runtime evidence
  - treat `docs/easy_process/*` as current working memory only after it reflects this patch batch

## Hypothesis under test
- once profit-giveback `CAUTION` has already de-risked the book to low-to-moderate managed exposure, the bot should stop globally pausing all new symbols and rely on symbol-level bearish pauses for the remaining risky managed position

## What counts as success
- focused tests stay green
- the next live bundle no longer shows `daily loss caution paused new symbols` as the dominant loop
- the next live bundle still preserves symbol-level bearish BUY pause evidence where warranted
- the next live bundle does not regress the earlier no-feasible recovery sell path

## Stop / rollback conditions
- fresh evidence re-establishes a live `P0/P1` incident
- the next bundle shows harmful churn or premature re-risking
- the next bundle regresses no-feasible recovery behavior
- the next bundle proves the boxed-in behavior is caused by a different subsystem outside `T-032`
