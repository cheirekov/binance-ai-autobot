# NEXT_BATCH_PLAN

Last updated: 2026-06-05 08:01 UTC
Owner: PM/BA + Codex

## Exact scope
Continue `T-040` after the June 5 readiness bundle with validation and release-readiness work. Do not write another trading-behavior patch unless a P0/P1 safety issue or deterministic production-gate failure is found.

## In scope
- severity gate: define when live evidence can interrupt beta readiness.
- deterministic validation map for `T-031`, `T-032`, and core execution safety.
- deterministic bear/choppy drawdown fixture from the June 1/2/4/5 controlled drawdown sequence.
- supportive positive readiness evidence from the June 3 window.
- June 4 medium sizing reject pressure and June 5 low sizing reject pressure as `grid_guard_v2` offline comparison input.
- clean-room reference strategy adoption plan.
- `T-026` offline calibration/replay as the next engineering target.
- `T-040` strategy-effectiveness reporting as the client-facing answer to whether adaptation is improving net results after fees.
- `bear_choppy_controlled_drawdown` fixture as the next concrete strategy-validation artifact.
- ranked candidates: `risk_governor_hysteresis`, `grid_guard_v2`, `mean_reversion_gate`.
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
- June 5 evidence remains classified as small controlled-drawdown readiness evidence, not production approval or a runtime patch trigger.
- strategy/reference work uses `docs/easy_process/REFERENCE_STRATEGY_ADOPTION.md` and does not copy GPL or unclear-license code.
- `node scripts/t026-calibration-runner.js` reports `KEEP_COLLECTING_AND_LABEL_REGIME` after the small controlled-negative June 5 window.
- `node scripts/t040-strategy-effectiveness-report.js` reports the current strategy verdict; latest result is `NOT_BETA_READY`.
- fixture exists at `docs/easy_process/fixtures/t026/bear_choppy_controlled_drawdown.json`.

## Rollback condition
- the process change hides or downgrades a real P0/P1 runtime safety issue.

## What capability this moves forward
Moves `Gate P1 — Execution-safe baseline` and production readiness by replacing infinite live-patch loops with explicit beta gates and deterministic validation.
