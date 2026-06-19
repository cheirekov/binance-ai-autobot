# NEXT_BATCH_PLAN

Last updated: 2026-06-19 08:58 UTC
Owner: PM/BA + Codex

## Exact scope
Continue `T-040` after the June 19 post-deploy validation bundle. Do not patch runtime from the repeated no-feasible skip warning alone.

## In scope
- keep testnet/paper running without data reset.
- collect another normal bundle.
- compare the next bundle against June 19 and June 18.
- keep `grid_guard_v2` as the current deployed mitigation.
- keep `risk_governor_hysteresis` as fallback only if churn remains high and realized-after-fees worsens again.
- run `node scripts/t040-strategy-effectiveness-report.js` after each new bundle.
- keep `T-040` as the only active lane.

## Out of scope
- runtime tuning from a repeated no-feasible skip reason.
- weakening risk guards or exposure caps.
- AI/news action-driving.
- claiming beta readiness from one positive daily bundle.
- docs-only churn if a real P0/P1 execution issue appears.

## Acceptance criteria for the next bundle
- daily net remains controlled and does not revert to a large loss.
- realized-after-fees improves from `-24.73 USDT`.
- fees remain below June 18 baseline `10.83 USDC`.
- filled order count starts falling from `190`.
- buy/sell notional falls from `5748.19/5950.75 USDC` unless entry trades are clearly justified.
- rejects, restarts, and health errors remain `0`.

## Rollback condition
- SELL/reduce/unwind becomes blocked.
- exchange rejects, health errors, or restarts appear.
- exposure grows unexpectedly while churn remains high.

## What capability this moves forward
Moves `Gate P1 - Execution-safe baseline` by validating that the dust-churn guard can improve expectancy without weakening safety.
