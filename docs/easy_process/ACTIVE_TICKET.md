# ACTIVE_TICKET

Last updated: 2026-04-02 19:36 EEST  
Owner: PM/BA + Codex

## Ticket
- ID: `T-031`
- Title: `Regime engine v2`
- Status: `IN_PROGRESS`
- Linked support ticket: `T-032`
- Current lane: `Lane A — Strategy quality / regime routing`
- Current incident override: `none active`

## Problem statement
The newest fresh bundle (`autobot-feedback-20260402-162840.tgz`) shows `T-032` remains support-only. The active problem is no longer only selection deadlock: cooled home-quote dust residuals can re-enter selection, but they are still hard-blocked again by the raw post-selection protection-lock gate.

## Current decision
- Ticket decision: `patch_required`
- Work mode: `PATCH_NOW`
- Process rule:
  - treat `docs/DELIVERY_BOARD.md` and `docs/PM_BA_CHANGELOG.md` as authoritative for ticket status and history
  - treat the latest fresh `docs/RETROSPECTIVE_AUTO.md` / `docs/SESSION_BRIEF.md` pair as authoritative for current runtime evidence
  - treat `docs/easy_process/*` as current working memory only after it reflects the latest fresh bundle

## Hypothesis under test
- A bounded `T-031` slice that applies the same `GRID_SELL_NOT_ACTIONABLE` dust exception at the post-selection execution gate will let cooled home-quote candidates proceed consistently, without weakening `T-032` downside control or `T-034` funding stability.

## What counts as success
- current runtime blockers are addressed in the correct lane (`T-031`)
- `T-032` remains preserved as a support lane rather than being reopened blindly
- the next fresh bundle reflects lower `No feasible candidates after policy/exposure filters` churn and fewer immediate post-selection cooldown skips without reopening funding or downside-control regressions

## Stop / rollback conditions
- fresh evidence re-establishes a live `P0/P1` incident
- the new slice reopens repeated impossible sell-leg churn on materially actionable home-quote inventory
- a board switch is attempted without `docs/TICKET_SWITCH_RETRO.md`
