# PRODUCTION_DELTA_NOTE

Last updated: 2026-07-03 09:17 UTC
Owner: PM/BA + Codex

## How this batch moves the bot closer to production
The July 3 bundle is post-patch validation plus operational review, not production proof:

- the deployed commit is `18b6ce2`.
- daily net improved again to `-2.68 USDT`.
- realized-after-fees improved to `-26.86 USDT`, but remains negative.
- fees improved to `9.08 USDC`.
- filled orders improved to `181`.
- entry trades stayed low at `5`, far below July 1 `22`.
- rejected orders and restarts stayed `0`.

This moves production readiness forward because the July 1 risk-governor patch still appears to be reducing fresh-entry churn. It also exposed an operational blocker: Binance testnet returned repeated `502 Bad Gateway` responses on `openOrders`, and the bot entered exchange/order-sync backoff instead of continuing to trade blindly.

## What is still missing before the next gate
- realized-after-fees is still negative at `-26.86 USDT`.
- five-window net is still negative at `-99.58 USDT`.
- exposure is still near the risk cap at `5.09%`, mostly `ETHUSDC`.
- order-sync backoff must clear in a follow-up bundle.
- health errors must return to `0`.
- strategy-effectiveness report must move beyond `NOT_BETA_READY`, or PM/BA must explicitly accept the residual negative expectancy risk.
- release/rollback runbook proof is still required before any real-money beta promotion.

## What this batch added to reduce process waste
- recorded the July 3 evidence as `PATCH_ALLOWED_REVIEW`, not automatic trading-code patch work.
- avoided writing a strategy/risk-budget patch from exchange 502 noise.
- corrected validation plumbing so `PATCH_ALLOWED_REVIEW` can complete the T-040 gate.
- corrected auto-retro wording so it names the actual exchange/order-sync backoff reason.
- converted the next check into a bounded watch: order-sync recovery, health errors, entry count, fees, after-fee result, ETH concentration, and SELL/reduce reachability.

## Whether this batch improves execution, risk, validation, event awareness, or learning
- Execution: `operational_review_required`
- Risk: `watch_eth_concentration`
- Validation: `yes`
- Event awareness: `no`
- Learning: `indirect`
