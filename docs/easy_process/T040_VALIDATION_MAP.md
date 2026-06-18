# T040_VALIDATION_MAP

Last updated: 2026-06-18 09:07 UTC
Owner: Validation Engineer + PM/BA

Purpose: make beta-readiness measurable. This file maps each production-readiness question to a command, fixture, or explicit gap.

## Current Command Map

| Validation class | Command / artifact | Status |
| --- | --- | --- |
| Process syntax | `bash -n scripts/auto-retro.sh scripts/update-session-brief.sh scripts/pmba-gate.sh scripts/validate-active-ticket.sh` | `PASS` |
| Latest bundle classification | `./scripts/auto-retro.sh autobot-feedback-20260618-090049.tgz` | `validation_required` |
| Latest session brief refresh | `./scripts/update-session-brief.sh autobot-feedback-20260618-090049.tgz` | `nextTicket=T-040` |
| T-040 readiness classifier | `node scripts/t040-readiness-check.js` | `VALIDATION_REQUIRED` |
| T-040 strategy effectiveness report | `node scripts/t040-strategy-effectiveness-report.js` | `NOT_BETA_READY`; five-window net `-112.73`; latest realized-after-fees `-58.82` |
| T-026 calibration runner | `node scripts/t026-calibration-runner.js --write-fixture` | `BUILD_BEAR_CHOPPY_FIXTURE`; latest fixture source is June 12/15/16/17/18 |
| T-026 fixture comparison | `node scripts/t026-fixture-comparison.js --write-report` | `FIXTURE_CANDIDATE_GRID_GUARD_V2`; totalDailyNet `-112.73`; totalFees `55.23`; totalRealizedAfterFees `-147.66` |
| T-026 grid guard proof | `node scripts/t026-grid-guard-proof.js --write-report` | `GRID_GUARD_OFFLINE_PROOF_TARGET_READY`; buyPressure `147`; sellsObserved `373` |
| T-026 risk governor proof | `node scripts/t026-risk-governor-proof.js --write-report` | `RISK_GOVERNOR_OFFLINE_PROOF_TARGET_READY`; score gap `4` |
| T-026 proof comparison | `node scripts/t026-proof-comparison.js --write-report` | `OFFLINE_PROOF_COMPARE_GRID_PRIMARY_RISK_FALLBACK`; primary `grid_guard_v2`, fallback `risk_governor_hysteresis` |
| Grid buy pause cancellation | `./node_modules/.bin/vitest run src/modules/bot/bot-engine.service.test.ts -t 'cancels bot grid buy orders' --no-cache` from `apps/api` | `PASS` |
| Negative dust-churn GRID buy guard | `./node_modules/.bin/vitest run src/modules/bot/bot-engine.service.test.ts -t 'fee-negative dust churn' --no-cache` from `apps/api` | `PASS`; pauses BUY only for losing dust exposure without actionable sell leg |
| Full bot-engine unit file | `./node_modules/.bin/vitest run src/modules/bot/bot-engine.service.test.ts --no-cache` from `apps/api` | `PASS`; 128 tests |
| Risk-budget unit file | `./node_modules/.bin/vitest run src/modules/bot/risk-budget.service.test.ts --no-cache` from `apps/api` | `PASS`; 6 tests |
| API TypeScript build check | `./node_modules/.bin/tsc -p tsconfig.build.json --noEmit` from `apps/api` | `PASS` |
| T-040 active validation | `./scripts/validate-active-ticket.sh` | `PASS`; includes no-docs-only loop gate and runtime/test changes present |
| PM/BA start gate | `./scripts/pmba-gate.sh start` | `PASS` |
| PM/BA end gate | `./scripts/pmba-gate.sh end` | `PASS` |
| Full CI | `./scripts/validate-active-ticket.sh --full` | `NOT RUN` in this short patch batch |

## Latest Bundle Evidence

`autobot-feedback-20260618-090049.tgz` is validation-required negative-expectancy evidence with a P1 dust-churn mitigation:
- `testnet` environment.
- `NORMAL` risk state.
- `-39.77 USDT` daily net.
- `-112.73 USDT` five-window net.
- `-58.82 USDT` latest realized-after-fees.
- `1.09%` max drawdown.
- `0.11%` total allocation across `7` open positions.
- open exposure cost `5.42 USDC`.
- `201` submitted orders, `186` filled, `0` rejected, `14` canceled.
- `5859.88 USDC` buy notional and `6060.27 USDC` sell notional despite `0` entry trades.
- `10.83 USDC` fees.
- `0` health errors and `0` restarts.

Interpretation: exposure control improved, but GRID/order churn remained unacceptable. The June 18 runtime patch targets that churn path by pausing and canceling BUY ladders only when recent fills are negative after fees and the remaining position is dust-sized without an actionable sell leg.

## Required Deterministic Scenarios

| Scenario | Why it matters | Current proof | Required next proof |
| --- | --- | --- | --- |
| Exposure cannot grow beyond hard caps | prevents production capital blow-up | existing risk-budget tests and live allocation at `0.11%` | keep mapped tests in Gate P1 |
| Sell/unwind remains reachable while BUY is suppressed | prevents boxed-in managed exposure | bot-engine test for dust-churn guard excludes active/actionable sell legs; SELL branch unchanged | next bundle must show no sell/unwind blockage |
| Fee-negative dust GRID churn is suppressed | prevents wallet bleed from high notional around tiny exposure | new `fee-negative dust churn` unit test plus runtime patch | next bundle must show lower fills, notional, and fees |
| Exchange order rejects do not create retry storms | prevents order chaos | latest bundle has `0` rejects | add synthetic reject fixture later |
| Order-sync/backoff state is visible and recoverable | prevents silent stuck execution | latest bundle has no backoff in top reasons; auto-retro checks backoff | add deterministic bundle fixture later |
| Fee-aware PnL accounting is stable | prevents false profitability | bot-engine tests and strategy-effectiveness report | keep in T-040 target list |
| Restart preserves state and operator visibility | prevents hidden position/order loss | config/state persistence exists | add restart fixture or documented manual test |
| Range/choppy behavior is classified | proves adaptation beyond one bundle | refreshed `bear_choppy_controlled_drawdown` fixture | validate next bundle after deployment |
| Trend-leaning behavior is classified | proves adaptation beyond one bundle | May 29 and June 3 positive windows are live readiness evidence | select replay or synthetic equivalent |

## Strategy Effectiveness Result

`node scripts/t040-strategy-effectiveness-report.js` now reports:
- `NOT_BETA_READY`
- `aiMode=OFF`
- `dailyNet=-39.77`, `fiveWindowNet=-112.73`, `realizedAfterFees=-58.82`
- current window classes: `CONTROLLED_DRAWDOWN=3`, `NEUTRAL_OR_INCONCLUSIVE=2`
- adaptive shadow signals: `5000` events, `TREND=2597`, `GRID=1277`, `MEAN_REVERSION=1126`
- execution lanes observed: `MARKET=2367`, `DEFENSIVE=2048`, `GRID=478`, `UNSPECIFIED=107`
- top losses after fees: `XPLUSDC=-16.89`, `WLDUSDC=-12.61`, `XLMUSDC=-10.19`, `ASTERUSDC=-9.68`, `ENAUSDC=-3.86`
- top open exposure cost: `XPLUSDC=2.08`, `ASTERUSDC=1.51`, `XLMUSDC=0.97`, `WLDUSDC=0.54`, `ENAUSDC=0.15`

Client-facing interpretation: the bot is changing rule-based strategy/lane labels, but the latest evidence does not prove profitable adaptation. Beta promotion stays blocked.

## Severity Routing

Use this routing before creating any runtime patch:

| Evidence | Action |
| --- | --- |
| uncontrolled exposure growth | `P0/P1 PATCH_ALLOWED` |
| repeated exchange rejects or stuck order-sync | `P0/P1 PATCH_ALLOWED` after reproduction |
| inability to sell/unwind managed exposure | `P0/P1 PATCH_ALLOWED` after reproduction |
| broken PnL/exposure accounting | `P0/P1 PATCH_ALLOWED` after reproduction |
| crash/restart instability | `P0/P1 PATCH_ALLOWED` after reproduction |
| high-notional fee churn around dust exposure | `P1 PATCH_ALLOWED` with deterministic test |
| ordinary skip churn, no-feasible loops, negative daily net, min-notional pressure | `VALIDATION_ONLY` or backlog |

## Done For Gate P1

Gate P1 is ready for PM/BA review when:
- every required scenario above is `PASS` or explicitly accepted as a beta risk.
- `./scripts/validate-active-ticket.sh` passes in T-040 mode.
- `./scripts/validate-active-ticket.sh --full` passes.
- release/rollback steps are documented.
- strategy effectiveness is no longer `NOT_BETA_READY`, or PM/BA explicitly accepts the remaining negative expectancy as beta risk.
