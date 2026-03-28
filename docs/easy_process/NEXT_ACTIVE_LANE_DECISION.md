# NEXT_ACTIVE_LANE_DECISION

Last updated: 2026-03-28 23:10 EET  
Owner: PM/BA + Codex

## Decision
- Next active development lane: `Lane C — Strategy quality`
- Active ticket: `T-031` (`Regime engine v2`)
- Ticket decision: `pivot_active_ticket`
- `BATCH_ACTION_CLASS` for this batch: `PATCH_NOW`

## Why `T-031` is now active
- `docs/DELIVERY_BOARD.md` now marks `T-031` as `IN_PROGRESS`
- `docs/TICKET_SWITCH_RETRO.md` now justifies `T-031` over `T-032`
- the latest fresh runtime evidence no longer points to downside control as the dominant blocker; current blockers are strategy-quality signals

## What is not chosen
- no reopening of DONE `T-034`
- no exit-manager rewrite in this batch
- no AI/news lane activation

## Follow-up ticket rule
- If future fresh evidence proves a closed-ticket regression or proves the current signal no longer belongs inside `T-031`, create a new follow-up / hardening / incident ticket.
- Do not rewrite the historical meaning of any DONE ticket.

## Development resume decision
- Yes: development resumes immediately on `T-031`.
- Constraint: preserve `T-032` downside controls and `T-034` funding stability while the first strategy slice lands.
