# RUN_CONTEXT

Last updated: 2026-03-25 20:38 UTC  
Owner: Operator or PM/BA

Purpose:
make the current cycle and current time explicit so the LLM never has to guess.

## Current run facts
- Current UTC now: `2026-03-25T20:38:57Z`
- Current local date: `2026-03-25`
- Current local timezone: `Europe/Sofia`
- Current mode: `hotfix`  
  Allowed values: `live_monitoring` / `analysis` / `validation` / `replay` / `hotfix`
- Current cycle label: `POST_FRESH_RUNTIME_PATCH`
- Active ticket: `T-032`
- Active lane: `Lane A — Runtime stability`

## Latest bundle facts
- Latest bundle id: `autobot-feedback-20260325-195431.tgz`
- Bundle run end UTC: `2026-03-25T19:54:09.822Z`
- Bundle freshness class: `fresh`
- Latest ingest decision: `patch_required`
- Current reviewed git sha: `cce2322`

## Cycle timing facts
- Previous reviewed bundle id: `autobot-feedback-20260324-095550.tgz`
- Previous reviewed bundle run end UTC: `2026-03-24T09:55:46.729Z`
- Evidence delta expectation for next real cycle:
  - lower repeated guard-pause / ladder-wait counts, or
  - explicit cooldown-driven rotation away from the same stuck symbols, or
  - first justified `grid-guard-defensive-unwind`, or
  - a rollback signal if churn/funding regression appears

## Hard rules for this file
1. Never leave this file blank at the start of a cycle.
2. Use actual timestamps from the workflow or bundle, not approximate prose.
3. If a new model starts, it must trust this file over chat history.
4. If the mode changes, update this file first.
5. If the bundle is fresh, write `fresh` explicitly; do not inherit stale wording from older digests.

## Required update points
Update this file:
- after ingest,
- after switching mode,
- after changing the active ticket or lane,
- before handing off to a new LLM session.
