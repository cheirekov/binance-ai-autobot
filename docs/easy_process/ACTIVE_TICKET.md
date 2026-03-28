# ACTIVE_TICKET

Last updated: 2026-03-28 10:47 EET  
Owner: PM/BA + Codex

## Ticket
- ID: `T-032`
- Title: `Exit manager v2`
- Status: `IN_PROGRESS`
- Current lane: `Lane A — Runtime stability`
- Current incident override: `none active`

## Problem statement
The newest March 28 bundle proves the previous defensive cancel-churn patch deployed on `5927bd9` and no longer reproduces that old same-ticket defect. The remaining dominant repeat is now a global `daily loss caution paused new symbols` loop under `ABS_DAILY_LOSS`, with low remaining exposure and managed-symbol fee/edge rejects, which makes the next move a PM/BA scope decision rather than another safe `T-032` micro-patch.

## Current decision
- Ticket decision: `pivot_ticket`
- Work mode: `NO_CODE`
- Process rule:
  - treat `docs/DELIVERY_BOARD.md` and `docs/PM_BA_CHANGELOG.md` as authoritative for ticket status and history
  - treat the March 28 session brief / retrospective as authoritative for current runtime evidence
  - treat `docs/easy_process/*` as current working memory only after it reflects this pivot batch

## Hypothesis under test
- `T-032` may no longer be the correct active coding lane; the remaining question is whether `ABS_DAILY_LOSS` caution global new-symbol pause at low exposure should become a new follow-up / hardening ticket or remain intended policy

## What counts as success
- the previous defensive cancel-churn hypothesis is explicitly closed
- the next active development lane is explicitly named before more code lands
- no further runtime patch is proposed without a new bounded hypothesis
- DONE tickets remain untouched during the pivot review

## Stop / rollback conditions
- fresh evidence re-establishes a live `P0/P1` incident
- PM/BA explicitly chooses to keep `T-032`, but no new bounded hypothesis is written
- a board switch is attempted without `docs/TICKET_SWITCH_RETRO.md`
