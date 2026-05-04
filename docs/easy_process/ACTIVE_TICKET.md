# ACTIVE_TICKET

Last updated: 2026-05-04 11:50 EEST
Owner: PM/BA + Codex

## Ticket
- ID: `T-031`
- Title: `Regime engine v2`
- Status: `IN_PROGRESS`
- Linked support ticket: `T-032`
- Current lane: `Lane A — Strategy quality / regime routing with bounded downside-control support`
- Current incident override: `P1 restored-trading fee/giveback churn`

## Problem statement
The newest fresh bundle (`autobot-feedback-20260504-084256.tgz`) shows the April 30 no-action dust sell-leg loop cleared into real trading, but the run ended with wallet drawdown, high fees/churn, and `PROFIT_GIVEBACK` daily-loss protection.

## Current decision
- Ticket decision: `patch_ready`
- Work mode: `PATCH_NOW`
- Linked-support decision:
  - allow bounded `T-032` support because fee-aware daily-loss/giveback protection is required before the next long run.
- Process rule:
  - treat `docs/DELIVERY_BOARD.md` and `docs/PM_BA_CHANGELOG.md` as authoritative for ticket status and history.
  - treat the latest fresh `docs/RETROSPECTIVE_AUTO.md` / `docs/SESSION_BRIEF.md` pair as authoritative for runtime evidence.
  - treat `docs/easy_process/*` as current working memory only after it reflects the latest fresh bundle.

## Hypothesis under test
- A bounded `T-031`/support slice that makes daily-loss/giveback accounting fee-aware and pauses fresh symbols at severe near-halt loss-budget usage will reduce churn without weakening reachable sell/unwind paths.

## What counts as success
- daily-loss/profit-giveback details reflect fee-aware realized PnL.
- severe near-halt `CAUTION` does not open fresh symbols.
- the next fresh bundle shows explicit guard/fee/quote/candidate behavior rather than hidden fee churn.
- April 30 reachable grid BUY progression remains preserved once the loss window clears.

## Stop / rollback conditions
- fresh evidence re-establishes a live `P0/P1` downside-control incident.
- the new slice buys while severe daily-loss protection should block fresh exposure.
- the new slice blocks reachable home-quote / managed sell paths or weakens downside-control reachability.
- a board switch is attempted without `docs/TICKET_SWITCH_RETRO.md`.
