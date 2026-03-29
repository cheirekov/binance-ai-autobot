# ACTIVE_TICKET

Last updated: 2026-03-29 12:10 EET  
Owner: PM/BA + Codex

## Ticket
- ID: `T-031`
- Title: `Regime engine v2`
- Status: `IN_PROGRESS`
- Current lane: `Lane C — Strategy quality`
- Current incident override: `none active`

## Problem statement
The newest fresh bundle (`autobot-feedback-20260329-081616.tgz`) shows the active blocker is now inside viable candidate routing for `T-031`: the bot still revisits parked dual-ladder symbols and repeated no-inventory `Fee/edge filter` dead ends as if they were fresh opportunities.

## Current decision
- Ticket decision: `patch_same_ticket`
- Work mode: `PATCH_NOW`
- Process rule:
  - treat `docs/DELIVERY_BOARD.md` and `docs/PM_BA_CHANGELOG.md` as authoritative for ticket status and history
  - treat the latest fresh `docs/RETROSPECTIVE_AUTO.md` / `docs/SESSION_BRIEF.md` pair as authoritative for current runtime evidence
  - treat `docs/easy_process/*` as current working memory only after it reflects the latest fresh bundle

## Hypothesis under test
- A bounded `T-031` slice that suppresses parked dual-ladder symbols and repeated no-inventory fee-edge retries during feasible live selection will reduce dead-end churn without reopening `T-032` downside-control or `T-034` funding regressions.

## What counts as success
- current runtime blockers are addressed in the correct lane (`T-031`)
- `T-032` remains preserved as a support lane rather than being reworked blindly
- the next fresh bundle reflects lower parked-ladder / fee-edge dead-end churn without reopening funding or downside-control regressions

## Stop / rollback conditions
- fresh evidence re-establishes a live `P0/P1` incident
- the new `T-031` slice weakens bear-side protection or reopens a `T-034` funding regression
- a board switch is attempted without `docs/TICKET_SWITCH_RETRO.md`
