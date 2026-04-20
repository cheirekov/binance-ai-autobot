# ACTIVE_TICKET

Last updated: 2026-04-20 18:20 EEST
Owner: PM/BA + Codex

## Ticket
- ID: `T-031`
- Title: `Regime engine v2`
- Status: `IN_PROGRESS`
- Linked support ticket: `T-032`
- Current lane: `Lane A — Strategy quality / regime routing`
- Current incident override: `none active`

## Problem statement
The newest fresh bundle (`autobot-feedback-20260420-145411.tgz`) shows the April 20 `T-031` quote-pressure quarantine deploy is live, but runtime is still trapped in `PROFIT_GIVEBACK` `HALT` because managed exposure is being counted from historical managed positions that are no longer fully unwindable in balances.

## Current decision
- Ticket decision: `patch_required`
- Work mode: `PATCH_NOW`
- Linked-support decision:
  - allow one bounded `T-032` support slice in the same batch because downside-control gating is now the immediate blocker to validating the active `T-031` runtime.
- Process rule:
  - treat `docs/DELIVERY_BOARD.md` and `docs/PM_BA_CHANGELOG.md` as authoritative for ticket status and history
  - treat the latest fresh `docs/RETROSPECTIVE_AUTO.md` / `docs/SESSION_BRIEF.md` pair as authoritative for current runtime evidence
  - treat `docs/easy_process/*` as current working memory only after it reflects the latest fresh bundle

## Hypothesis under test
- A bounded linked-support `T-032` slice that clips `PROFIT_GIVEBACK` managed exposure to base inventory still present in balances will stop false `HALT` persistence without reopening the old April 17 / April 20 `T-031` loops.

## What counts as success
- current runtime blockers are addressed in the correct lane (`T-031`)
- `T-032` remains bounded support only, but the linked-support slice clears the immediate false-`HALT` blocker
- the next fresh bundle no longer stays latched in `PROFIT_GIVEBACK` `HALT` just because historical managed base exposure was already spent elsewhere
- the April 20 `GRID_BUY_QUOTE` quarantine behavior remains preserved
- actionable sell-leg candidates and downside-control support remain reachable
- `T-031` stays the active lane while `T-032` remains bounded support only

## Stop / rollback conditions
- fresh evidence re-establishes a live `P0/P1` incident
- the new slice blocks reachable home-quote / managed sell paths or weakens downside-control reachability
- a board switch is attempted without `docs/TICKET_SWITCH_RETRO.md`
