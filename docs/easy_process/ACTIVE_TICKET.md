# ACTIVE_TICKET

Last updated: 2026-03-30 12:45 EEST  
Owner: PM/BA + Codex

## Ticket
- ID: `T-032`
- Title: `Exit manager v2`
- Status: `IN_PROGRESS`
- Current lane: `Lane A — Exit manager / downside control`
- Current incident override: `none active`

## Problem statement
The newest fresh bundle (`autobot-feedback-20260330-082950.tgz`) shows the active blocker is now flat-book caution freeze under `T-032`: while `risk_state=CAUTION`, the book is already almost flat (`total_alloc_pct=0.11`, `activeOrders=0`) but the engine still repeats `daily loss caution paused new symbols` and cannot re-enter.

## Current decision
- Ticket decision: `pivot_and_patch`
- Work mode: `PATCH_NOW`
- Process rule:
  - treat `docs/DELIVERY_BOARD.md` and `docs/PM_BA_CHANGELOG.md` as authoritative for ticket status and history
  - treat the latest fresh `docs/RETROSPECTIVE_AUTO.md` / `docs/SESSION_BRIEF.md` pair as authoritative for current runtime evidence
  - treat `docs/easy_process/*` as current working memory only after it reflects the latest fresh bundle

## Hypothesis under test
- A bounded `T-032` slice that releases `ABS_DAILY_LOSS` caution once managed exposure, countable managed positions, and active orders are effectively flat will stop the engine from boxing itself in without weakening stricter `PROFIT_GIVEBACK` caution behavior.

## What counts as success
- current runtime blockers are addressed in the correct lane (`T-032`)
- `T-031` remains preserved as a support lane rather than being rewritten blindly
- the next fresh bundle reflects lower flat-book `CAUTION` pause churn without reopening funding or downside-control regressions

## Stop / rollback conditions
- fresh evidence re-establishes a live `P0/P1` incident
- the new `T-032` slice reopens new-symbol risk while exposure or active orders are still material
- a board switch is attempted without `docs/TICKET_SWITCH_RETRO.md`
