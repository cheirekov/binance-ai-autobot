# T040_VALIDATION_MAP

Last updated: 2026-06-17 09:45 UTC
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
| T-026 calibration runner | `node scripts/t026-calibration-runner.js` | `BUILD_BEAR_CHOPPY_FIXTURE`; recent rejects `0`; rank1 `grid_guard_v2` by coarse calibration |
| T-026 fixture comparison syntax | `node --check scripts/t026-fixture-comparison.js` | `PASS` |
| T-026 fixture comparison | `node scripts/t026-fixture-comparison.js --write-report` | `FIXTURE_CANDIDATE_GRID_GUARD_V2`; report at `docs/easy_process/reports/t026-fixture-comparison.json`; rank1 `grid_guard_v2`, rank2 `risk_governor_hysteresis` |
| T-026 grid guard proof syntax | `node --check scripts/t026-grid-guard-proof.js` | `PASS` |
| T-026 grid guard proof | `node scripts/t026-grid-guard-proof.js --write-report` | `GRID_GUARD_OFFLINE_PROOF_TARGET_READY`; report at `docs/easy_process/reports/t026-grid-guard-proof.json`; runtime patch still not allowed |
| T-026 risk governor proof syntax | `node --check scripts/t026-risk-governor-proof.js` | `PASS` |
| T-026 risk governor proof | `node scripts/t026-risk-governor-proof.js --write-report` | `RISK_GOVERNOR_OFFLINE_PROOF_TARGET_READY`; report at `docs/easy_process/reports/t026-risk-governor-proof.json`; runtime patch still not allowed |
| T-026 proof comparison syntax | `node --check scripts/t026-proof-comparison.js` | `PASS` |
| T-026 proof comparison | `node scripts/t026-proof-comparison.js --write-report` | `OFFLINE_PROOF_COMPARE_GRID_PRIMARY_RISK_FALLBACK`; primary `grid_guard_v2`, fallback `risk_governor_hysteresis`; runtime patch still not allowed |
| T-026 strategy replay | `node scripts/t026-strategy-replay.js --limit 120` | `NO_REPLAY_EDGE`; `BUY_HOLD=+4.03%`, `MEAN_REVERSION=+1.18%`, `GRID=+0.85%`, `TREND=-1.49%` |
| T-040 strategy effectiveness syntax | `node --check scripts/t040-strategy-effectiveness-report.js` | `PASS` |
| T-040 strategy effectiveness report | `node scripts/t040-strategy-effectiveness-report.js` | `NOT_BETA_READY`; rule-based adaptation visible but not proven profitable |
| Clean-room strategy signals | `pnpm -C packages/shared test -- strategy-signals` | `PASS` in CI container |
| Adaptive strategy-family scoring | `pnpm -C apps/api exec vitest run src/modules/bot/bot-engine.service.test.ts -t 'strategy families'` | `PASS` in CI container |
| Grid buy pause cancellation | `./node_modules/.bin/vitest run src/modules/bot/bot-engine.service.test.ts -t 'cancels bot grid buy orders' --no-cache` from `apps/api` | `PASS`; bot-owned grid BUY orders are canceled whenever buys are paused |
| Risk-governor hysteresis proof | `pnpm -C apps/api exec vitest run src/modules/bot/risk-budget.service.test.ts -t 'risk-governor hysteresis'` | `PASS` |
| Reference strategy adoption boundary | `docs/easy_process/REFERENCE_STRATEGY_ADOPTION.md` | `MAPPED` |
| PM/BA start gate | `./scripts/pmba-gate.sh start` | `PASS` |
| PM/BA end gate | `./scripts/pmba-gate.sh end` | `PASS` |
| T-040 active validation | `./scripts/validate-active-ticket.sh` | `PASS`; includes no-docs-only loop gate |
| T-040 no-docs-only loop gate | `./scripts/validate-active-ticket.sh` | `PASS`; `VALIDATION_REQUIRED` plus `NOT_BETA_READY` now requires an `apps/` or `packages/` runtime/test change, or `docs/easy_process/OPERATOR_STOP_DECISION.md` with `Decision: STOP_TESTNET` |
| Full CI | `./scripts/validate-active-ticket.sh --full` | `PASS` on 2026-06-05 |
| Latest bundle classification | `./scripts/auto-retro.sh autobot-feedback-20260617-093804.tgz` | `validation_required` |
| Latest session brief refresh | `./scripts/update-session-brief.sh autobot-feedback-20260617-093804.tgz` | `nextTicket=T-040` |

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
- current window classes: `CONTROLLED_DRAWDOWN=2`, `NEUTRAL_OR_INCONCLUSIVE=3`
- safety signals: `rejectedWindowsRecent=0`, `totalRejectedRecent=0`, `repeatedSmallRejects=false`
- preserved fixture file: `docs/easy_process/fixtures/t026/bear_choppy_controlled_drawdown.json`
- coarse calibration ranking: `grid_guard_v2` (`28`), `risk_governor_hysteresis` (`24`), `mean_reversion_gate` (`17`)
- latest fixture source: `autobot-feedback-20260617-093804.tgz`, `autobot-feedback-20260616-152318.tgz`, `autobot-feedback-20260615-065149.tgz`, `autobot-feedback-20260612-063453.tgz`, `autobot-feedback-20260611-090617.tgz`.
- fixture comparison result: `FIXTURE_CANDIDATE_GRID_GUARD_V2`; safety clean, totalDailyNet `-82.06`, totalFees `52.87`, totalRealizedAfterFees `-105.80`, with grid/risk-budget/fee-edge pressure in all five windows.
- fixture comparison ranking: `grid_guard_v2` (`62`), `risk_governor_hysteresis` (`56`), `mean_reversion_gate` (`38`).
- grid guard proof-target result: `GRID_GUARD_OFFLINE_PROOF_TARGET_READY`; eligibleWindows `5`, lossChurnWindows `5`, pausedGridBuyWindows `5`, buyPressure `130`, sellsObserved `352`.
- risk governor proof-target result: `RISK_GOVERNOR_OFFLINE_PROOF_TARGET_READY`; leadingNegative `5`, negativeAfterFees `5`, highExposure `3`, tradeChurn `5`, scoreGap `6`.
- proof comparison result: `OFFLINE_PROOF_COMPARE_GRID_PRIMARY_RISK_FALLBACK`; primary `grid_guard_v2`, fallback `risk_governor_hysteresis`, runtimePatchAllowed `no`, score gap `6`.
- first deterministic proof: `grid_guard_v2` now cancels resting bot-owned GRID BUY orders whenever buys are paused while keeping SELL/reduce-only unwind available; keep risk-governor hysteresis as fallback if grid proof fails acceptance.

This is progress, not promotion. Continue T-040 and use the refreshed negative sequence to build focused offline proof rather than waiting passively for more bundles.

## Strategy Effectiveness Result

`node scripts/t040-strategy-effectiveness-report.js` now reports:
- `NOT_BETA_READY`
- `aiMode=OFF`
- `dailyNet=-29.62`, `fiveWindowNet=-82.06`, `realizedAfterFees=-26.47`
- current window classes: `NEUTRAL_OR_INCONCLUSIVE=3`, `CONTROLLED_DRAWDOWN=2`
- adaptive shadow signals: `5000` events, `TREND=2383`, `GRID=1787`, `MEAN_REVERSION=830`
- execution lanes observed: `DEFENSIVE=2238`, `MARKET=2174`, `GRID=511`, `UNSPECIFIED=77`
- top losses after fees: `WLDUSDC=-16.20`, `JTOUSDC=-5.04`, `XLMUSDC=-3.46`, `ZROUSDC=-1.07`, `INJUSDC=-0.88`
- top open exposure cost: `ZECUSDC=75.38`, `WLDUSDC=1.62`, `JTOUSDC=1.04`, `ETHUSDC=0.92`, `XLMUSDC=0.91`

Client-facing interpretation: the bot is changing rule-based strategy/lane labels, but the latest evidence does not prove profitable adaptation. Beta promotion stays blocked.

## Latest Bundle Evidence

`autobot-feedback-20260617-093804.tgz` is validation-required negative-expectancy evidence:
- `testnet` environment.
- `NORMAL` risk state.
- `-29.62 USDT` daily net.
- `-82.06 USDT` five-window net.
- `0.65%` max drawdown.
- `1.62%` total allocation across `8` open positions.
- `201` submitted orders, `182` filled, `0` rejected, `18` canceled.
- `0` health errors and `0` restarts.
- low sizing reject pressure: `0` sizing rejects.
- strategy effectiveness verdict: `NOT_BETA_READY` because five-window net is `-82.06`, realized-after-fees is `-26.47`, and all latest five fixture windows are negative.
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
