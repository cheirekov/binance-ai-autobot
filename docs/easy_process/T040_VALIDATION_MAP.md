# T040_VALIDATION_MAP

Last updated: 2026-07-01 09:01 UTC
Owner: Validation Engineer + PM/BA

Purpose: make beta-readiness measurable. This file maps each production-readiness question to a command, fixture, or explicit gap.

## Current Command Map

| Validation class | Command / artifact | Status |
| --- | --- | --- |
| T-040 readiness classifier | `node scripts/t040-readiness-check.js` | `CONTINUE_READINESS`; promotion gate remains separate |
| T-040 strategy effectiveness report | `node scripts/t040-strategy-effectiveness-report.js` | `NOT_BETA_READY`; dailyNet `-46.55`; five-window net `-125.61`; latest realized-after-fees `-42.67` |
| Risk-governor strong-bull negative-expectancy test | `./node_modules/.bin/vitest run src/modules/bot/risk-budget.service.test.ts --no-cache` from `apps/api` | `PASS`; strong-bull `NORMAL` no longer bypasses recent negative-expectancy fresh-exposure block |
| Grid/dust guard regression slice | `./node_modules/.bin/vitest run src/modules/bot/bot-engine.service.test.ts -t 'fee-negative dust churn|cancels bot grid buy orders|does not let a dust sell leg block' --no-cache` from `apps/api` | `PASS` |
| Full bot-engine unit file | `./node_modules/.bin/vitest run src/modules/bot/bot-engine.service.test.ts --no-cache` from `apps/api` | `PASS`; 128 tests |
| API TypeScript build check | `./node_modules/.bin/tsc -p tsconfig.build.json --noEmit` from `apps/api` | `PASS` |
| T-040 active validation | `./scripts/validate-active-ticket.sh` | `PASS`; `CONTINUE_READINESS`, promotion gate remains separate |
| PM/BA start gate | `./scripts/pmba-gate.sh start` | `PASS` |
| PM/BA end gate | `./scripts/pmba-gate.sh end` | `PASS` |
| Full CI | `./scripts/validate-active-ticket.sh --full` | `NOT RUN` in this short patch batch |

## Latest Bundle Evidence

`autobot-feedback-20260701-085837.tgz` is negative-expectancy validation evidence with clean safety:
- deployed commit `d1bb273`.
- `testnet` environment.
- `CAUTION` risk state.
- `-46.55 USDT` daily net.
- `-125.61 USDT` five-window net.
- `-42.67 USDT` latest realized-after-fees.
- `1.54%` max drawdown.
- `0.12%` total allocation across `3` open positions.
- open exposure cost `5.78 USDC`.
- `200` submitted orders, `197` filled, `0` rejected, `3` canceled.
- `6357.51 USDC` buy notional and `6557.45 USDC` sell notional.
- `11.62 USDC` fees.
- `22` entry trades.
- `0` health errors and `0` restarts.

Interpretation: safety is clean and exposure is low, but fresh-entry churn remains too expensive. The July 1 patch closes the risk-governor strong-bull exception so recent after-fee losses block fresh exposure consistently.

## Required Deterministic Scenarios

| Scenario | Why it matters | Current proof | Required next proof |
| --- | --- | --- | --- |
| Exposure cannot grow beyond hard caps | prevents production capital blow-up | live allocation stayed at `0.12%` | keep mapped tests in Gate P1 |
| Sell/unwind remains reachable while fresh exposure is blocked | prevents boxed-in managed exposure | risk-budget test preserves `placeGridSell` and `reduceOnly` | next bundle must keep sell/unwind clean |
| Recent after-fee losses block fresh exposure | prevents strong-bull churn after losses | new risk-budget unit test | next bundle must show lower entries/fills/fees |
| Exchange order rejects do not create retry storms | prevents order chaos | latest bundle has `0` rejects | add synthetic reject fixture later |
| Strategy/adaptation improves after fees | proves product value | still `NOT_BETA_READY` | collect post-patch evidence |

## Strategy Effectiveness Result

`node scripts/t040-strategy-effectiveness-report.js` now reports:
- `NOT_BETA_READY`
- `aiMode=OFF`
- `dailyNet=-46.55`, `fiveWindowNet=-125.61`, `realizedAfterFees=-42.67`
- current window classes: `CONTROLLED_DRAWDOWN=3`, `PROFIT_WINDOW=1`, `NEUTRAL_OR_INCONCLUSIVE=1`
- adaptive shadow signals: `5000` events, `GRID=2285`, `TREND=1910`, `MEAN_REVERSION=805`
- execution lanes observed: `DEFENSIVE=2083`, `MARKET=1606`, `GRID=1136`, `UNSPECIFIED=175`
- top losses after fees: `SYNUSDC=-25.78`, `ZROUSDC=-8.98`, `AIGENSYNUSDC=-7.90`
- top open exposure cost: `AIGENSYNUSDC=2.98`, `SYNUSDC=2.29`, `ZROUSDC=0.52`

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
