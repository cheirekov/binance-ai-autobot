# NEXT_BATCH_PLAN

Last updated: 2026-03-28 10:47 EET  
Owner: PM/BA + Codex

## Exact scope
Run a PM/BA pivot review before the next long run. Confirm that the deployed `5927bd9` build closed the prior defensive cancel-churn hypothesis, then decide whether the remaining `ABS_DAILY_LOSS` caution global new-symbol pause belongs in a new follow-up ticket or is intended healthy idle under loss protection.

## In scope
- keep `docs/RETROSPECTIVE_AUTO.md` / `docs/SESSION_BRIEF.md` aligned on `pivot_required`
- add the fresh March 28 triage note
- define the correct next active development lane or follow-up ticket candidate
- if PM/BA approves a real ticket switch, update `docs/DELIVERY_BOARD.md` and `docs/TICKET_SWITCH_RETRO.md` in that dedicated pivot batch

## Out of scope
- another blind `T-032` runtime patch from this bundle alone
- reopening any DONE ticket
- quote-routing redesign (`T-034` remains closed)
- broad strategy retuning before the next lane is explicitly chosen

## Acceptance criteria
- the previous defensive cancel-churn hypothesis is explicitly closed
- the next active lane is explicitly named (`PM/BA-TRIAGE` or a concrete follow-up ticket)
- no further runtime patch is proposed without a new bounded hypothesis
- the repo handoff reflects `pivot_ticket` and `NO_CODE`

## Rollback condition
- fresh evidence proves a current `P0/P1` runtime incident that requires an emergency batch instead of a pivot review

## What capability this moves forward
Moves `Lane A — Runtime stability` by preventing another blind patch and forcing the correct next-lane decision before more live runtime changes.
