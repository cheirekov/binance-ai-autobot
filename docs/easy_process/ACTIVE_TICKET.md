# ACTIVE_TICKET

Last updated: 2026-04-12 21:20 EEST  
Owner: PM/BA + Codex

## Ticket
- ID: `T-031`
- Title: `Regime engine v2`
- Status: `IN_PROGRESS`
- Linked support ticket: `T-032`
- Current lane: `Lane A — Strategy quality / regime routing`
- Current incident override: `none active`

## Problem statement
The newest fresh bundle (`autobot-feedback-20260412-180152.tgz`) shows `T-031` remains the active lane, but a linked-support `T-032` edge case now blocks validation: after de-risking to ~0.3% managed exposure with zero active orders, `ABS_DAILY_LOSS` `CAUTION` still ends on `Skip: No feasible candidates: daily loss caution paused new symbols (60 filtered)`.

## Current decision
- Ticket decision: `patch_required`
- Work mode: `PATCH_NOW`
- Process rule:
  - treat `docs/DELIVERY_BOARD.md` and `docs/PM_BA_CHANGELOG.md` as authoritative for ticket status and history
  - treat the latest fresh `docs/RETROSPECTIVE_AUTO.md` / `docs/SESSION_BRIEF.md` pair as authoritative for current runtime evidence
  - treat `docs/easy_process/*` as current working memory only after it reflects the latest fresh bundle

## Hypothesis under test
- A bounded linked-support `T-032` slice that releases `ABS_DAILY_LOSS` `CAUTION` once the book is already near-flat and orderless will let `T-031` resume candidate-quality validation without reopening downside-control regressions.

## What counts as success
- current runtime blockers are addressed in the correct lane (`T-031`)
- `T-032` remains preserved as a support lane rather than being reopened blindly
- the next fresh bundle reflects newer post-caution candidate activity instead of near-flat `daily loss caution paused new symbols`
- `T-031` stays the active lane while `T-032` remains bounded support only

## Stop / rollback conditions
- fresh evidence re-establishes a live `P0/P1` incident
- the new slice reopens repeated impossible sell-leg churn on materially actionable home-quote inventory
- a board switch is attempted without `docs/TICKET_SWITCH_RETRO.md`
