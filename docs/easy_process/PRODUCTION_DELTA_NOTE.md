# PRODUCTION_DELTA_NOTE

Last updated: 2026-07-01 09:01 UTC
Owner: PM/BA + Codex

## How this batch moves the bot closer to production
The July 1 bundle shows the bot is still not beta-ready. The safety layer worked, but expectancy did not:

- daily net was `-46.55 USDT`.
- realized-after-fees was `-42.67 USDT`.
- fees were `11.62 USDC`.
- filled orders were `197`.
- buy/sell notional was `6357.51/6557.45 USDC`.
- open exposure cost was only `5.78 USDC`.
- rejected orders, restarts, and health errors were `0`.

The patch moves production readiness forward by closing a deterministic risk-governor hole: recent negative after-fee performance now blocks fresh exposure even in strong-bull `NORMAL` conditions. SELL/reduce permissions remain available when exposure exists.

## What is still missing before the next gate
- deploy this API/bot service patch.
- verify fresh entries, filled orders, fees, and realized-after-fees improve.
- keep rejects, restarts, and health errors at `0`.
- strategy-effectiveness report must move beyond `NOT_BETA_READY`, or PM/BA must explicitly accept the residual negative expectancy risk.
- release/rollback runbook proof before any real-money beta promotion.

## What this batch added to reduce process waste
- avoided patching from repeated skip text alone.
- patched the deterministic fresh-exposure exception that remained after the June 18 dust-churn guard.
- added focused risk-budget unit coverage for strong-bull negative-expectancy behavior.

## Whether this batch improves execution, risk, validation, event awareness, or learning
- Execution: `yes`
- Risk: `yes`
- Validation: `yes`
- Event awareness: `no`
- Learning: `indirect`
