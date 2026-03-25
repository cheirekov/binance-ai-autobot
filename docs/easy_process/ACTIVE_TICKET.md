# ACTIVE_TICKET

Last updated: 2026-03-25 20:38 UTC  
Owner: PM/BA + Codex

## Ticket
- ID: `T-032`
- Title: `Exit manager v2`
- Status: `IN_PROGRESS`
- Lane: `Lane A — Runtime stability`

## Problem statement
Fresh runtime evidence now shows the active T-032 failure is a repeated live loop:
- the bot keeps re-encountering `Grid guard paused BUY leg` and `Grid waiting for ladder slot or inventory` on the same high-allocation symbols,
- the current March 23 T-032 behavior did not surface any runtime `grid-guard-defensive-unwind`,
- the repo memory surface drifted and still contained an older validation-only state.

## Current decision
- `BATCH_ACTION_CLASS`: `PATCH_NOW`
- Ticket decision: `patch_same_ticket`
- Process rule: use `docs/RETROSPECTIVE_AUTO.md` and `docs/SESSION_BRIEF.md` as authority for this batch; easy-process files must mirror them

## Hypothesis under test
When a symbol repeatedly hits `Grid guard paused BUY leg` and no order follows, the bot should persist a symbol cooldown so it rotates away instead of immediately reselecting the same dead-end.

## What counts as success
- the next fresh bundle shows lower repeated guard-pause / ladder-wait pressure on the same stuck symbols
- guard-pause skips now leave cooldown evidence instead of pure reselection churn
- no `T-034` funding regression returns
- hard guards still hold

## What does NOT count as success
- wallet movement caused only by repricing
- unchanged repeated loop counts across the next fresh bundle
- declaring the unwind path fixed without runtime evidence

## Stop / rollback conditions
- the cooldown suppresses actionable sell work
- funding/routing regressions return as dominant behavior
- churn increases without loop-pressure reduction

## Required outputs from next LLM batch
1. compare the next fresh bundle against the pre-patch BTCUSDC/SOLUSDC loop baseline
2. decide whether this patch was sufficient, needs rollback, or needs a deeper T-032 follow-up
3. keep `T-032` as the only active ticket unless runtime evidence clearly justifies a pivot
