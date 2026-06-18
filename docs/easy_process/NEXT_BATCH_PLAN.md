# NEXT_BATCH_PLAN

Last updated: 2026-06-18 09:07 UTC
Owner: PM/BA + Codex

## Exact scope
Continue `T-040` after the June 18 validation-required bundle. The immediate runtime mitigation is deployed-code validation for fee-negative dust GRID churn, not more process writing.

## In scope
- deploy the API/bot service with the negative dust-churn GRID buy guard.
- validate whether the next bundle reduces filled-order churn, buy/sell notional, and fees.
- keep `grid_guard_v2` as the primary deterministic proof family.
- keep `risk_governor_hysteresis` as the fallback if churn persists after the GRID buy guard.
- keep the refreshed `bear_choppy_controlled_drawdown` fixture based on the June 12/15/16/17/18 sequence.
- run `node scripts/t040-strategy-effectiveness-report.js` after each new bundle.
- keep `T-040` as the only active lane.

## Out of scope
- regime/risk-budget/exit-manager tuning from one live bundle without deterministic proof.
- weakening risk guards or exposure caps.
- AI/news action-driving.
- claiming production readiness without validation evidence.
- docs-only churn if the next bundle remains `NOT_BETA_READY`.

## Acceptance criteria
- `./scripts/validate-active-ticket.sh` passes with runtime/test changes present.
- bot-engine focused and full unit tests pass.
- API TypeScript build check passes.
- PM/BA start and end gates pass.
- next bundle shows lower churn pressure than June 18:
  - filled orders below `186`,
  - buy/sell notional materially below `5859.88/6060.27 USDC` unless backed by real entry trades,
  - fees below `10.83 USDC`,
  - realized-after-fees improving from `-58.82 USDC`,
  - rejects/restarts/errors remain `0`.

## Rollback condition
- the new guard blocks SELL/reduce/unwind behavior.
- exchange rejects, health errors, or restarts appear after deployment.
- exposure grows unexpectedly while buy suppression is active.

## What capability this moves forward
Moves `Gate P1 - Execution-safe baseline` by suppressing a measured fee-negative churn path while keeping sell/unwind reachability intact.
