# ACTIVE_TICKET

Last updated: 2026-04-28 13:50 EEST
Owner: PM/BA + Codex

## Ticket
- ID: `T-031`
- Title: `Regime engine v2`
- Status: `IN_PROGRESS`
- Linked support ticket: `T-032`
- Current lane: `Lane A — Strategy quality / regime routing`
- Current incident override: `none active`

## Problem statement
The newest fresh bundle (`autobot-feedback-20260428-102858.tgz`) shows the April 27 patch reduced the dominant no-feasible loop (`70 -> 59`) but did not clear it. Runtime is `NORMAL`, `activeOrders=0`, recovery dust is below exchange minimums, and stale home-quote `GRID_SELL_NOT_ACTIONABLE` storm locks still block actionability while live base exposure is dust-sized.

## Current decision
- Ticket decision: `patch_required`
- Work mode: `PATCH_NOW`
- Linked-support decision:
  - keep `T-032` preserved only; downside-control gating is no longer the immediate blocker.
- Process rule:
  - treat `docs/DELIVERY_BOARD.md` and `docs/PM_BA_CHANGELOG.md` as authoritative for ticket status and history
  - treat the latest fresh `docs/RETROSPECTIVE_AUTO.md` / `docs/SESSION_BRIEF.md` pair as authoritative for current runtime evidence
  - treat `docs/easy_process/*` as current working memory only after it reflects the latest fresh bundle

## Hypothesis under test
- A bounded `T-031` slice that lets normal-mode dust home-quote candidates pass stale sell-storm locks, while parking recovery min-order dust for hours, will restore actionability without reopening `T-032`.

## What counts as success
- current runtime blockers are addressed in the correct lane (`T-031`)
- `T-032` remains preserved support only; the next slice stays in `T-031`
- the next fresh bundle shows lower repeated `No feasible candidates after policy/exposure filters`
- no-feasible recovery no longer retries the same below-minimum `TRXBTC` dust candidate on a 20-minute cadence
- home-quote candidates progress beyond stale dust sell-storm locks when risk is `NORMAL` and active orders are zero
- downside-control support remains reachable
- `T-031` stays the active lane while `T-032` remains bounded support only

## Stop / rollback conditions
- fresh evidence re-establishes a live `P0/P1` incident
- the new slice blocks reachable home-quote / managed sell paths or weakens downside-control reachability
- a board switch is attempted without `docs/TICKET_SWITCH_RETRO.md`
