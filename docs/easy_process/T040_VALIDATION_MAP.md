# T040_VALIDATION_MAP

Last updated: 2026-07-14 08:24 UTC
Owner: Validation Engineer + PM/BA

Purpose: make beta-readiness measurable. This file maps each production-readiness question to a command, fixture, or explicit gap.

## Current Command Map

| Validation class | Command / artifact | Status |
| --- | --- | --- |
| T-040 readiness classifier | `node scripts/t040-readiness-check.js` | `VALIDATION_REQUIRED`; negative daily net across latest 3 fresh bundles, no latest P0/P1 safety trigger |
| T-040 strategy effectiveness report | `node scripts/t040-strategy-effectiveness-report.js` | `NOT_BETA_READY`; dailyNet `-31.07`; five-window net `-119.63`; latest realized-after-fees `-72.46` |
| T-026 fixture comparison | `node scripts/t026-fixture-comparison.js` | `FIXTURE_CANDIDATE_GRID_GUARD_V2`; runtimePatchAllowed `no` |
| T-026 grid guard proof | `node scripts/t026-grid-guard-proof.js` | `GRID_GUARD_OFFLINE_PROOF_TARGET_READY`; preserve SELL/reduce-only and managed unwind paths |
| T-026 entry burst proof | `node --test scripts/t026-entry-burst-proof.test.js && node scripts/t026-entry-burst-proof.js` | `PASS` twice: July 13→14 improved mark-to-market `5.74 USDC` and exposure `92.27 USDC`; June 4→5 improved mark-to-market `0.95 USDC` and exposure `18.63 USDC` |
| T-026 risk governor proof | `node scripts/t026-risk-governor-proof.js` | `RISK_GOVERNOR_OFFLINE_PROOF_TARGET_READY`; fallback target because candidate score gap is `4` |
| T-026 proof comparison | `node scripts/t026-proof-comparison.js` | `OFFLINE_PROOF_COMPARE_ENTRY_BURST_CONFIRMED`; risk governor remains fallback |
| Entry-burst runtime guard | `vitest run src/modules/bot/bot-engine.service.test.ts -t 'caps repeated neutral market entries'` | `PASS`; cap is risk-linked, ignores GRID buys, resets after SELL |
| Risk-governor strong-bull negative-expectancy test | `./node_modules/.bin/vitest run src/modules/bot/risk-budget.service.test.ts --no-cache` from `apps/api` | `PASS`; strong-bull `NORMAL` no longer bypasses recent negative-expectancy fresh-exposure block |
| Grid/dust guard regression slice | `./node_modules/.bin/vitest run src/modules/bot/bot-engine.service.test.ts -t 'fee-negative dust churn|cancels bot grid buy orders|does not let a dust sell leg block' --no-cache` from `apps/api` | `PASS` |
| Full bot-engine unit file | `./node_modules/.bin/vitest run src/modules/bot/bot-engine.service.test.ts --no-cache` from `apps/api` | `PASS`; 128 tests |
| API TypeScript build check | `./node_modules/.bin/tsc -p tsconfig.build.json --noEmit` from `apps/api` | `PASS` |
| T-040 active validation | `./scripts/validate-active-ticket.sh` | `PASS`; `VALIDATION_REQUIRED`, no-docs-only gate satisfied by deterministic validation-code changes |
| PM/BA start gate | `./scripts/pmba-gate.sh start` | `PASS` |
| PM/BA end gate | `./scripts/pmba-gate.sh end` | `PASS` |
| Full CI | `./scripts/validate-active-ticket.sh --full` | `NOT RUN` in this short patch batch |

## Latest Bundle Evidence

`autobot-feedback-20260714-075300.tgz` is validation-only evidence:
- deployed commit `e4c9e54`.
- `testnet` environment.
- `NORMAL` risk state.
- `-31.07 USDT` daily net; `-119.63 USDT` five-window net; `-72.46 USDT` realized-after-fees.
- `0.93%` max drawdown; `5.09%` total allocation across `13` open positions.
- open exposure cost `233.66 USDC`, mostly `ZECUSDC=229.74`.
- `201` submitted orders, `169` filled, `0` rejected; `8.31 USDC` fees; `4` reported entry trades.
- `0` health errors and `0` restarts.
- no exchange/order-sync backoff observed in latest top reasons.

Interpretation: safety and exchange health are clean enough to avoid a runtime hotfix, but beta readiness is still blocked because after-fee expectancy is negative.

## Required Deterministic Scenarios

| Scenario | Why it matters | Current proof | Required next proof |
| --- | --- | --- | --- |
| Exposure cannot grow beyond hard caps | prevents production capital blow-up | live allocation is `5.09%`, mostly ZEC | next bundle must show ZEC/total exposure not growing beyond the watch level |
| Sell/unwind remains reachable while fresh exposure is blocked | prevents boxed-in managed exposure | two replays preserve all sell instructions; runtime guard is evaluated only after exit handling | confirm post-deploy |
| Repeated neutral/range entries are bounded | prevents identical signals stacking exposure before a stop | two independent replays pass; runtime unit test passes | confirm post-deploy third entry is skipped |
| Exchange order rejects do not create retry storms | prevents order chaos | latest bundle has `0` rejects | add synthetic reject fixture later |
| Exchange/order-sync backoff is bounded | prevents trading while order state is untrusted | July 13 has `0` health errors and no backoff top reason | keep detector; no hotfix unless it recurs |
| Strategy/adaptation improves after fees | proves product value | still `NOT_BETA_READY`; entry-burst proof confirmed twice and testnet patch implemented | collect post-deploy evidence |

## Strategy Effectiveness Result

`node scripts/t040-strategy-effectiveness-report.js` now reports:
- `NOT_BETA_READY`
- `aiMode=OFF`
- `dailyNet=-31.07`, `fiveWindowNet=-119.63`, `realizedAfterFees=-72.46`
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
