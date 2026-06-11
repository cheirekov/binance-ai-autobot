# T040_BETA_READINESS_PACKET

Last updated: 2026-06-11 09:06 UTC
Owner: PM/BA + Codex

Purpose: replace open-ended bundle-to-bundle patching with a bounded beta-readiness decision.

## Current Decision

- Active ticket: `T-040`
- Decision mode: `VALIDATION_REQUIRED`
- Runtime code posture: recent fill-performance risk-budget guard is deployed; deterministic fixture comparison added; no new runtime behavior patch is approved from this bundle
- Production posture: not approved for real-money production promotion
- Beta posture: pause promotion; build/refresh deterministic validation before any further runtime strategy patch
- Strategy effectiveness verdict: `NOT_BETA_READY`

## Latest Evidence

- Bundle: `autobot-feedback-20260611-090617.tgz`
- Cycle: `DAY_RUN`
- Auto-retro decision: `validation_required`
- Environment: `testnet`
- Risk state: `NORMAL`
- Daily net: `-9.09 USDT`
- Max drawdown: `0.66%`
- Total allocation: `5.10%`
- Open positions: `13`
- Orders: `203 submitted`, `142 filled`, `0 rejected`, `61 canceled`
- Sizing reject pressure: `low` (`9` sizing rejects, `4.9%` of skips)
- Runtime health: `0 errors`, `0 restarts`, no exchange/order-sync backoff in top reasons
- AI mode: `OFF`
- Strategy effectiveness: `NOT_BETA_READY`; rule-based strategy switching is visible, but five-window net is `-20.97 USDT` and realized-after-fees is `-16.96 USDT`.
- PM/BA interpretation: the latest fresh window has clean safety but continued negative expectancy and exposure at the configured 5% total cap. This is validation pressure for grid/risk behavior, not a P0/P1 execution failure.
- Post-bundle engineering action: refreshed `docs/easy_process/fixtures/t026/bear_choppy_controlled_drawdown.json` from the June 11 five-window validation sequence and added `scripts/t026-fixture-comparison.js`.

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
- Interpretation: the recent runtime guard reduced some market-entry churn but did not prove profitable adaptation. The fixture comparison now ranks `grid_guard_v2` first; the next work is focused offline proof, not another live-evidence micro-patch.

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
| Execution reliability | repeated exchange rejects, order-sync backoff, and stuck order loops are detectable | `PARTIAL` | latest six readiness bundles have 0 rejects and no backoff; still add deterministic order-failure scenarios |
| Strategy/adaptation proof | at least one range-leaning and one trend-leaning validation window or accepted deterministic equivalent | `PARTIAL` | latest strategy effectiveness report is `NOT_BETA_READY`; compare the generated bear/choppy fixture against candidate strategy families |
| Sizing/min-order pressure | sizing reject pressure is bounded and not a retry storm | `PARTIAL` | June 5 returned to low at `3.0%`, but June 4 medium pressure remains `grid_guard_v2` offline comparison input |
| Operator controls | risk slider, kill switch, rollback, and readable state are documented | `PARTIAL` | produce release/rollback packet before beta promotion |
| Token/process budget | future agents use compact read order, skill, and gates instead of full history loading | `PASS` | keep archive docs out of default context |

## Beta Promotion Still Requires

- `docs/easy_process/T040_VALIDATION_MAP.md` maps each remaining Gate P1 requirement to exact commands or accepted fixture gaps.
- release and rollback steps are short enough for an operator to execute under stress.
- remaining runtime safety scenarios have deterministic tests or accepted beta-risk waivers.
- drawdown/adaptation evidence is classified across at least one trend-like and one bear/choppy validation case, with offline comparison results recorded.
- `scripts/t040-strategy-effectiveness-report.js` no longer reports `NOT_BETA_READY`, or PM/BA explicitly accepts the remaining negative expectancy as beta risk.
- `scripts/t040-readiness-check.js` continues to report `CONTINUE_READINESS` or PM/BA explicitly accepts any renewed drawdown behavior as beta risk.

## Immediate Next Batch

1. Preserve the refreshed `docs/easy_process/fixtures/t026/bear_choppy_controlled_drawdown.json` fixture from the June 11 validation sequence.
2. Use `node scripts/t026-fixture-comparison.js --write-report` as the deterministic candidate-family comparison.
3. Treat `autobot-feedback-20260611-090617.tgz` as validation-required negative-expectancy evidence, not production proof and not a runtime patch trigger.
4. Prioritize `grid_guard_v2` offline proof because the fixture comparison ranks it first, ahead of `risk_governor_hysteresis` and `mean_reversion_gate`.
5. Use `node scripts/t040-strategy-effectiveness-report.js` after each bundle so the operator sees whether adaptation improved net results after fees.
6. Add or map tests for the highest-risk missing safety scenarios.
7. Produce the release/rollback packet.
8. Only then consider a bounded beta promotion request.
