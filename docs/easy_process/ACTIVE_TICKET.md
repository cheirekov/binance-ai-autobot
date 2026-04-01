# ACTIVE_TICKET

Last updated: 2026-04-01 18:17 EEST  
Owner: PM/BA + Codex

## Ticket
- ID: `T-031`
- Title: `Regime engine v2`
- Status: `IN_PROGRESS`
- Current lane: `Lane A — Strategy quality / regime routing`
- Current incident override: `none active`

## Problem statement
The newest fresh bundle (`autobot-feedback-20260401-150741.tgz`) shows `T-032` is no longer the dominant blocker. The active problem is repeated guarded cross-quote churn (`BNBETH`, `SOLETH`, `TRXETH`) after only the sell ladder is parked, plus residual cross-quote fee-edge retries.

## Current decision
- Ticket decision: `pivot_and_patch`
- Work mode: `PATCH_NOW`
- Process rule:
  - treat `docs/DELIVERY_BOARD.md` and `docs/PM_BA_CHANGELOG.md` as authoritative for ticket status and history
  - treat the latest fresh `docs/RETROSPECTIVE_AUTO.md` / `docs/SESSION_BRIEF.md` pair as authoritative for current runtime evidence
  - treat `docs/easy_process/*` as current working memory only after it reflects the latest fresh bundle

## Hypothesis under test
- A bounded `T-031` slice that cools guarded sell-ladder symbols after the sell leg is already parked will stop the engine from reselecting those cross-quote dead ends, without weakening `T-032` downside control or `T-034` funding stability.

## What counts as success
- current runtime blockers are addressed in the correct lane (`T-031`)
- `T-032` remains preserved as a support lane rather than being reopened blindly
- the next fresh bundle reflects lower `Grid guard paused BUY leg` / `Grid waiting for ladder slot or inventory` churn on guarded cross-quote symbols without reopening funding or downside-control regressions

## Stop / rollback conditions
- fresh evidence re-establishes a live `P0/P1` incident
- the new `T-032` slice reopens new-symbol risk while exposure or active orders are still material
- a board switch is attempted without `docs/TICKET_SWITCH_RETRO.md`
