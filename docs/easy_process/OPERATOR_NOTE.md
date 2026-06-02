# OPERATOR_NOTE

Last updated: 2026-06-02 08:45 UTC
Owner: PM/BA + Codex

## What to run next
- run `./scripts/validate-active-ticket.sh` for the targeted `T-040` readiness gate.
- do not promote to real-money beta yet.
- next engineering work should start `T-026` offline calibration/replay and clean-room reference strategy adoption.
- current selected fixture: `bear_choppy_controlled_drawdown`.
- current candidate ranking: `risk_governor_hysteresis`, `grid_guard_v2`, `mean_reversion_gate`.
- use deterministic validation before any new trading-code patch.

## What not to do next
- do not request another T-031/T-032 patch for ordinary live-market skip churn.
- do not ask to copy GPL or unclear-license strategy code directly.
- do not weaken risk guards to make the bot trade more.
- do not treat one profitable or unprofitable bundle as production proof.

## What fresh evidence would change the decision
- P0/P1 safety issue: uncontrolled exposure, repeated exchange order rejects, inability to sell/unwind, broken accounting, crash/restart instability.
- deterministic fixture/replay proves a production-gate failure.
