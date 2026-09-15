# ACTIVE_TICKET

Last updated: 2026-05-28 11:05 UTC
Owner: PM/BA + Codex

## Ticket
- ID: `T-040`
- Title: `Bounded beta readiness`
- Status: `IN_PROGRESS`
- Linked support ticket: `none`
- Current lane: `Production readiness / Gate P1`

## Current decision
- Ticket decision: `validation_required`
- Work mode: `VALIDATION_ONLY`
- Process rule:
  - `docs/DELIVERY_BOARD.md`, `docs/SESSION_BRIEF.md`, and `docs/TICKET_SWITCH_RETRO.md` are authoritative.
  - `T-031` and `T-032` are preserved runtime behavior, not active patch lanes.
  - live Binance skip churn can create backlog, but not mandatory runtime code changes unless P0/P1 severity or deterministic reproduction exists.

## Hypothesis under test
- The project can progress faster by proving bounded beta readiness and exact remaining blockers, instead of treating every fresh live bundle as another T-031/T-032 patch prompt.

## What counts as success
- Gate P1 beta-readiness packet exists.
- deterministic validation map exists for runtime tickets.
- release and rollback runbook is explicit.
- operator can decide “beta blocked by X” or “beta candidate” from compact artifacts.

## Stop / rollback conditions
- uncontrolled exposure growth.
- repeated exchange order rejects.
- inability to sell/unwind managed exposure.
- broken PnL/exposure accounting.
- crash/restart instability.
