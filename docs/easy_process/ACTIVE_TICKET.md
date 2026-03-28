# ACTIVE_TICKET

Last updated: 2026-03-28 23:45 EET  
Owner: PM/BA + Codex

## Ticket
- ID: `T-031`
- Title: `Regime engine v2`
- Status: `IN_PROGRESS`
- Current lane: `Lane C — Strategy quality`
- Current incident override: `none active`

## Problem statement
The newest fresh bundle (`autobot-feedback-20260328-202730.tgz`) shows the runtime is no longer dominated by `T-032` failure modes. The current top blockers are strategy-quality signals (`Fee/edge filter`, parked-ladder waiting), while code audit shows the regime engine is still using simpler fixed thresholds and a regime-agnostic fee floor.

## Current decision
- Ticket decision: `pivot_active_ticket`
- Work mode: `PATCH_NOW`
- Process rule:
  - treat `docs/DELIVERY_BOARD.md` and `docs/PM_BA_CHANGELOG.md` as authoritative for ticket status and history
  - treat the latest fresh `docs/RETROSPECTIVE_AUTO.md` / `docs/SESSION_BRIEF.md` pair as authoritative for current runtime evidence
  - treat `docs/easy_process/*` as current working memory only after it reflects the latest fresh bundle

## Hypothesis under test
- A bounded `T-031` slice that scores `SPOT_GRID` candidates by the execution lane the engine would actually use will be more valuable than another `T-032` proof-only cycle, while preserving current downside-control runtime.

## What counts as success
- current runtime blockers are addressed in the correct lane (`T-031`)
- `T-032` remains preserved as a support lane rather than being reworked blindly
- the next fresh bundle reflects changed strategy behavior without reopening funding or downside-control regressions

## Stop / rollback conditions
- fresh evidence re-establishes a live `P0/P1` incident
- the new `T-031` slice weakens bear-side protection or reopens a `T-034` funding regression
- a board switch is attempted without `docs/TICKET_SWITCH_RETRO.md`
