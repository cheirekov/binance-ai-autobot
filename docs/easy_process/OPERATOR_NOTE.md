# OPERATOR_NOTE

Last updated: 2026-03-28 10:47 EET  
Owner: PM/BA + Codex

## What to run next
- do not deploy another behavior patch from this bundle alone
- review [TRIAGE_NOTE_2026-03-28_T032_ABS_DAILY_LOSS_CAUTION_PIVOT.md](/home/yc/work/binance-ai-autobot/docs/TRIAGE_NOTE_2026-03-28_T032_ABS_DAILY_LOSS_CAUTION_PIVOT.md)
- decide whether the next active lane is `PM/BA-TRIAGE` only or a concrete follow-up / hardening ticket
- if PM/BA approves a real ticket switch, update `docs/DELIVERY_BOARD.md` and `docs/TICKET_SWITCH_RETRO.md` before the next long run
- if PM/BA keeps `T-032` active, require a new explicit same-ticket hypothesis before any code change

## What not to do next
- do not keep micro-patching `T-032` from the repeated top-skip summary alone
- do not reopen any DONE ticket
- do not switch the board without explicit PM/BA approval and switch-retro alignment

## What fresh evidence would change the decision
- a new bundle shows a concrete `P0/P1` runtime regression instead of a policy/scope question
- deterministic validation proves `ABS_DAILY_LOSS` caution is over-restrictive beyond intended loss protection
- PM/BA approves a concrete follow-up ticket with bounded acceptance criteria
