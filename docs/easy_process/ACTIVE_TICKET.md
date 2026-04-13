# ACTIVE_TICKET

Last updated: 2026-04-13 11:45 EEST  
Owner: PM/BA + Codex

## Ticket
- ID: `T-031`
- Title: `Regime engine v2`
- Status: `IN_PROGRESS`
- Linked support ticket: `T-032`
- Current lane: `Lane A — Strategy quality / regime routing`
- Current incident override: `none active`

## Problem statement
The newest fresh bundle (`autobot-feedback-20260413-082204.tgz`) shows the April 12 linked-support thaw worked later in the run, but the runtime now rotates across a small family of home-quote dust residuals (`GIGGLEUSDC`, `0GUSDC`, `币安人生USDC`, `BTCUSDC`, `ETHUSDC`) that all repeat `Grid sell leg not actionable yet`.

## Current decision
- Ticket decision: `patch_required`
- Work mode: `PATCH_NOW`
- Process rule:
  - treat `docs/DELIVERY_BOARD.md` and `docs/PM_BA_CHANGELOG.md` as authoritative for ticket status and history
  - treat the latest fresh `docs/RETROSPECTIVE_AUTO.md` / `docs/SESSION_BRIEF.md` pair as authoritative for current runtime evidence
  - treat `docs/easy_process/*` as current working memory only after it reflects the latest fresh bundle

## Hypothesis under test
- A bounded `T-031` slice that makes `Grid sell leg not actionable yet` storm-eligible across symbols will let the bot park that residual family as a cluster instead of rotating symbol by symbol.

## What counts as success
- current runtime blockers are addressed in the correct lane (`T-031`)
- `T-032` remains preserved as a support lane rather than being reopened blindly
- the next fresh bundle reflects lower repeated residual-family `Grid sell leg not actionable yet` churn
- `T-031` stays the active lane while `T-032` remains bounded support only

## Stop / rollback conditions
- fresh evidence re-establishes a live `P0/P1` incident
- the new slice reopens repeated impossible sell-leg churn on materially actionable home-quote inventory
- a board switch is attempted without `docs/TICKET_SWITCH_RETRO.md`
