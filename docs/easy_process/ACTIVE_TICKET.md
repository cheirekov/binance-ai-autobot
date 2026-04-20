# ACTIVE_TICKET

Last updated: 2026-04-20 11:00 EEST
Owner: PM/BA + Codex

## Ticket
- ID: `T-031`
- Title: `Regime engine v2`
- Status: `IN_PROGRESS`
- Linked support ticket: `T-032`
- Current lane: `Lane A — Strategy quality / regime routing`
- Current incident override: `none active`

## Problem statement
The newest fresh bundle (`autobot-feedback-20260420-083837.tgz`) shows the April 17 dust cooldown is active, but repeated `No feasible candidates after policy/exposure filters` still dominates because only non-home quote families remain and the recovery attempt itself is too small to execute.

## Current decision
- Ticket decision: `patch_required`
- Work mode: `PATCH_NOW`
- Process rule:
  - treat `docs/DELIVERY_BOARD.md` and `docs/PM_BA_CHANGELOG.md` as authoritative for ticket status and history
  - treat the latest fresh `docs/RETROSPECTIVE_AUTO.md` / `docs/SESSION_BRIEF.md` pair as authoritative for current runtime evidence
  - treat `docs/easy_process/*` as current working memory only after it reflects the latest fresh bundle

## Hypothesis under test
- A bounded `T-031` slice that seeds `GRID_BUY_QUOTE` quarantine from no-feasible quote-pressure evidence will reduce repeated non-home quote loops without weakening home-quote or managed sell paths.

## What counts as success
- current runtime blockers are addressed in the correct lane (`T-031`)
- `T-032` remains preserved as a support lane rather than being reopened blindly
- the next fresh bundle shows lower repeated `No feasible candidates after policy/exposure filters` churn
- non-home quote families under reserve starvation are visibly parked behind `GRID_BUY_QUOTE` quarantine
- actionable sell-leg candidates and downside-control support remain reachable
- `T-031` stays the active lane while `T-032` remains bounded support only

## Stop / rollback conditions
- fresh evidence re-establishes a live `P0/P1` incident
- the new slice blocks reachable home-quote / managed sell paths or weakens downside-control reachability
- a board switch is attempted without `docs/TICKET_SWITCH_RETRO.md`
