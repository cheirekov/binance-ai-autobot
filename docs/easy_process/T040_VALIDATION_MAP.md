# T040_VALIDATION_MAP

Last updated: 2026-07-03 09:17 UTC
Owner: Validation Engineer + PM/BA

Purpose: make beta-readiness measurable. This file maps each production-readiness question to a command, fixture, or explicit gap.

## Current Command Map

| Validation class | Command / artifact | Status |
| --- | --- | --- |
| T-040 readiness classifier | `node scripts/t040-readiness-check.js` | `PATCH_ALLOWED_REVIEW`; healthErrors `1`, exchange/order-sync backoff evidence |
| T-040 strategy effectiveness report | `node scripts/t040-strategy-effectiveness-report.js` | `NOT_BETA_READY`; dailyNet `-2.68`; five-window net `-99.58`; latest realized-after-fees `-26.86` |
| Risk-governor strong-bull negative-expectancy test | `./node_modules/.bin/vitest run src/modules/bot/risk-budget.service.test.ts --no-cache` from `apps/api` | `PASS`; strong-bull `NORMAL` no longer bypasses recent negative-expectancy fresh-exposure block |
| Grid/dust guard regression slice | `./node_modules/.bin/vitest run src/modules/bot/bot-engine.service.test.ts -t 'fee-negative dust churn|cancels bot grid buy orders|does not let a dust sell leg block' --no-cache` from `apps/api` | `PASS` |
| Full bot-engine unit file | `./node_modules/.bin/vitest run src/modules/bot/bot-engine.service.test.ts --no-cache` from `apps/api` | `PASS`; 128 tests |
| API TypeScript build check | `./node_modules/.bin/tsc -p tsconfig.build.json --noEmit` from `apps/api` | `PASS` |
| T-040 active validation | `./scripts/validate-active-ticket.sh` | `PASS`; `PATCH_ALLOWED_REVIEW`, promotion gate remains separate |
| PM/BA start gate | `./scripts/pmba-gate.sh start` | `PASS` |
| PM/BA end gate | `./scripts/pmba-gate.sh end` | `PASS` |
| Full CI | `./scripts/validate-active-ticket.sh --full` | `NOT RUN` in this short patch batch |

## Latest Bundle Evidence

`autobot-feedback-20260703-091448.tgz` is post-patch operational review evidence:
- deployed commit `18b6ce2`.
- `testnet` environment.
- `NORMAL` risk state.
- `-2.68 USDT` daily net.
- `-99.58 USDT` five-window net.
- `-26.86 USDT` latest realized-after-fees.
- `0.37%` max drawdown.
- `5.09%` total allocation across `12` open positions, mostly `ETHUSDC`.
- open exposure cost `237.23 USDC`.
- `200` submitted orders, `181` filled, `0` rejected, `19` canceled.
- `5174.86 USDC` buy notional and `5153.12 USDC` sell notional.
- `9.08 USDC` fees.
- `5` entry trades.
- `1` health error and `0` restarts.
- order-sync backoff repeated after Binance testnet `502 Bad Gateway` on `openOrders`.

Interpretation: strategy losses and churn improved again, but beta readiness is still blocked because after-fee expectancy is negative and exchange/order-sync health is not clean.

## Required Deterministic Scenarios

| Scenario | Why it matters | Current proof | Required next proof |
| --- | --- | --- | --- |
| Exposure cannot grow beyond hard caps | prevents production capital blow-up | live allocation is `5.09%`, mostly ETH, while risk budget caps new exposure below exchange minimum | next bundle must show ETH/total exposure not growing beyond the watch level |
| Sell/unwind remains reachable while fresh exposure is blocked | prevents boxed-in managed exposure | risk-budget test preserves `placeGridSell` and `reduceOnly`; July 3 ended with active orders `0` and no rejects | next bundle must keep sell/unwind clean |
| Recent after-fee losses block fresh exposure | prevents strong-bull churn after losses | risk-budget unit test plus July 3 entry count `5`, still far below July 1 `22` | next bundle must keep entries low and reduce fees/filled orders |
| Exchange order rejects do not create retry storms | prevents order chaos | latest bundle has `0` rejects | add synthetic reject fixture later |
| Exchange/order-sync backoff is bounded | prevents trading while order state is untrusted | July 3 paused on Binance testnet `502 Bad Gateway` and did not crash | next bundle must clear backoff, or add deterministic exchange-backoff validation |
| Strategy/adaptation improves after fees | proves product value | still `NOT_BETA_READY` | collect post-patch evidence |

## Strategy Effectiveness Result

`node scripts/t040-strategy-effectiveness-report.js` now reports:
- `NOT_BETA_READY`
- `aiMode=OFF`
- `dailyNet=-2.68`, `fiveWindowNet=-99.58`, `realizedAfterFees=-26.86`
- current window classes: `SAFETY_FAILURE=1`, `CONTROLLED_DRAWDOWN=2`, `PROFIT_WINDOW=1`, `NEUTRAL_OR_INCONCLUSIVE=1`
- adaptive shadow signals: `5000` events, `TREND=2540`, `GRID=1355`, `MEAN_REVERSION=1105`
- execution lanes observed: `DEFENSIVE=2755`, `MARKET=1738`, `GRID=394`, `UNSPECIFIED=113`
- top losses after fees: `DYDXUSDC=-14.06`, `TLMUSDC=-4.50`, `XLMUSDC=-2.94`, `SOLUSDC=-2.36`, `SYNUSDC=-2.07`
- top open exposure cost: `ETHUSDC=232.94`, `AIGENSYNUSDC=1.05`, `XLMUSDC=1.01`, `TLMUSDC=0.62`, `DYDXUSDC=0.56`

Client-facing interpretation: the bot is not beta-ready. It changes rule-based strategy/lane labels, but after-fee expectancy is still negative.

## Severity Routing

Use this routing before creating any runtime patch:

| Evidence | Action |
| --- | --- |
| uncontrolled exposure growth | `P0/P1 PATCH_ALLOWED` |
| repeated exchange rejects or stuck order-sync | `P0/P1 PATCH_ALLOWED` after reproduction |
| inability to sell/unwind managed exposure | `P0/P1 PATCH_ALLOWED` after reproduction |
| broken PnL/exposure accounting | `P0/P1 PATCH_ALLOWED` after reproduction |
| crash/restart instability | `P0/P1 PATCH_ALLOWED` after reproduction |
| high-notional fee churn around tiny exposure with worsening realized-after-fees | `P1 PATCH_ALLOWED` with deterministic test |
| repeated skip text with clean safety and improving net behavior | `VALIDATION_ONLY` |

## Done For Gate P1

Gate P1 is ready for PM/BA review when:
- every required scenario above is `PASS` or explicitly accepted as a beta risk.
- `./scripts/validate-active-ticket.sh` passes in T-040 mode.
- `./scripts/validate-active-ticket.sh --full` passes.
- release/rollback steps are documented.
- strategy effectiveness is no longer `NOT_BETA_READY`, or PM/BA explicitly accepts the remaining negative expectancy as beta risk.
