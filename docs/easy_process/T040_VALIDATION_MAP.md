# T040_VALIDATION_MAP

Last updated: 2026-07-13 09:04 UTC
Owner: Validation Engineer + PM/BA

Purpose: make beta-readiness measurable. This file maps each production-readiness question to a command, fixture, or explicit gap.

## Current Command Map

| Validation class | Command / artifact | Status |
| --- | --- | --- |
| T-040 readiness classifier | `node scripts/t040-readiness-check.js` | `VALIDATION_REQUIRED`; negative daily net across latest 3 fresh bundles, no latest P0/P1 safety trigger |
| T-040 strategy effectiveness report | `node scripts/t040-strategy-effectiveness-report.js` | `NOT_BETA_READY`; dailyNet `-25.68`; five-window net `-85.49`; latest realized-after-fees `-53.11` |
| T-026 fixture comparison | `node scripts/t026-fixture-comparison.js` | `FIXTURE_CANDIDATE_GRID_GUARD_V2`; runtimePatchAllowed `no` |
| T-026 grid guard proof | `node scripts/t026-grid-guard-proof.js` | `GRID_GUARD_OFFLINE_PROOF_TARGET_READY`; preserve SELL/reduce-only and managed unwind paths |
| T-026 risk governor proof | `node scripts/t026-risk-governor-proof.js` | `RISK_GOVERNOR_OFFLINE_PROOF_TARGET_READY`; fallback target because candidate score gap is `4` |
| T-026 proof comparison | `node scripts/t026-proof-comparison.js` | `OFFLINE_PROOF_COMPARE_GRID_PRIMARY_RISK_FALLBACK`; build focused offline proof for `grid_guard_v2` |
| Risk-governor strong-bull negative-expectancy test | `./node_modules/.bin/vitest run src/modules/bot/risk-budget.service.test.ts --no-cache` from `apps/api` | `PASS`; strong-bull `NORMAL` no longer bypasses recent negative-expectancy fresh-exposure block |
| Grid/dust guard regression slice | `./node_modules/.bin/vitest run src/modules/bot/bot-engine.service.test.ts -t 'fee-negative dust churn|cancels bot grid buy orders|does not let a dust sell leg block' --no-cache` from `apps/api` | `PASS` |
| Full bot-engine unit file | `./node_modules/.bin/vitest run src/modules/bot/bot-engine.service.test.ts --no-cache` from `apps/api` | `PASS`; 128 tests |
| API TypeScript build check | `./node_modules/.bin/tsc -p tsconfig.build.json --noEmit` from `apps/api` | `PASS` |
| T-040 active validation | `./scripts/validate-active-ticket.sh` | `PASS`; `VALIDATION_REQUIRED`, no-docs-only gate satisfied by deterministic validation-code changes |
| PM/BA start gate | `./scripts/pmba-gate.sh start` | `PASS` |
| PM/BA end gate | `./scripts/pmba-gate.sh end` | `PASS` |
| Full CI | `./scripts/validate-active-ticket.sh --full` | `NOT RUN` in this short patch batch |

## Latest Bundle Evidence

`autobot-feedback-20260713-085946.tgz` is validation-only post-patch evidence:
- deployed commit `e4c9e54`.
- `testnet` environment.
- `NORMAL` risk state.
- `-25.68 USDT` daily net.
- `-85.49 USDT` five-window net.
- `-53.11 USDT` latest realized-after-fees.
- `0.75%` max drawdown.
- `3.10%` total allocation across `13` open positions, mostly `PUMPUSDC`.
- open exposure cost `143.29 USDC`.
- `201` submitted orders, `173` filled, `0` rejected, `27` canceled.
- `5405.72 USDC` buy notional and `5377.91 USDC` sell notional.
- `8.75 USDC` fees.
- `6` entry trades.
- `0` health errors and `0` restarts.
- no exchange/order-sync backoff observed in latest top reasons.

Interpretation: safety and exchange health are clean enough to avoid a runtime hotfix, but beta readiness is still blocked because after-fee expectancy is negative.

## Required Deterministic Scenarios

| Scenario | Why it matters | Current proof | Required next proof |
| --- | --- | --- | --- |
| Exposure cannot grow beyond hard caps | prevents production capital blow-up | live allocation is `3.10%`, mostly PUMP, while risk budget blocks new exposure | next bundle must show PUMP/total exposure not growing beyond the watch level |
| Sell/unwind remains reachable while fresh exposure is blocked | prevents boxed-in managed exposure | risk-budget test preserves `placeGridSell` and `reduceOnly`; July 13 ended with active orders `1` and no rejects | next bundle must keep sell/unwind clean |
| Recent after-fee losses block fresh exposure | prevents strong-bull churn after losses | risk-budget unit test plus July 13 entry count `6`, still far below July 1 `22` | next bundle must keep entries low and reduce fees/filled orders |
| Exchange order rejects do not create retry storms | prevents order chaos | latest bundle has `0` rejects | add synthetic reject fixture later |
| Exchange/order-sync backoff is bounded | prevents trading while order state is untrusted | July 13 has `0` health errors and no backoff top reason | keep detector; no hotfix unless it recurs |
| Strategy/adaptation improves after fees | proves product value | still `NOT_BETA_READY` | build focused offline proof for `grid_guard_v2` before runtime strategy patch |

## Strategy Effectiveness Result

`node scripts/t040-strategy-effectiveness-report.js` now reports:
- `NOT_BETA_READY`
- `aiMode=OFF`
- `dailyNet=-25.68`, `fiveWindowNet=-85.49`, `realizedAfterFees=-53.11`
- current window classes: `SAFETY_FAILURE=1`, `CONTROLLED_DRAWDOWN=2`, `PROFIT_WINDOW=1`, `NEUTRAL_OR_INCONCLUSIVE=1`
- adaptive shadow signals: `5000` events, `GRID=2546`, `MEAN_REVERSION=1335`, `TREND=1119`
- execution lanes observed: `DEFENSIVE=3172`, `MARKET=933`, `GRID=878`, `UNSPECIFIED=17`
- top losses after fees: `WLDUSDC=-13.84`, `ARBUSDC=-9.83`, `SENTUSDC=-5.07`, `ZECUSDC=-4.66`, `TLMUSDC=-3.71`
- top open exposure cost: `PUMPUSDC=138.57`, `ARBUSDC=1.55`, `WLDUSDC=1.22`, `ZECUSDC=0.53`, `AAVEUSDC=0.49`

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
