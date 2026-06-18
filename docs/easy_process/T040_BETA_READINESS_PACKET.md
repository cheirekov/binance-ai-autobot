# T040_BETA_READINESS_PACKET

Last updated: 2026-06-18 09:07 UTC
Owner: PM/BA + Codex

Purpose: replace open-ended bundle-to-bundle patching with a bounded beta-readiness decision.

## Current Decision

- Active ticket: `T-040`
- Decision mode: `VALIDATION_REQUIRED`
- Runtime code posture: recent fill-performance risk-budget guard is deployed; June 17 patch cancels bot-owned grid BUY ladder orders whenever buys are paused; June 18 patch pauses/cancels GRID BUY legs for fee-negative dust churn while preserving SELL/unwind; deterministic fixture/report refreshed
- Production posture: not approved for real-money production promotion
- Beta posture: pause promotion; deploy and validate the dust-churn guard in testnet before any beta promotion
- Strategy effectiveness verdict: `NOT_BETA_READY`

## Latest Evidence

- Bundle: `autobot-feedback-20260618-090049.tgz`
- Cycle: `DAY_RUN`
- Auto-retro decision: `validation_required`
- Environment: `testnet`
- Risk state: `NORMAL`
- Daily net: `-39.77 USDT`
- Five-window net: `-112.73 USDT`
- Max drawdown: `1.09%`
- Total allocation: `0.11%`
- Open positions: `7`
- Orders: `201 submitted`, `186 filled`, `0 rejected`, `14 canceled`
- Sizing reject pressure: `low` (`1` sizing reject)
- Runtime health: `0 errors`, `0 restarts`, no exchange/order-sync backoff in top reasons
- AI mode: `OFF`
- Strategy effectiveness: `NOT_BETA_READY`; rule-based strategy switching is visible, but five-window net is `-112.73 USDT` and latest realized-after-fees is `-58.82 USDT`.
- PM/BA interpretation: the latest fresh window has clean execution safety and very low exposure, but order churn stayed high against dust-sized inventory. A normal client should not read this as adaptive-profit proof yet.
- Post-bundle engineering action: added deterministic unit coverage and patched GRID BUY handling so fee-negative dust churn pauses new BUY legs and cancels existing bot-owned BUY ladder orders while preserving SELL/unwind.

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
- Interpretation: the runtime guard reduced exposure but did not stop fee-negative churn. The refreshed fixture comparison still ranks `grid_guard_v2` ahead of `risk_governor_hysteresis`; the June 18 patch implements the focused GRID BUY dust-churn guard and the next bundle must validate churn reduction.

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
| Execution reliability | repeated exchange rejects, order-sync backoff, and stuck order loops are detectable | `PARTIAL` | latest readiness bundles have 0 rejects and no backoff; June 18 adds a deterministic guard for dust-sized fee churn |
| Strategy/adaptation proof | at least one range-leaning and one trend-leaning validation window or accepted deterministic equivalent | `PARTIAL` | latest strategy effectiveness report is `NOT_BETA_READY`; deploy the dust-churn guard and validate churn reduction before any beta promotion |
| Sizing/min-order pressure | sizing reject pressure is bounded and not a retry storm | `PARTIAL` | June 5 returned to low at `3.0%`, but June 4 medium pressure remains `grid_guard_v2` offline comparison input |
| Operator controls | risk slider, kill switch, rollback, and readable state are documented | `PARTIAL` | produce release/rollback packet before beta promotion |
| Token/process budget | future agents use compact read order, skill, and gates instead of full history loading | `PASS` | keep archive docs out of default context |

## Beta Promotion Still Requires

- `docs/easy_process/T040_VALIDATION_MAP.md` maps each remaining Gate P1 requirement to exact commands or accepted fixture gaps.
- release and rollback steps are short enough for an operator to execute under stress.
- remaining runtime safety scenarios have deterministic tests or accepted beta-risk waivers.
- drawdown/adaptation evidence is classified across at least one trend-like and one bear/choppy validation case, with offline comparison acceptance recorded.
- `scripts/t040-strategy-effectiveness-report.js` no longer reports `NOT_BETA_READY`, or PM/BA explicitly accepts the remaining negative expectancy as beta risk.
- `scripts/t040-readiness-check.js` continues to report `CONTINUE_READINESS` or PM/BA explicitly accepts any renewed drawdown behavior as beta risk.

## Immediate Next Batch

1. Deploy the API/bot service with the June 18 negative dust-churn GRID BUY guard.
2. Use `node scripts/t026-fixture-comparison.js --write-report` as the deterministic candidate-family comparison.
3. Use `node scripts/t026-proof-comparison.js --write-report` after grid/risk proof reports to choose the primary offline proof target.
4. Treat `autobot-feedback-20260618-090049.tgz` as validation-required negative-expectancy evidence with a P1 dust-churn mitigation, not production proof.
5. Watch whether filled orders, buy/sell notional, fees, and realized-after-fees improve in the next bundle.
6. Use `node scripts/t040-strategy-effectiveness-report.js` after each bundle so the operator sees whether adaptation improved net results after fees.
7. Add or map tests for the highest-risk missing safety scenarios.
8. Produce the release/rollback packet.
9. Only then consider a bounded beta promotion request.
