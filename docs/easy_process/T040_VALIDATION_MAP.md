# T040_VALIDATION_MAP

Last updated: 2026-06-12 06:49 UTC
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
| T-026 calibration runner | `node scripts/t026-calibration-runner.js` | `BUILD_BEAR_CHOPPY_FIXTURE`; recent rejects `0`; rank1 `risk_governor_hysteresis` by coarse calibration |
| T-026 fixture comparison syntax | `node --check scripts/t026-fixture-comparison.js` | `PASS` |
| T-026 fixture comparison | `node scripts/t026-fixture-comparison.js --write-report` | `FIXTURE_CANDIDATE_GRID_GUARD_V2`; report at `docs/easy_process/reports/t026-fixture-comparison.json`; rank1 `grid_guard_v2`, rank2 `risk_governor_hysteresis` |
| T-026 grid guard proof syntax | `node --check scripts/t026-grid-guard-proof.js` | `PASS` |
| T-026 grid guard proof | `node scripts/t026-grid-guard-proof.js --write-report` | `GRID_GUARD_OFFLINE_PROOF_TARGET_READY`; report at `docs/easy_process/reports/t026-grid-guard-proof.json`; runtime patch still not allowed |
| T-026 strategy replay | `node scripts/t026-strategy-replay.js --limit 120` | `NO_REPLAY_EDGE`; `BUY_HOLD=+4.03%`, `MEAN_REVERSION=+1.18%`, `GRID=+0.85%`, `TREND=-1.49%` |
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
| Latest bundle classification | `./scripts/auto-retro.sh autobot-feedback-20260612-063453.tgz` | `validation_required` |
| Latest session brief refresh | `./scripts/update-session-brief.sh autobot-feedback-20260612-063453.tgz` | `nextTicket=T-040` |

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
- current window classes: `CONTROLLED_DRAWDOWN=4`, `NEUTRAL_OR_INCONCLUSIVE=1`
- safety signals: `rejectedWindowsRecent=0`, `totalRejectedRecent=0`, `repeatedSmallRejects=false`
- preserved fixture file: `docs/easy_process/fixtures/t026/bear_choppy_controlled_drawdown.json`
- coarse calibration ranking: `risk_governor_hysteresis` (`34`), `grid_guard_v2` (`32`), `mean_reversion_gate` (`25`)
- latest fixture source: `autobot-feedback-20260612-063453.tgz`, `autobot-feedback-20260611-090617.tgz`, `autobot-feedback-20260610-082902.tgz`, `autobot-feedback-20260609-081440.tgz`, `autobot-feedback-20260608-073438.tgz`.
- fixture comparison result: `FIXTURE_CANDIDATE_GRID_GUARD_V2`; safety clean, totalDailyNet `-37.93`, totalFees `49.28`, totalRealizedAfterFees `-73.01`, with grid/risk-budget/fee-edge pressure in all five windows.
- fixture comparison ranking: `grid_guard_v2` (`54`), `risk_governor_hysteresis` (`52`), `mean_reversion_gate` (`38`).
- grid guard proof-target result: `GRID_GUARD_OFFLINE_PROOF_TARGET_READY`; eligibleWindows `5`, lossChurnWindows `5`, pausedGridBuyWindows `3`, buyPressure `75`, sellsObserved `344`.
- first deterministic proof: `risk_governor_hysteresis` blocks BUY/market exposure after negative expectancy while keeping SELL/reduce-only unwind available.

This is progress, not promotion. Continue T-040 and use the refreshed negative sequence to build focused offline proof rather than waiting passively for more bundles.

## Strategy Effectiveness Result

`node scripts/t040-strategy-effectiveness-report.js` now reports:
- `NOT_BETA_READY`
- `aiMode=OFF`
- `dailyNet=-7.00`, `fiveWindowNet=-37.93`, `realizedAfterFees=-21.25`
- current window classes: `CONTROLLED_DRAWDOWN=4`, `NEUTRAL_OR_INCONCLUSIVE=1`
- adaptive shadow signals: `5000` events, `TREND=2352`, `GRID=1700`, `MEAN_REVERSION=948`
- execution lanes observed: `MARKET=2460`, `DEFENSIVE=1328`, `GRID=998`, `UNSPECIFIED=214`
- top losses after fees: `KATUSDC=-11.44`, `CRVUSDC=-5.17`, `OPNUSDC=-4.12`, `NEARUSDC=-2.21`, `HMSTRUSDC=-1.54`
- top open exposure cost: `ETHUSDC=112.23`, `KATUSDC=1.86`, `CRVUSDC=1.58`, `EPICUSDC=0.57`, `OPNUSDC=0.34`

Client-facing interpretation: the bot is changing rule-based strategy/lane labels, but the latest evidence does not prove profitable adaptation. Beta promotion stays blocked.

## Latest Bundle Evidence

`autobot-feedback-20260612-063453.tgz` is validation-required negative-expectancy evidence:
- `testnet` environment.
- `NORMAL` risk state.
- `-7.00 USDT` daily net.
- `-37.93 USDT` five-window net.
- `0.62%` max drawdown.
- `2.33%` total allocation across `9` open positions.
- `201` submitted orders, `176` filled, `0` rejected, `24` canceled.
- `0` health errors and `0` restarts.
- low sizing reject pressure: `0` sizing rejects.
- strategy effectiveness verdict: `NOT_BETA_READY` because five-window net is `-37.93`, realized-after-fees is `-21.25`, and all latest five fixture windows are negative.
- top skip reasons are ordinary risk-budget market-entry caps, blocked new exposure, grid-buy pauses, and fee/edge filters.

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
