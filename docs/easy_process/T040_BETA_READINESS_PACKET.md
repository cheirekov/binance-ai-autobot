# T040_BETA_READINESS_PACKET

Last updated: 2026-08-31 09:05 UTC
Owner: PM/BA + Codex

Purpose: replace open-ended bundle-to-bundle patching with a bounded beta-readiness decision.

## Current Decision

- Active ticket: `T-026`; T-040 remains `VALIDATION`
- Decision mode: `VALIDATION_REQUIRED`
- Runtime code posture: commit `397fa51` is deployed on testnet; no runtime trading change is approved by the T-026 offline result
- Production posture: not approved for real-money production promotion
- Beta posture: pause real-money promotion; the T-026 selector is an offline/shadow-only promotion candidate
- Strategy effectiveness verdict: `NOT_BETA_READY`

## Latest Evidence

- Bundle: `autobot-feedback-20260831-084332.tgz`
- Cycle: `MORNING_REVIEW`
- Auto-retro decision: `continue`
- Environment: `testnet`
- Risk state: `NORMAL`
- Readiness classifier: `VALIDATION_REQUIRED`
- Daily net: `-10.67 USDT`
- Five-window net: `-125.50 USDT`
- Max drawdown: `0.48%`
- Total allocation: `1.46%`
- Open positions: `9`
- Orders: `200 submitted`, `183 filled`, `0 rejected`; fees `8.15 USDC`
- Sizing reject pressure: `low` (`1/200`, `0.5%`)
- Runtime health: `0 errors`, `0 restarts`, no exchange/order-sync backoff in latest top reasons
- AI mode: `OFF`
- Strategy effectiveness: `NOT_BETA_READY`; five-window net is `-125.50 USDT` and latest realized-after-fees is `-23.10 USDT`.
- PM/BA interpretation: rule-based adaptation is visible (`GRID`, `MEAN_REVERSION`, and `TREND` recommendations plus defensive/grid/market lanes), but it is not proven profitable. A normal client should not read this as adaptive-profit proof.
- Post-deploy audit: `ENTRY_BURST_POSTDEPLOY_PASS`; six guard activations, zero forbidden fills, maximum executed streak `2`, complete MARKET metadata coverage, and `88` filled sells after the first activation.
- T-026 deterministic result: `WALK_FORWARD_PROMOTION_CANDIDATE` across three fixed cutoffs; after-fee validation `+0.19%`, buy-and-hold `+0.29%`, profitable `23/36`, SELL reachability `36/36`, and `runtime_patch_allowed=false`.

## Evidence Sequence

- `2026-05-29`: supportive positive window, `+31.00 USDT`, `0` rejects, `0` restarts.
- `2026-05-31`: supportive small-negative window, `-8.81 USDT`, `0` rejects, `0` restarts.
- `2026-06-01`: supportive controlled-negative window, `-38.71 USDT`, `0` rejects, `0` restarts, allocation reduced to `2.57%`.
- `2026-06-02`: validation-required controlled-negative window, `-36.55 USDT`, `0` rejects, `0` restarts, allocation reduced to `0.12%`.
- `2026-06-03`: supportive positive window, `+26.35 USDT`, `0` rejects, `0` restarts, allocation stayed low at `0.17%`.
- `2026-06-04`: controlled-negative window, `-39.12 USDT`, `0` rejects, `0` restarts, medium sizing reject pressure, allocation at `1.34%`.
- `2026-06-05`: small controlled-negative window, `-5.79 USDT`, `0` rejects, `0` restarts, sizing reject pressure back to low, allocation at `3.85%`.
- `2026-06-06`: positive window, `+9.96 USDT`, `0` rejects, `0` restarts, allocation at `2.98%`.
- `2026-06-08`: controlled-negative window, `-9.38 USDT`, `0` rejects, `0` restarts, allocation at `3.54%`.
- `2026-06-09`: controlled-negative window, `-7.13 USDT`, `0` rejects, `0` restarts, allocation at `0.12%`; recent fill-performance risk-budget guard deployed from this evidence.
- `2026-06-10`: controlled-negative window, `-5.33 USDT`, `0` rejects, `0` restarts, allocation at `3.09%`, entry trades `0`, but strategy effectiveness remains negative after fees.
- `2026-06-11`: negative window, `-9.09 USDT`, `0` rejects, `0` restarts, allocation at `5.10%`, entry trades `7`, and strategy effectiveness remains negative after fees.
- `2026-06-12`: controlled-negative window, `-7.00 USDT`, `0` rejects, `0` restarts, allocation at `2.33%`, entry trades `22`, and strategy effectiveness remains negative after fees.
- `2026-06-15`: negative window, `-23.60 USDT`, `0` rejects, `0` restarts, allocation at `5.11%`, entry trades `6`, and strategy effectiveness remains negative after fees.
- `2026-06-16`: negative window, `-12.74 USDT`, `0` rejects, `0` restarts, allocation at `5.11%`, entry trades `30`, and strategy effectiveness remains negative after fees.
- `2026-06-17`: negative window, `-29.62 USDT`, `0` rejects, `0` restarts, allocation reduced to `1.62%`, entry trades `5`, and strategy effectiveness remains negative after fees.
- `2026-06-18`: negative window, `-39.77 USDT`, `0` rejects, `0` restarts, allocation reduced to `0.11%`, entry trades `0`, but filled-order churn stayed high against tiny exposure.
- `2026-06-19`: positive daily window, `+3.07 USDT`, `0` rejects, `0` restarts, allocation stayed low at `0.10%`, entry trades `9`, fees improved, but filled-order churn remained high.
- `2026-07-01`: negative window, `-46.55 USDT`, `0` rejects, `0` restarts, allocation stayed low at `0.12%`, entry trades `22`, and after-fee losses concentrated in `SYNUSDC`, `ZROUSDC`, and `AIGENSYNUSDC`.
- `2026-07-02`: negative but improved daily window, `-13.65 USDT`, `0` rejects, `0` restarts, allocation rose to `5.10%` mostly in `HBARUSDC`, entry trades fell to `2`, and strategy effectiveness remained negative after fees.
- `2026-07-03`: near-flat negative window, `-2.68 USDT`, `0` rejects, `0` restarts, `1` health error, allocation `5.09%` mostly in `ETHUSDC`, entry trades `5`, order-sync backoff repeated after Binance testnet `502 Bad Gateway`.
- `2026-07-13`: negative window, `-25.68 USDT`, `0` rejects, `0` restarts, `0` health errors, allocation reduced to `3.10%`, entry trades `6`, active open exposure mostly `PUMPUSDC`, and strategy effectiveness remained negative after fees.
- `2026-07-14`: negative window, `-31.07 USDT`, `0` rejects, `0` restarts, `0` health errors, allocation `5.09%`, and repeated neutral MARKET entries concentrated exposure in `ZECUSDC`.
- `2026-07-21`: negative but improved window, `-17.89 USDT`, `0` rejects, `0` restarts, `0` health errors, allocation `3.56%`; the deployed guard activated six times with no third neutral/range fill and SELL reachability remained intact.
- `2026-08-10`: negative window, `-40.19 USDT`, `0` rejects/errors/restarts, allocation `0.13%`; the initial two-cutoff selector remained rejected.
- `2026-08-31`: negative but improved window, `-10.67 USDT`, `0` rejects/errors/restarts, allocation `1.46%`; the third fixed cutoff converts the cross-sectional offline selector to a promotion candidate, while live strategy effectiveness remains negative.
- Interpretation: the entry-burst runtime change is accepted. Beta promotion remains blocked by negative after-fee strategy expectancy, now owned by deterministic T-026 calibration rather than more T-040 live-window patching.

## Operator Job

The operator should not choose trading rules.

The operator only needs to approve:
- whether the bot may continue in testnet/paper mode.
- whether a later beta may use real funds.
- maximum allowed beta capital and loss budget when PM/BA requests promotion.
- whether a P0/P1 safety issue justifies interrupting readiness work.

## Non-Negotiable Patch Rule

Do not patch trading behavior because one live bundle shows skip churn, negative daily net, no-feasible loops, or min-notional pressure.

Runtime behavior patches require:
- `P0/P1` safety or execution severity, and
- deterministic reproduction through a test, fixture, replay, simulator scenario, or explicit PM/BA override.

## Gate P1 Checklist

| Area | Required proof | Current status | Next action |
| --- | --- | --- | --- |
| Active-ticket hygiene | exactly one `IN_PROGRESS` ticket and session/retro alignment | `PASS` | move T-040 to validation and activate T-026 calibration |
| Runtime safety invariants | hard exposure, reserve, sell/unwind, PnL, and restart guards have deterministic tests | `PARTIAL` | expand validation map instead of patching strategy from live churn |
| Execution reliability | repeated exchange rejects, order-sync backoff, and stuck order loops are detectable | `PARTIAL` | August 31 has `0` health errors, `0` rejects, `0` restarts; keep detection in place |
| Strategy/adaptation proof | at least one range-leaning and one trend-leaning validation window or accepted deterministic equivalent | `PARTIAL` | T-026 walk-forward gate passed across three fixed cutoffs; shadow validation is still required before runtime promotion |
| Sizing/min-order pressure | sizing reject pressure is bounded and not a retry storm | `PARTIAL` | June 5 returned to low at `3.0%`, but June 4 medium pressure remains `grid_guard_v2` offline comparison input |
| Operator controls | risk slider, kill switch, rollback, and readable state are documented | `PARTIAL` | produce release/rollback packet before beta promotion |
| Token/process budget | future agents use compact read order, skill, and gates instead of full history loading | `PASS` | keep archive docs out of default context |

## Beta Promotion Still Requires

- `docs/easy_process/T040_VALIDATION_MAP.md` maps each remaining Gate P1 requirement to exact commands or accepted fixture gaps.
- release and rollback steps are short enough for an operator to execute under stress.
- remaining runtime safety scenarios have deterministic tests or accepted beta-risk waivers.
- drawdown/adaptation evidence is classified across at least one trend-like and one bear/choppy validation case, with offline comparison acceptance recorded.
- `scripts/t040-strategy-effectiveness-report.js` no longer reports `NOT_BETA_READY`, or PM/BA explicitly accepts the remaining negative expectancy as beta risk.
- `scripts/t040-readiness-check.js` returns `CONTINUE_READINESS`; `VALIDATION_REQUIRED` from repeated negative windows must be resolved or explicitly accepted before beta.

## Immediate Next Batch

1. Keep commit `397fa51` running on testnet without resetting state.
2. Close active T-040 development: post-deploy guard acceptance is `PASS`, while production and real-money beta remain blocked.
3. Review the T-026 cross-sectional selector for shadow-only handoff; do not connect it to runtime execution in this batch.
4. Treat later bundles as background evaluation inputs; only P0/P1 safety evidence can interrupt the active lane.
