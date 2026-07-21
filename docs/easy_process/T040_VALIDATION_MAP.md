# T040_VALIDATION_MAP

Last updated: 2026-07-21 12:05 UTC
Owner: Validation Engineer + PM/BA

Purpose: make beta-readiness measurable. This file maps each production-readiness question to a command, fixture, or explicit gap.

## Current Command Map

| Validation class | Command / artifact | Status |
| --- | --- | --- |
| T-040 readiness classifier | `node scripts/t040-readiness-check.js` | `VALIDATION_REQUIRED`; negative daily net across latest 3 fresh bundles, no latest P0/P1 safety trigger |
| T-040 strategy effectiveness report | `node scripts/t040-strategy-effectiveness-report.js` | `NOT_BETA_READY`; dailyNet `-17.89`; five-window net `-90.97`; latest realized-after-fees `-28.72` |
| T-026 fixture comparison | `node scripts/t026-fixture-comparison.js` | `FIXTURE_CANDIDATE_GRID_GUARD_V2`; runtimePatchAllowed `no` |
| T-026 grid guard proof | `node scripts/t026-grid-guard-proof.js` | `GRID_GUARD_OFFLINE_PROOF_TARGET_READY`; preserve SELL/reduce-only and managed unwind paths |
| T-026 entry burst proof | `node --test scripts/t026-entry-burst-proof.test.js && node scripts/t026-entry-burst-proof.js` | `PASS` twice: July 13→14 improved mark-to-market `5.74 USDC` and exposure `92.27 USDC`; June 4→5 improved mark-to-market `0.95 USDC` and exposure `18.63 USDC` |
| T-026 risk governor proof | `node scripts/t026-risk-governor-proof.js` | `RISK_GOVERNOR_OFFLINE_PROOF_TARGET_READY`; fallback target because candidate score gap is `4` |
| T-026 proof comparison | `node scripts/t026-proof-comparison.js` | `OFFLINE_PROOF_COMPARE_GRID_PRIMARY_RISK_FALLBACK`; accepted entry-burst guard removed from candidate selection; runtimePatchAllowed `no` |
| Entry-burst runtime guard | `vitest run src/modules/bot/bot-engine.service.test.ts -t 'caps repeated neutral market entries'` | `PASS`; cap is risk-linked, ignores GRID buys, resets after SELL |
| Entry-burst post-deploy audit | `node --test scripts/t040-entry-burst-postdeploy-check.test.js && node scripts/t040-entry-burst-postdeploy-check.js` | `ENTRY_BURST_POSTDEPLOY_PASS`; 6 activations, 0 violations, max streak 2, 88 sells after first activation |
| Risk-governor strong-bull negative-expectancy test | `./node_modules/.bin/vitest run src/modules/bot/risk-budget.service.test.ts --no-cache` from `apps/api` | `PASS`; strong-bull `NORMAL` no longer bypasses recent negative-expectancy fresh-exposure block |
| Grid/dust guard regression slice | `./node_modules/.bin/vitest run src/modules/bot/bot-engine.service.test.ts -t 'fee-negative dust churn|cancels bot grid buy orders|does not let a dust sell leg block' --no-cache` from `apps/api` | `PASS` |
| Full bot-engine unit file | `./node_modules/.bin/vitest run src/modules/bot/bot-engine.service.test.ts --no-cache` from `apps/api` | `PASS`; 128 tests |
| API TypeScript build check | `./node_modules/.bin/tsc -p tsconfig.build.json --noEmit` from `apps/api` | `PASS` |
| T-040 active validation | `./scripts/validate-active-ticket.sh` | `PASS`; `VALIDATION_REQUIRED`, no-docs-only gate satisfied by deterministic validation-code changes |
| PM/BA start gate | `./scripts/pmba-gate.sh start` | `PASS` |
| PM/BA end gate | `./scripts/pmba-gate.sh end` | `PASS` |
| Full CI | `./scripts/validate-active-ticket.sh --full` | `NOT RUN` in this short patch batch |

## Latest Bundle Evidence

`autobot-feedback-20260721-114241.tgz` is validation-only evidence:
- deployed commit `e3813bb`.
- `testnet` environment.
- `NORMAL` risk state.
- `-17.89 USDT` daily net; `-90.97 USDT` five-window net; `-28.72 USDT` realized-after-fees.
- `0.64%` max drawdown; `3.56%` total allocation across `9` open positions.
- open exposure cost `161.54 USDC`, mostly `ADAUSDC=89.57` and `PUMPUSDC=69.25`.
- `200` submitted orders, `184` filled, `0` rejected; `8.06 USDC` fees; `6` reported entry trades.
- `0` health errors and `0` restarts.
- no exchange/order-sync backoff observed in latest top reasons.

Interpretation: the deployed entry-burst guard is accepted and safety is clean, but beta readiness is still blocked because after-fee expectancy is negative.

## Required Deterministic Scenarios

| Scenario | Why it matters | Current proof | Required next proof |
| --- | --- | --- | --- |
| Exposure cannot grow beyond hard caps | prevents production capital blow-up | live allocation is `5.09%`, mostly ZEC | next bundle must show ZEC/total exposure not growing beyond the watch level |
| Sell/unwind remains reachable while fresh exposure is blocked | prevents boxed-in managed exposure | `PASS`; 88 filled sells occurred after first guard activation | retain as regression coverage |
| Repeated neutral/range entries are bounded | prevents identical signals stacking exposure before a stop | `PASS`; 6 activations, 0 forbidden fills, max executed streak 2 | retain as regression coverage |
| Exchange order rejects do not create retry storms | prevents order chaos | latest bundle has `0` rejects | add synthetic reject fixture later |
| Exchange/order-sync backoff is bounded | prevents trading while order state is untrusted | July 13 has `0` health errors and no backoff top reason | keep detector; no hotfix unless it recurs |
| Strategy/adaptation improves after fees | proves product value | still `NOT_BETA_READY`; entry-burst proof confirmed twice and testnet patch implemented | collect post-deploy evidence |

## Strategy Effectiveness Result

`node scripts/t040-strategy-effectiveness-report.js` now reports:
- `NOT_BETA_READY`
- `aiMode=OFF`
- `dailyNet=-17.89`, `fiveWindowNet=-90.97`, `realizedAfterFees=-28.72`
- current window classes: `SAFETY_FAILURE=1`, `CONTROLLED_DRAWDOWN=2`, `NEUTRAL_OR_INCONCLUSIVE=2`
- adaptive shadow signals: `5000` events, `GRID=1874`, `TREND=1632`, `MEAN_REVERSION=1494`
- execution lanes observed: `DEFENSIVE=3396`, `MARKET=924`, `GRID=663`, `UNSPECIFIED=17`
- top losses after fees: `BANKUSDC=-11.10`, `TLMUSDC=-8.51`, `TOWNSUSDC=-6.15`, `HEMIUSDC=-3.46`, `PEPEUSDC=-1.64`
- top open exposure cost: `ADAUSDC=89.57`, `PUMPUSDC=69.25`, `BANKUSDC=1.01`, `HEMIUSDC=0.55`, `TLMUSDC=0.47`

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
