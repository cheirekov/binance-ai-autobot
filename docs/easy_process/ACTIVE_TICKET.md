# ACTIVE_TICKET

Last updated: 2026-04-23 11:20 EEST
Owner: PM/BA + Codex

## Ticket
- ID: `T-031`
- Title: `Regime engine v2`
- Status: `IN_PROGRESS`
- Linked support ticket: `T-032`
- Current lane: `Lane A — Strategy quality / regime routing`
- Current incident override: `none active`

## Problem statement
The newest fresh bundles (`autobot-feedback-20260422-100621.tgz`, `autobot-feedback-20260423-080554.tgz`) show the April 20 `T-032` support fix is holding, but repeated `No feasible candidates after policy/exposure filters` is back because active `GRID_BUY_QUOTE` quarantine is not fully suppressing fresh non-home quote families.

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
- A bounded `T-031` slice that makes active `GRID_BUY_QUOTE` quarantine suppress fresh non-home quote families with no actionable sell leg will reduce the repeated no-feasible quote-pressure loop without reopening `T-032`.

## What counts as success
- current runtime blockers are addressed in the correct lane (`T-031`)
- `T-032` remains preserved support only; the next slice stays in `T-031`
- the next fresh bundle shows lower repeated `No feasible candidates after policy/exposure filters`
- active `GRID_BUY_QUOTE` quarantine visibly suppresses fresh non-home quote families, not just symbols with local history
- actionable sell-leg candidates and downside-control support remain reachable
- `T-031` stays the active lane while `T-032` remains bounded support only

## Stop / rollback conditions
- fresh evidence re-establishes a live `P0/P1` incident
- the new slice blocks reachable home-quote / managed sell paths or weakens downside-control reachability
- a board switch is attempted without `docs/TICKET_SWITCH_RETRO.md`
