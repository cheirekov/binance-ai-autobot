# ACTIVE_TICKET

Last updated: 2026-04-15 19:55 EEST
Owner: PM/BA + Codex

## Ticket
- ID: `T-031`
- Title: `Regime engine v2`
- Status: `IN_PROGRESS`
- Linked support ticket: `T-032`
- Current lane: `Lane A — Strategy quality / regime routing`
- Current incident override: `none active`

## Problem statement
The newest fresh bundle (`autobot-feedback-20260415-164608.tgz`) shows the April 15 dust-storm mitigation moved the blocker, but global `FEE_EDGE` quarantine still lets fresh non-home-quote symbols rotate into repeated fee-edge skips because suppression is too symbol-local.

## Current decision
- Ticket decision: `patch_required`
- Work mode: `PATCH_NOW`
- Process rule:
  - treat `docs/DELIVERY_BOARD.md` and `docs/PM_BA_CHANGELOG.md` as authoritative for ticket status and history
  - treat the latest fresh `docs/RETROSPECTIVE_AUTO.md` / `docs/SESSION_BRIEF.md` pair as authoritative for current runtime evidence
  - treat `docs/easy_process/*` as current working memory only after it reflects the latest fresh bundle

## Hypothesis under test
- A bounded `T-031` slice that makes active global `FEE_EDGE` quarantine suppress fresh non-home-quote candidates with no actionable sell leg will reduce cross-quote fee-edge churn without weakening home-quote entries or managed sell legs.

## What counts as success
- current runtime blockers are addressed in the correct lane (`T-031`)
- `T-032` remains preserved as a support lane rather than being reopened blindly
- the next fresh bundle reflects lower rotating `XRPETH` / `BNBETH` / `TRXETH` fee-edge skips
- home-quote candidates and actionable sell-leg candidates remain reachable
- `T-031` stays the active lane while `T-032` remains bounded support only

## Stop / rollback conditions
- fresh evidence re-establishes a live `P0/P1` incident
- the new slice causes a new no-feasible deadlock or blocks actionable managed sell legs
- a board switch is attempted without `docs/TICKET_SWITCH_RETRO.md`
