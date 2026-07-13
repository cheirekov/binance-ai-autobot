# NEXT_BATCH_PLAN

Last updated: 2026-07-03 09:17 UTC
Owner: PM/BA + Codex

## Exact scope
Continue `T-040` operational validation after `autobot-feedback-20260703-091448.tgz`. Do not open a new T-031/T-032 loop from repeated risk-budget or min-order skip text.

## In scope
- keep testnet/paper running without data reset.
- collect another normal bundle.
- compare the next bundle against July 3, July 2, and July 1.
- run `node scripts/t040-strategy-effectiveness-report.js` after the next bundle.
- keep `T-040` as the only active lane.
- watch exchange/order-sync health because July 3 had repeated Binance testnet `502 Bad Gateway` responses from `openOrders`.
- watch ETH concentration because July 3 ended with `5.09%` allocation, mostly `ETHUSDC`.

## Out of scope
- weakening risk guards or exposure caps.
- AI/news action-driving.
- claiming beta readiness from one improved entry-count bundle.
- copying reference-bot code.
- writing a runtime patch from risk-budget skip churn alone.
- writing a strategy patch from an external exchange 502 window.

## Acceptance criteria for the next bundle
- order-sync backoff is absent; no `Live order sync failed`, `Transient exchange backoff active`, or Binance `502 Bad Gateway` in top reasons.
- health errors return to `0` from July 3 `1`.
- fresh entries stay low: July 3 was `5`, July 2 was `2`, July 1 was `22`.
- filled orders fall below July 3 `181`.
- fees fall below July 3 `9.08 USDC`.
- realized-after-fees improves from July 3 `-26.86 USDT`.
- total allocation does not grow beyond the July 3 `5.09%` watch level.
- ETH exposure does not grow beyond cap and SELL/reduce remains reachable.
- rejects and restarts remain `0`.

## Rollback or hotfix condition
- SELL/reduce/unwind becomes blocked.
- exchange rejects, health errors, or restarts persist in the next bundle.
- total exposure keeps growing above cap while new exposure is supposedly blocked.
- ETH concentration increases materially without an actionable exit path.
- order-sync backoff persists across another normal collection window.

## What capability this moves forward
Moves `Gate P1 - Execution-safe baseline` by validating whether recent negative-expectancy risk-governor memory reduces churn while the bot remains robust to exchange/order-sync outages.
