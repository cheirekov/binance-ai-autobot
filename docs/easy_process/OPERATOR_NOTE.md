# OPERATOR_NOTE

Last updated: 2026-05-28 12:15 UTC
Owner: PM/BA + Codex

## What to run next
- run `./scripts/validate-active-ticket.sh` for the targeted `T-040` readiness gate.
- collect the next bundle as beta-readiness evidence.
- use deterministic validation before any new trading-code patch.

## What not to do next
- do not request another T-031/T-032 patch for ordinary live-market skip churn.
- do not weaken risk guards to make the bot trade more.
- do not treat one profitable or unprofitable bundle as production proof.

## What fresh evidence would change the decision
- P0/P1 safety issue: uncontrolled exposure, repeated exchange order rejects, inability to sell/unwind, broken accounting, crash/restart instability.
- deterministic fixture/replay proves a production-gate failure.
