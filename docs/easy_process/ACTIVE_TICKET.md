# ACTIVE_TICKET

Last updated: 2026-04-17 20:15 EEST
Owner: PM/BA + Codex

## Ticket
- ID: `T-031`
- Title: `Regime engine v2`
- Status: `IN_PROGRESS`
- Linked support ticket: `T-032`
- Current lane: `Lane A — Strategy quality / regime routing`
- Current incident override: `none active`

## Problem statement
The newest fresh bundle (`autobot-feedback-20260417-164018.tgz`) shows the April 15 fee-edge mitigation held, but the engine is now boxed into a near-flat `PROFIT_GIVEBACK` no-feasible loop: non-home quotes are exhausted after reserve, no active orders remain, and the fallback recovery sell itself fails on exchange minimums.

## Current decision
- Ticket decision: `patch_required`
- Work mode: `PATCH_NOW`
- Process rule:
  - treat `docs/DELIVERY_BOARD.md` and `docs/PM_BA_CHANGELOG.md` as authoritative for ticket status and history
  - treat the latest fresh `docs/RETROSPECTIVE_AUTO.md` / `docs/SESSION_BRIEF.md` pair as authoritative for current runtime evidence
  - treat `docs/easy_process/*` as current working memory only after it reflects the latest fresh bundle

## Hypothesis under test
- A bounded `T-031` slice that parks no-feasible dust-only recovery loops behind a temporary global cooldown will reduce repeated `No feasible candidates after policy/exposure filters` churn without weakening actionable sells, caution unwind behavior, or the preserved `T-032` support path.

## What counts as success
- current runtime blockers are addressed in the correct lane (`T-031`)
- `T-032` remains preserved as a support lane rather than being reopened blindly
- the next fresh bundle reflects lower repeated `No feasible candidates after policy/exposure filters` churn
- actionable sell-leg candidates and caution unwind remain reachable
- runtime records a bounded `NO_FEASIBLE_DUST_RECOVERY` cooldown when the recovery attempt is too small to execute
- `T-031` stays the active lane while `T-032` remains bounded support only

## Stop / rollback conditions
- fresh evidence re-establishes a live `P0/P1` incident
- the new slice blocks actionable managed sell legs, hides real recovery opportunities, or weakens downside-control reachability
- a board switch is attempted without `docs/TICKET_SWITCH_RETRO.md`
