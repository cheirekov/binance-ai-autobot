# T040_BETA_READINESS_PACKET

Last updated: 2026-07-14 08:24 UTC
Owner: PM/BA + Codex

Purpose: replace open-ended bundle-to-bundle patching with a bounded beta-readiness decision.

## Current Decision

- Active ticket: `T-040`
- Decision mode: `VALIDATION_REQUIRED`
- Runtime code posture: deployed server remains commit `e4c9e54`; local July 14 patch adds the confirmed neutral/range MARKET entry-burst cap for bounded testnet deployment
- Production posture: not approved for real-money production promotion
- Beta posture: pause promotion; deploy and validate the confirmed `entry_burst_guard_v1` patch on testnet
- Strategy effectiveness verdict: `NOT_BETA_READY`

## Latest Evidence

- Bundle: `autobot-feedback-20260714-075300.tgz`
- Cycle: `MORNING_REVIEW`
- Auto-retro decision: `validation_required`
- Environment: `testnet`
- Risk state: `NORMAL`
- Readiness classifier: `VALIDATION_REQUIRED`
- Daily net: `-31.07 USDT`
- Five-window net: `-119.63 USDT`
- Max drawdown: `0.93%`
- Total allocation: `5.09%`
- Open positions: `13`
- Orders: `201 submitted`, `169 filled`, `0 rejected`; fees `8.31 USDC`
- Sizing reject pressure: `low` (`0` sizing rejects)
- Runtime health: `0 errors`, `0 restarts`, no exchange/order-sync backoff in latest top reasons
- AI mode: `OFF`
- Strategy effectiveness: `NOT_BETA_READY`; five-window net is `-119.63 USDT` and latest realized-after-fees is `-72.46 USDT`.
- PM/BA interpretation: rule-based adaptation is visible (`GRID`, `MEAN_REVERSION`, and `TREND` recommendations plus defensive/grid/market lanes), but it is not proven profitable. A normal client should not read this as adaptive-profit proof.
- Post-bundle engineering action: two independent replays passed; PM/BA approved a bounded testnet patch that caps neutral/range MARKET entry bursts while preserving exit handling.

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
- Interpretation: execution safety remains clean and the entry-burst candidate is confirmed across two independent windows, but beta promotion stays blocked until the bounded testnet patch proves after-fee and SELL/reduce behavior post-deploy.

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
| Active-ticket hygiene | exactly one `IN_PROGRESS` ticket and session/retro alignment | `PASS` | keep `T-040` active until readiness packet is complete |
| Runtime safety invariants | hard exposure, reserve, sell/unwind, PnL, and restart guards have deterministic tests | `PARTIAL` | expand validation map instead of patching strategy from live churn |
| Execution reliability | repeated exchange rejects, order-sync backoff, and stuck order loops are detectable | `PARTIAL` | July 14 has `0` health errors, `0` rejects, `0` restarts; keep detection in place |
| Strategy/adaptation proof | at least one range-leaning and one trend-leaning validation window or accepted deterministic equivalent | `PARTIAL` | `entry_burst_guard_v1` passed two independent bundle-delta replays and runtime tests; require post-deploy evidence |
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

1. Keep the deployed trading behavior running in testnet/paper mode.
2. Treat `autobot-feedback-20260714-075300.tgz` as validation-only evidence: safety is clean, but strategy effectiveness is still `NOT_BETA_READY`.
3. Deploy `entry_burst_guard_v1` to testnet without resetting state; keep `risk_governor_hysteresis` as fallback.
4. Watch repeated neutral/range MARKET entries, filled orders, fees, and realized-after-fees.
5. Watch `ZECUSDC` concentration: total allocation should not grow above `5.09%`, and SELL/reduce must stay reachable.
6. Use `node scripts/t040-strategy-effectiveness-report.js` after each bundle so the operator sees whether adaptation improved net results after fees.
7. Produce the release/rollback packet only after clean post-deploy entry-burst validation.
8. Only then consider a bounded beta promotion request.
