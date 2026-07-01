# NEXT_BATCH_PLAN

Last updated: 2026-07-01 09:01 UTC
Owner: PM/BA + Codex

## Exact scope
Continue `T-040` after the July 1 negative post-deploy bundle. Deploy and validate the risk-governor hysteresis patch; do not open a new T-031/T-032 loop.

## In scope
- deploy the API/bot service with the July 1 risk-governor patch.
- keep testnet/paper running without data reset.
- collect another normal bundle.
- compare the next bundle against July 1.
- run `node scripts/t040-strategy-effectiveness-report.js` after the next bundle.
- keep `T-040` as the only active lane.

## Out of scope
- weakening risk guards or exposure caps.
- AI/news action-driving.
- claiming beta readiness from a single recovery bundle.
- copying reference-bot code.

## Acceptance criteria for the next bundle
- fresh entries lower than July 1 `22`.
- filled orders lower than July 1 `197`.
- fees lower than July 1 `11.62 USDC`.
- realized-after-fees improves from July 1 `-42.67 USDT`.
- exposure remains bounded near current low allocation.
- rejects, restarts, and health errors remain `0`.

## Rollback condition
- SELL/reduce/unwind becomes blocked.
- exchange rejects, health errors, or restarts appear.
- exposure grows unexpectedly while realized-after-fees remains negative.

## What capability this moves forward
Moves `Gate P1 - Execution-safe baseline` by extending defensive risk-governor memory after recent after-fee losses, while preserving unwind/reduce actions.
