# T040_VALIDATION_MAP

Last updated: 2026-06-10 08:29 UTC
Owner: Validation Engineer + PM/BA

Purpose: make beta-readiness measurable. This file maps each production-readiness question to a command, fixture, or explicit gap.

## Current Command Map

| Validation class | Command / artifact | Status |
| --- | --- | --- |
| Process syntax | `bash -n scripts/auto-retro.sh scripts/update-session-brief.sh scripts/pmba-gate.sh scripts/validate-active-ticket.sh` | `PASS` |
| Evidence parser syntax | `node --check scripts/feedback-evidence.js` | `PASS` |
| T-040 readiness classifier syntax | `node --check scripts/t040-readiness-check.js` | `PASS` |
| T-040 readiness classifier | `node scripts/t040-readiness-check.js` | `VALIDATION_REQUIRED` |
| T-026 calibration runner syntax | `node --check scripts/t026-calibration-runner.js` | `PASS` |
| T-026 calibration runner | `node scripts/t026-calibration-runner.js` | `BUILD_BEAR_CHOPPY_FIXTURE`; recent rejects `0` |
| T-026 strategy replay | `node scripts/t026-strategy-replay.js --limit 120` | `REPLAY_CANDIDATE_TREND`; `TREND=+1.14%`, `GRID=+0.08%`, `MEAN_REVERSION=-0.81%` |
| T-040 strategy effectiveness syntax | `node --check scripts/t040-strategy-effectiveness-report.js` | `PASS` |
| T-040 strategy effectiveness report | `node scripts/t040-strategy-effectiveness-report.js` | `NOT_BETA_READY`; rule-based adaptation visible but not proven profitable |
| Clean-room strategy signals | `pnpm -C packages/shared test -- strategy-signals` | `PASS` in CI container |
| Adaptive strategy-family scoring | `pnpm -C apps/api exec vitest run src/modules/bot/bot-engine.service.test.ts -t 'strategy families'` | `PASS` in CI container |
| Risk-governor hysteresis proof | `pnpm -C apps/api exec vitest run src/modules/bot/risk-budget.service.test.ts -t 'risk-governor hysteresis'` | `PASS` |
| Reference strategy adoption boundary | `docs/easy_process/REFERENCE_STRATEGY_ADOPTION.md` | `MAPPED` |
| PM/BA start gate | `./scripts/pmba-gate.sh start` | `PASS` |
| PM/BA end gate | `./scripts/pmba-gate.sh end` | `PASS` |
| T-040 active validation | `./scripts/validate-active-ticket.sh` | `MAPPED_THIS_BATCH` |
| Full CI | `./scripts/validate-active-ticket.sh --full` | `PASS` on 2026-06-05 |
| Latest bundle classification | `./scripts/auto-retro.sh autobot-feedback-20260610-082902.tgz` | `validation_required` |
| Latest session brief refresh | `./scripts/update-session-brief.sh autobot-feedback-20260610-082902.tgz` | `nextTicket=T-040` |

## Required Deterministic Scenarios

| Scenario | Why it matters | Current proof | Required next proof |
| --- | --- | --- | --- |
| Exposure cannot grow beyond hard caps | prevents production capital blow-up | existing risk-budget tests | map exact test names to Gate P1 |
| Sell/unwind remains reachable under reserve starvation | prevents boxed-in managed exposure | live evidence + bot-engine tests | add explicit T-040 test target |
| Exchange order rejects do not create retry storms | prevents fee/order chaos | latest six readiness bundles have `0` rejected orders | add synthetic reject fixture |
| Order-sync/backoff state is visible and recoverable | prevents silent stuck execution | latest six readiness bundles have no backoff in top reasons; auto-retro checks backoff | add deterministic bundle fixture |
| Sizing/min-order rejects stay bounded | prevents hidden churn and unproductive grid attempts | June 5 sizing reject pressure is `low` at `3.0%` after June 4 medium `14.0%`; exchange rejects remain `0` | include both windows in `grid_guard_v2` offline comparison and add acceptance threshold |
| Fee-aware PnL accounting is stable | prevents false profitability | bot-engine tests | include in T-040 target list |
| Restart preserves state and operator visibility | prevents hidden position/order loss | config/state persistence exists | add restart fixture or documented manual test |
| Range/choppy market behavior is classified | proves adaptation beyond one bundle | June 1/2/4/5 controlled drawdowns plus generated `bear_choppy_controlled_drawdown` fixture; strategy effectiveness report is `NOT_BETA_READY` | add offline comparison report and acceptance threshold |
| Trend-leaning market behavior is classified | proves adaptation beyond one bundle | May 29 and June 3 positive windows are live readiness evidence | select replay or synthetic equivalent |
| AI/news cannot directly drive orders | protects hard risk contract | policy docs | add explicit gate/test or config assertion |
| Reference strategy can be evaluated offline | prevents blind live strategy copy | adoption plan exists | implement `T-026` replay/calibration runner |

## T-026 Calibration Result

`node scripts/t026-calibration-runner.js` now recommends:
- `BUILD_BEAR_CHOPPY_FIXTURE`
- current window classes: `CONTROLLED_DRAWDOWN=4`, `PROFIT_WINDOW=1`
- safety signals: `rejectedWindowsRecent=0`, `totalRejectedRecent=0`, `repeatedSmallRejects=false`
- preserved fixture file: `docs/easy_process/fixtures/t026/bear_choppy_controlled_drawdown.json`
- preserved candidate families: `risk_governor_hysteresis`, `grid_guard_v2`, `mean_reversion_gate`
- latest fixture source: `autobot-feedback-20260610-082902.tgz`, `autobot-feedback-20260609-081440.tgz`, `autobot-feedback-20260608-073438.tgz`, `autobot-feedback-20260606-151705.tgz`, `autobot-feedback-20260605-075150.tgz`.
- first deterministic proof: `risk_governor_hysteresis` blocks BUY/market exposure after negative expectancy while keeping SELL/reduce-only unwind available.

This is progress, not promotion. Continue T-040 and use the mixed positive/drawdown evidence to build offline comparison reports rather than waiting passively for more bundles.

## Strategy Effectiveness Result

`node scripts/t040-strategy-effectiveness-report.js` now reports:
- `NOT_BETA_READY`
- `aiMode=OFF`
- `dailyNet=-5.33`, `fiveWindowNet=-17.67`, `realizedAfterFees=-13.33`
- current window classes: `CONTROLLED_DRAWDOWN=4`, `PROFIT_WINDOW=1`
- adaptive shadow signals: `2887` events, `TREND=1337`, `GRID=902`, `MEAN_REVERSION=648`
- execution lanes observed: `MARKET=1468`, `GRID=737`, `DEFENSIVE=488`, `UNSPECIFIED=194`
- top losses after fees: `MOVEUSDC=-11.31`, `NEARUSDC=-4.36`, `ZECUSDC=-3.70`, `GENIUSUSDC=-1.94`
- top open exposure cost: `WLDUSDC=151.00`, `ALLOUSDC=2.83`, `MOVEUSDC=0.80`

Client-facing interpretation: the bot is changing rule-based strategy/lane labels, but the latest evidence does not prove profitable adaptation. Beta promotion stays blocked.

## Latest Bundle Evidence

`autobot-feedback-20260610-082902.tgz` is validation-required controlled-drawdown evidence:
- `testnet` environment.
- `NORMAL` risk state.
- `-5.33 USDT` daily net.
- `0.60%` max drawdown.
- `3.09%` total allocation across `8` open positions.
- `200` submitted orders, `159` filled, `0` rejected, `41` canceled.
- `0` health errors and `0` restarts.
- low sizing reject pressure: `12` sizing rejects, `6.0%` of decisions.
- strategy effectiveness verdict: `NOT_BETA_READY` because five-window net is `-17.67`, realized-after-fees is `-13.33`, and four of the latest five windows are controlled drawdowns.
- top skip reasons are ordinary no-feasible, fee/edge, and risk-budget grid-buy pauses.

This does not close Gate P1. It puts the lane in `VALIDATION_REQUIRED` because the latest three fresh windows are negative, while safety remains clean and runtime patching still requires deterministic proof.

## Severity Routing

Use this routing before creating any runtime patch:

| Evidence | Action |
| --- | --- |
| uncontrolled exposure growth | `P0/P1 PATCH_ALLOWED` |
| repeated exchange rejects or stuck order-sync | `P0/P1 PATCH_ALLOWED` after reproduction |
| inability to sell/unwind managed exposure | `P0/P1 PATCH_ALLOWED` after reproduction |
| broken PnL/exposure accounting | `P0/P1 PATCH_ALLOWED` after reproduction |
| crash/restart instability | `P0/P1 PATCH_ALLOWED` after reproduction |
| ordinary skip churn, no-feasible loops, negative daily net, min-notional pressure | `VALIDATION_ONLY` or backlog |
| one strong live-market observation without deterministic proof | `VALIDATION_ONLY` |

## Done For Gate P1

Gate P1 is ready for PM/BA review when:
- every required scenario above is `PASS` or explicitly accepted as a beta risk.
- `./scripts/validate-active-ticket.sh` passes in T-040 mode.
- `./scripts/validate-active-ticket.sh --full` passes.
- `docs/easy_process/T040_BETA_READINESS_PACKET.md` has no `PARTIAL` row without an owner/action.
- release/rollback steps are documented.
