# T040_VALIDATION_MAP

Last updated: 2026-06-19 08:58 UTC
Owner: Validation Engineer + PM/BA

Purpose: make beta-readiness measurable. This file maps each production-readiness question to a command, fixture, or explicit gap.

## Current Command Map

| Validation class | Command / artifact | Status |
| --- | --- | --- |
| T-040 readiness classifier | `node scripts/t040-readiness-check.js` | `CONTINUE_READINESS` |
| T-040 strategy effectiveness report | `node scripts/t040-strategy-effectiveness-report.js` | `NOT_BETA_READY`; dailyNet `+3.07`; five-window net `-102.66`; latest realized-after-fees `-24.73` |
| T-026 calibration runner | `node scripts/t026-calibration-runner.js` | `KEEP_COLLECTING_AND_LABEL_REGIME`; latest window is `PROFIT_WINDOW` |
| T-040 active validation | `./scripts/validate-active-ticket.sh` | `PASS`; PM/BA gates passed; no runtime patch required |
| PM/BA end gate | `./scripts/pmba-gate.sh end` | `PASS` during ingestion; warning only for repeated no-feasible skip loop |
| Full CI | `./scripts/validate-active-ticket.sh --full` | `NOT RUN` in this validation-only batch |

## Latest Bundle Evidence

`autobot-feedback-20260619-085557.tgz` is an improving post-deploy validation bundle:
- deployed commit `5cb40be`.
- `testnet` environment.
- `NORMAL` risk state.
- `+3.07 USDT` daily net.
- `-102.66 USDT` five-window net.
- `-24.73 USDT` latest realized-after-fees.
- `1.29%` max drawdown.
- `0.10%` total allocation across `7` open positions.
- open exposure cost `5.16 USDC`.
- `200` submitted orders, `190` filled, `0` rejected, `10` canceled.
- `5748.19 USDC` buy notional and `5950.75 USDC` sell notional.
- `9.07 USDC` fees.
- `0` health errors and `0` restarts.

Interpretation: the June 18 guard improved daily net, fees, and realized-after-fees, but filled-order churn and notional remain high. Continue validation; do not patch runtime from repeated no-feasible skips alone.

## Required Deterministic Scenarios

| Scenario | Why it matters | Current proof | Required next proof |
| --- | --- | --- | --- |
| Exposure cannot grow beyond hard caps | prevents production capital blow-up | live allocation stayed at `0.10%` | keep mapped tests in Gate P1 |
| Sell/unwind remains reachable while BUY is suppressed | prevents boxed-in managed exposure | `82` sells, `0` rejects, no health errors | next bundle must keep sell/unwind clean |
| Fee-negative dust GRID churn is suppressed | prevents wallet bleed from high notional around tiny exposure | daily net and realized-after-fees improved after deploy | next bundle must show lower fills/notional/fees |
| Exchange order rejects do not create retry storms | prevents order chaos | latest bundle has `0` rejects | add synthetic reject fixture later |
| Strategy/adaptation improves after fees | proves product value | still `NOT_BETA_READY` | collect more post-deploy evidence |

## Strategy Effectiveness Result

`node scripts/t040-strategy-effectiveness-report.js` now reports:
- `NOT_BETA_READY`
- `aiMode=OFF`
- `dailyNet=+3.07`, `fiveWindowNet=-102.66`, `realizedAfterFees=-24.73`
- current window classes: `PROFIT_WINDOW=1`, `CONTROLLED_DRAWDOWN=2`, `NEUTRAL_OR_INCONCLUSIVE=2`
- adaptive shadow signals: `5000` events, `TREND=2487`, `GRID=1488`, `MEAN_REVERSION=1025`
- execution lanes observed: `DEFENSIVE=2062`, `MARKET=1915`, `GRID=650`, `UNSPECIFIED=373`
- top losses after fees: `XLMUSDC=-13.58`, `ASTERUSDC=-11.90`, `XPLUSDC=-7.35`, `ENAUSDC=-3.86`, `WLDUSDC=+0.98`
- top open exposure cost: `XPLUSDC=1.72`, `ASTERUSDC=1.24`, `SYNUSDC=1.23`, `XLMUSDC=0.48`, `NEARUSDC=0.21`

Client-facing interpretation: the bot is changing rule-based strategy/lane labels and the latest post-deploy window improved, but beta promotion stays blocked until improvement is repeatable and after-fee expectancy is no longer negative.

## Severity Routing

Use this routing before creating any runtime patch:

| Evidence | Action |
| --- | --- |
| uncontrolled exposure growth | `P0/P1 PATCH_ALLOWED` |
| repeated exchange rejects or stuck order-sync | `P0/P1 PATCH_ALLOWED` after reproduction |
| inability to sell/unwind managed exposure | `P0/P1 PATCH_ALLOWED` after reproduction |
| broken PnL/exposure accounting | `P0/P1 PATCH_ALLOWED` after reproduction |
| crash/restart instability | `P0/P1 PATCH_ALLOWED` after reproduction |
| high-notional fee churn around dust exposure with worsening realized-after-fees | `P1 PATCH_ALLOWED` with deterministic test |
| repeated no-feasible skips with clean safety and improving net behavior | `VALIDATION_ONLY` |

## Done For Gate P1

Gate P1 is ready for PM/BA review when:
- every required scenario above is `PASS` or explicitly accepted as a beta risk.
- `./scripts/validate-active-ticket.sh` passes in T-040 mode.
- `./scripts/validate-active-ticket.sh --full` passes.
- release/rollback steps are documented.
- strategy effectiveness is no longer `NOT_BETA_READY`, or PM/BA explicitly accepts the remaining negative expectancy as beta risk.
