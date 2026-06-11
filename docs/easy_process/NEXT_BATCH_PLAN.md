# NEXT_BATCH_PLAN

Last updated: 2026-06-11 09:06 UTC
Owner: PM/BA + Codex

## Exact scope
Continue `T-040` after the June 11 validation-required bundle with deterministic `grid_guard_v2` proof. Do not write another trading-behavior patch unless a P0/P1 safety issue or deterministic production-gate failure is found.

## In scope
- severity gate: define when live evidence can interrupt beta readiness.
- deterministic validation map for `T-031`, `T-032`, and core execution safety.
- deterministic bear/choppy drawdown fixture from the latest June 6/8/9/10/11 sequence.
- supportive positive readiness evidence from the June 3 window.
- June 8/9/10/11 negative-window pressure and June 11 ETH/KAT grid/risk-budget pressure as `grid_guard_v2` offline comparison input.
- `scripts/t026-fixture-comparison.js` report showing `FIXTURE_CANDIDATE_GRID_GUARD_V2`.
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
- June 11 evidence remains classified as validation-required negative-expectancy evidence, not production approval or a runtime patch trigger.
- strategy/reference work uses `docs/easy_process/REFERENCE_STRATEGY_ADOPTION.md` and does not copy GPL or unclear-license code.
- `node scripts/t026-calibration-runner.js` reports `BUILD_BEAR_CHOPPY_FIXTURE` after the three-negative-window June 10 validation sequence.
- `node scripts/t040-strategy-effectiveness-report.js` reports the current strategy verdict; latest result is `NOT_BETA_READY`.
- fixture exists at `docs/easy_process/fixtures/t026/bear_choppy_controlled_drawdown.json`.

## Rollback condition
- the process change hides or downgrades a real P0/P1 runtime safety issue.

## What capability this moves forward
Moves `Gate P1 — Execution-safe baseline` and production readiness by turning the post-patch negative sequence into a deterministic `grid_guard_v2` proof task instead of another live-patch loop.
