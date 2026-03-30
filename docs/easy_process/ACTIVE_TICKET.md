# ACTIVE_TICKET

Last updated: 2026-03-30 17:40 EEST  
Owner: PM/BA + Codex

## Ticket
- ID: `T-032`
- Title: `Exit manager v2`
- Status: `IN_PROGRESS`
- Current lane: `Lane A — Exit manager / downside control`
- Current incident override: `none active`

## Problem statement
The newest fresh bundle (`autobot-feedback-20260330-135922.tgz`) shows the active blocker is now materially exposed `ABS_DAILY_LOSS` caution under `T-032`: the flat-book thaw slice is no longer the main issue, but the engine still repeats `Daily loss caution paused GRID BUY leg` on managed symbols instead of reaching caution unwind.

## Current decision
- Ticket decision: `patch_same_ticket`
- Work mode: `PATCH_NOW`
- Process rule:
  - treat `docs/DELIVERY_BOARD.md` and `docs/PM_BA_CHANGELOG.md` as authoritative for ticket status and history
  - treat the latest fresh `docs/RETROSPECTIVE_AUTO.md` / `docs/SESSION_BRIEF.md` pair as authoritative for current runtime evidence
  - treat `docs/easy_process/*` as current working memory only after it reflects the latest fresh bundle

## Hypothesis under test
- A bounded `T-032` slice that lets `ABS_DAILY_LOSS` caution trigger best-effort unwind once managed exposure is still materially high will reduce repeated managed-symbol buy-pause loops without weakening stricter `PROFIT_GIVEBACK` caution behavior or the earlier flat-book thaw.

## What counts as success
- current runtime blockers are addressed in the correct lane (`T-032`)
- `T-031` remains preserved as a support lane rather than being rewritten blindly
- the next fresh bundle reflects lower managed-symbol `Daily loss caution paused GRID BUY leg` churn and visible caution-unwind reachability without reopening funding or downside-control regressions

## Stop / rollback conditions
- fresh evidence re-establishes a live `P0/P1` incident
- the new `T-032` slice reopens new-symbol risk while exposure or active orders are still material
- a board switch is attempted without `docs/TICKET_SWITCH_RETRO.md`
