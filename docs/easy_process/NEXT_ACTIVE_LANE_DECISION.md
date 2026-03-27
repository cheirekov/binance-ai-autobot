# NEXT_ACTIVE_LANE_DECISION

Last updated: 2026-03-27 12:33 EET  
Owner: PM/BA + Codex

## Decision
- Next active development lane: `Lane A — Runtime stability`
- Active ticket: `T-032` (`Exit manager v2`)
- Ticket decision: `continue_same_ticket`
- `BATCH_ACTION_CLASS` for this normalization batch: `OPERATIONS_ADJUSTMENT`

## Why `T-032` remains active
- `docs/DELIVERY_BOARD.md` still marks `T-032` as the only `IN_PROGRESS` ticket
- `docs/TICKET_SWITCH_RETRO.md` still justifies `T-032` over `T-031`
- the latest fresh runtime evidence on 2026-03-27 says `continue active ticket` and does not currently prove a live `P0/P1` incident

## What is not chosen
- no pivot to `T-031`
- no reopening of DONE `T-034`
- no split ticket now

## Follow-up ticket rule
- If future fresh evidence proves a closed-ticket regression or proves the current signal no longer belongs inside `T-032`, create a new follow-up / hardening / incident ticket.
- Do not rewrite the historical meaning of any DONE ticket.

## Development resume decision
- Yes: development can resume in normal mode after this normalization batch.
- Constraint: the next coding batch must rewrite the start-of-batch `T-032` contract before implementation.
