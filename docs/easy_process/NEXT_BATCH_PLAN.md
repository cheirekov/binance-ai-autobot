# NEXT_BATCH_PLAN

Last updated: 2026-07-13 09:04 UTC
Owner: PM/BA + Codex

## Exact scope
Continue `T-040` validation after `autobot-feedback-20260713-085946.tgz`. Do not open a new T-031/T-032 loop from risk-budget skip text or negative live PnL alone.

## In scope
- keep testnet/paper running without data reset.
- build the focused offline proof for `grid_guard_v2`.
- keep `risk_governor_hysteresis` as the fallback proof target.
- compare the next bundle against July 13, July 3, July 2, and July 1.
- run `node scripts/t040-strategy-effectiveness-report.js` after the next bundle.
- keep `T-040` as the only active lane.
- watch `PUMPUSDC` concentration because July 13 ended with `3.10%` allocation, mostly `PUMPUSDC`.

## Out of scope
- weakening risk guards or exposure caps.
- AI/news action-driving.
- claiming beta readiness while `NOT_BETA_READY` persists.
- copying reference-bot code.
- writing a runtime patch from risk-budget skip churn alone.
- writing a strategy patch without deterministic/offline proof.

## Acceptance criteria for the next bundle
- rejects, restarts, and health errors remain `0`.
- fresh entries stay low: July 13 was `6`, July 3 was `5`, July 1 was `22`.
- filled orders fall below July 13 `173`.
- fees fall below July 13 `8.75 USDC`.
- realized-after-fees improves from July 13 `-53.11 USDT`.
- total allocation does not grow beyond the July 13 `3.10%` watch level without an actionable exit path.
- `PUMPUSDC` exposure does not grow beyond cap and SELL/reduce remains reachable.
- order-sync backoff stays absent.

## Rollback or hotfix condition
- SELL/reduce/unwind becomes blocked.
- exchange rejects, health errors, or restarts reappear.
- total exposure keeps growing above cap while new exposure is supposedly blocked.
- PUMP concentration increases materially without an actionable exit path.
- order-sync backoff recurs across another normal collection window.

## What capability this moves forward
Moves `Gate P1 - Execution-safe baseline` toward strategy proof by keeping live safety bounded while forcing negative expectancy into deterministic/offline validation instead of another live-market micro-patch.
