# NEXT_BATCH_PLAN

Last updated: 2026-05-29 08:14 UTC
Owner: PM/BA + Codex

## Exact scope
Continue `T-040` after the May 29 readiness bundle. Do not write another trading-behavior patch unless a P0/P1 safety issue or deterministic production-gate failure is found.

## In scope
- severity gate: define when live evidence can interrupt beta readiness.
- deterministic validation map for `T-031`, `T-032`, and core execution safety.
- Gate P1 checklist and pass/fail packet.
- AI orchestration rules for skill/subagent/MCP use.
- release/rollback runbook proof.
- compact evidence quality requirements.
- script/doc changes that prevent `patch_required` from automatically looping back into T-031/T-032.

## Out of scope
- regime/risk-budget/exit-manager tuning from one live bundle.
- weakening risk guards or exposure caps.
- AI/news action-driving.
- claiming production readiness without validation evidence.

## Acceptance criteria
- `T-040` is the only `IN_PROGRESS` ticket.
- PM/BA gates pass with `T-040`.
- `./scripts/validate-active-ticket.sh` has a targeted `T-040` mode.
- auto-retro treats production-readiness live churn as validation unless P0/P1 severity is proven.
- next-session prompt points to beta readiness, not T-031/T-032 patch work.
- May 29 evidence remains classified as readiness support, not production approval.

## Rollback condition
- the process change hides or downgrades a real P0/P1 runtime safety issue.

## What capability this moves forward
Moves `Gate P1 — Execution-safe baseline` and production readiness by replacing infinite live-patch loops with explicit beta gates and deterministic validation.
