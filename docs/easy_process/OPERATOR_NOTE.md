# OPERATOR_NOTE

Last updated: 2026-06-15 06:56 UTC
Owner: PM/BA + Codex

## What to run next
- run `./scripts/validate-active-ticket.sh` for the targeted `T-040` readiness gate.
- run `node scripts/t040-strategy-effectiveness-report.js` after each new bundle to see the plain strategy verdict.
- run `node scripts/t026-fixture-comparison.js --write-report` after refreshing the fixture to keep the deterministic candidate ranking current.
- run `node scripts/t026-grid-guard-proof.js --write-report` after fixture comparison to confirm the grid-guard proof target is still valid.
- run `node scripts/t026-risk-governor-proof.js --write-report` after fixture comparison to confirm the risk-governor fallback target is still valid.
- do not promote to real-money beta yet.
- next engineering work should continue `T-026` offline calibration/replay and clean-room reference strategy adoption.
- latest bundle `autobot-feedback-20260615-065149.tgz` is validation-required negative-expectancy evidence with clean safety, not production proof and not a runtime patch trigger.
- current strategy-effectiveness verdict is `NOT_BETA_READY`: adaptation is visible in rule-based strategy/lane telemetry, but not proven profitable after fees.
- refreshed fixture: `bear_choppy_controlled_drawdown` from the June 15 five-window validation sequence.
- current fixture comparison ranking: `grid_guard_v2`, `risk_governor_hysteresis`, `mean_reversion_gate`.
- current grid-guard proof-target verdict: `GRID_GUARD_OFFLINE_PROOF_TARGET_READY`.
- current risk-governor proof-target verdict: `RISK_GOVERNOR_OFFLINE_PROOF_TARGET_READY`.
- current coarse calibration ranking: `grid_guard_v2`, `risk_governor_hysteresis`, `mean_reversion_gate`.
- keep collecting testnet evidence; do not reset the data folder for this validation state.
- use deterministic validation before any new trading-code patch.

## What not to do next
- do not request another T-031/T-032 patch for ordinary live-market skip churn.
- do not ask to copy GPL or unclear-license strategy code directly.
- do not weaken risk guards to make the bot trade more.
- do not treat one profitable or unprofitable bundle as production proof.
- do not treat ordinary no-feasible or fee/edge pressure as a hotfix unless it becomes exchange rejects, stuck orders, or deterministic production-gate failure.

## What fresh evidence would change the decision
- P0/P1 safety issue: uncontrolled exposure, repeated exchange order rejects, inability to sell/unwind, broken accounting, crash/restart instability.
- deterministic fixture/replay proves a production-gate failure.
- strategy-effectiveness report changes from `NOT_BETA_READY` to `CANDIDATE_READY_FOR_OPERATOR_REVIEW`.
