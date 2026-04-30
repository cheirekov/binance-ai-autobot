# ACTIVE_TICKET

Last updated: 2026-04-30 11:45 EEST
Owner: PM/BA + Codex

## Ticket
- ID: `T-031`
- Title: `Regime engine v2`
- Status: `IN_PROGRESS`
- Linked support ticket: `T-032`
- Current lane: `Lane A — Strategy quality / regime routing`
- Current incident override: `P1 dust sell-leg actionability loop`

## Problem statement
The newest fresh bundle (`autobot-feedback-20260430-081918.tgz`) shows the generic no-feasible loop has cleared, but runtime is still not placing orders. The dominant loop is now concrete: `Skip BTCUSDC: Grid sell leg not actionable yet` (`63 -> 86`) while risk is `NORMAL`, active orders are `0`, and live base inventory is dust-sized or zero.

## Current decision
- Ticket decision: `patch_ready`
- Work mode: `PATCH_NOW`
- Linked-support decision:
  - keep `T-032` preserved only; latest evidence is not a downside-control blocker.
- Process rule:
  - treat `docs/DELIVERY_BOARD.md` and `docs/PM_BA_CHANGELOG.md` as authoritative for ticket status and history.
  - treat the latest fresh `docs/RETROSPECTIVE_AUTO.md` / `docs/SESSION_BRIEF.md` pair as authoritative for runtime evidence.
  - treat `docs/easy_process/*` as current working memory only after it reflects the latest fresh bundle.

## Hypothesis under test
- A bounded `T-031` slice that separates actionable inventory from dust and lets reachable grid BUY legs proceed despite dust/zero SELL legs will restore progression without weakening `T-032` downside controls.

## What counts as success
- `BTCUSDC Grid sell leg not actionable yet` no longer dominates the next fresh bundle.
- grid-guarded dust symbols rotate away when live inventory cannot sell.
- zero-base or dust-base candidates can still attempt a valid grid BUY when fee/edge and quote checks pass.
- the next fresh bundle shows either active grid orders or a new concrete first blocker.
- `T-032` remains preserved support only; no downside-control freeze returns.

## Stop / rollback conditions
- fresh evidence re-establishes a live `P0/P1` downside-control incident.
- the new slice buys while hard risk state should block new exposure.
- the new slice blocks reachable home-quote / managed sell paths or weakens downside-control reachability.
- a board switch is attempted without `docs/TICKET_SWITCH_RETRO.md`.
