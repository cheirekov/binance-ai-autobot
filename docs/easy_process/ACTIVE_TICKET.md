# ACTIVE_TICKET

Last updated: 2026-04-14 12:20 EEST  
Owner: PM/BA + Codex

## Ticket
- ID: `T-031`
- Title: `Regime engine v2`
- Status: `IN_PROGRESS`
- Linked support ticket: `T-032`
- Current lane: `Lane A — Strategy quality / regime routing`
- Current incident override: `none active`

## Problem statement
The newest fresh bundle (`autobot-feedback-20260414-090828.tgz`) shows the April 13 family-level storm key is live, but the runtime still rotates more slowly across a small family of home-quote dust residuals (`币安人生USDC`, `GIGGLEUSDC`, `SOLUSDC`, `ENJUSDC`, `ETHUSDC`) that repeat `Grid sell leg not actionable yet` and short `COOLDOWN` re-entries.

## Current decision
- Ticket decision: `patch_required`
- Work mode: `PATCH_NOW`
- Process rule:
  - treat `docs/DELIVERY_BOARD.md` and `docs/PM_BA_CHANGELOG.md` as authoritative for ticket status and history
  - treat the latest fresh `docs/RETROSPECTIVE_AUTO.md` / `docs/SESSION_BRIEF.md` pair as authoritative for current runtime evidence
  - treat `docs/easy_process/*` as current working memory only after it reflects the latest fresh bundle

## Hypothesis under test
- A bounded `T-031` slice that widens the family-level storm lookback, lowers the trigger threshold, and extends the cooldown for `Grid sell leg not actionable yet` will park the residual cluster longer instead of letting it re-enter every 15-30 minutes.

## What counts as success
- current runtime blockers are addressed in the correct lane (`T-031`)
- `T-032` remains preserved as a support lane rather than being reopened blindly
- the next fresh bundle reflects lower repeated residual-family `Grid sell leg not actionable yet` churn and fewer short `COOLDOWN` re-entries
- `T-031` stays the active lane while `T-032` remains bounded support only

## Stop / rollback conditions
- fresh evidence re-establishes a live `P0/P1` incident
- the new slice reopens repeated impossible sell-leg churn on materially actionable home-quote inventory
- a board switch is attempted without `docs/TICKET_SWITCH_RETRO.md`
