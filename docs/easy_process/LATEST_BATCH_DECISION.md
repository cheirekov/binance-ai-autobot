# LATEST_BATCH_DECISION

Last updated: 2026-06-18 09:07 UTC
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Gate P1 - bounded beta readiness`
- Why:
  - `observed`: the June 18 bundle stayed on `T-040` and auto-retro returned `validation_required`.
  - `observed`: the previous runtime patch was deployed (`commit=4e78369`) and exposure fell to `0.11%`, but the wallet still deteriorated.
  - `observed`: latest daily net is `-39.77 USDT`; five-window net is `-112.73 USDT`; realized-after-fees is `-58.82 USDT`.
  - `observed`: execution health is clean (`0` rejected orders, `0` restarts, `0` health errors), so this is not an exchange/restart incident.
  - `observed`: entry trades were `0`, open exposure cost was only `5.42 USDC`, but filled orders were `186` with `5859.88 USDC` buy notional and `6060.27 USDC` sell notional.
  - `inferred`: the live blocker is fee-negative GRID churn around dust-sized inventory, not lack of strategy labels or more documentation.

## Chosen active ticket
- Current: `T-040` (Bounded beta readiness)
- Linked support: `none`
- Decision: `validation_required`
- Runtime action this batch: `P1 execution-safety mitigation with deterministic unit test`
- Why:
  - `observed`: strategy switching is visible, but not profitable after fees.
  - `observed`: the June 18 window shows high order churn against tiny remaining exposure.
  - `inferred`: stopping dust-sized fee churn is a bounded execution-safety improvement and does not weaken sell/unwind reachability.

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260618-090049.tgz`
- Evidence role: readiness input plus deterministic reproduction target for dust-churn GRID buy suppression.

## Allowed work mode
- Current batch: `RUNTIME_PATCH_WITH_TEST`
- Runtime patch basis: `P1 execution-safety issue plus deterministic helper test`
- Production promotion: `blocked`

## Batch decision
- Decision: `continue_same_ticket_with_validation_required`
- Next ticket candidate: `T-040`
- Review slice:
  - deploy the API/bot service with the negative dust-churn GRID buy guard.
  - keep testnet/paper mode; do not promote to real-money beta.
  - next bundle must show whether filled orders, buy notional, fees, and realized-after-fees improve after the guard.
  - if churn persists, evaluate `risk_governor_hysteresis` as the next deterministic fallback, not another docs-only batch.
