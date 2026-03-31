# ACTIVE_TICKET

Last updated: 2026-03-31 11:55 EEST  
Owner: PM/BA + Codex

## Ticket
- ID: `T-032`
- Title: `Exit manager v2`
- Status: `IN_PROGRESS`
- Current lane: `Lane A — Exit manager / downside control`
- Current incident override: `none active`

## Problem statement
The newest fresh bundle (`autobot-feedback-20260331-084549.tgz`) shows the March 30 caution-unwind slice reached the market, but the active blocker moved again: after those sells, a stop-loss-cooled residual symbol (`NOMUSDC`) still anchors global `CAUTION` even though `activeOrders=0` and total allocation is only `0.25%`.

## Current decision
- Ticket decision: `patch_same_ticket`
- Work mode: `PATCH_NOW`
- Process rule:
  - treat `docs/DELIVERY_BOARD.md` and `docs/PM_BA_CHANGELOG.md` as authoritative for ticket status and history
  - treat the latest fresh `docs/RETROSPECTIVE_AUTO.md` / `docs/SESSION_BRIEF.md` pair as authoritative for current runtime evidence
  - treat `docs/easy_process/*` as current working memory only after it reflects the latest fresh bundle

## Hypothesis under test
- A bounded `T-032` slice that excludes stop-loss-cooled residual positions from the non-`PROFIT_GIVEBACK` caution anchor count will stop global `CAUTION` from staying paused after active orders are already gone, without weakening the March 30 caution-unwind behavior or the earlier flat-book thaw.

## What counts as success
- current runtime blockers are addressed in the correct lane (`T-032`)
- `T-031` remains preserved as a support lane rather than being rewritten blindly
- the next fresh bundle reflects lower `Post stop-loss cooldown active` / `daily loss caution paused new symbols` churn and fresher decision timestamps without reopening funding or downside-control regressions

## Stop / rollback conditions
- fresh evidence re-establishes a live `P0/P1` incident
- the new `T-032` slice reopens new-symbol risk while exposure or active orders are still material
- a board switch is attempted without `docs/TICKET_SWITCH_RETRO.md`
