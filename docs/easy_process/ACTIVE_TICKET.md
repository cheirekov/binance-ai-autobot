# ACTIVE_TICKET

Last updated: 2026-04-07 21:20 EEST  
Owner: PM/BA + Codex

## Ticket
- ID: `T-031`
- Title: `Regime engine v2`
- Status: `IN_PROGRESS`
- Linked support ticket: `T-032`
- Current lane: `Lane A — Strategy quality / regime routing`
- Current incident override: `none active`

## Problem statement
The newest fresh bundle (`autobot-feedback-20260407-181242.tgz`) shows `T-032` remains support-only. The April 7 morning patch reduced the paired `ETHUSDC` dead-end loop, but the same home-quote dust family still resurfaces through repeated solo `Grid sell leg not actionable yet` retries.

## Current decision
- Ticket decision: `patch_required`
- Work mode: `PATCH_NOW`
- Process rule:
  - treat `docs/DELIVERY_BOARD.md` and `docs/PM_BA_CHANGELOG.md` as authoritative for ticket status and history
  - treat the latest fresh `docs/RETROSPECTIVE_AUTO.md` / `docs/SESSION_BRIEF.md` pair as authoritative for current runtime evidence
  - treat `docs/easy_process/*` as current working memory only after it reflects the latest fresh bundle

## Hypothesis under test
- A bounded `T-031` slice that re-applies the existing `GRID_SELL_NOT_ACTIONABLE` cooldown after a higher threshold of repeated solo non-actionable sell-leg retries will preserve the earlier paired-loop reduction while stopping the same residual family from resurfacing forever.

## What counts as success
- current runtime blockers are addressed in the correct lane (`T-031`)
- `T-032` remains preserved as a support lane rather than being reopened blindly
- the next fresh bundle reflects lower repeated solo `Grid sell leg not actionable yet` churn on the same residual family without reopening funding or downside-control regressions

## Stop / rollback conditions
- fresh evidence re-establishes a live `P0/P1` incident
- the new slice reopens repeated impossible sell-leg churn on materially actionable home-quote inventory
- a board switch is attempted without `docs/TICKET_SWITCH_RETRO.md`
