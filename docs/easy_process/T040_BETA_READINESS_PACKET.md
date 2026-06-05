# T040_BETA_READINESS_PACKET

Last updated: 2026-06-05 08:01 UTC
Owner: PM/BA + Codex

Purpose: replace open-ended bundle-to-bundle patching with a bounded beta-readiness decision.

## Current Decision

- Active ticket: `T-040`
- Decision mode: `CONTINUE_READINESS`
- Runtime code posture: clean-room strategy signal patch added after operator override
- Production posture: not approved for real-money production promotion
- Beta posture: not beta-ready; continue readiness work while Gate P1 partials, release/rollback proof, deterministic strategy validation, and drawdown-regime acceptance remain open
- Strategy effectiveness verdict: `NOT_BETA_READY`

## Latest Evidence

- Bundle: `autobot-feedback-20260605-075150.tgz`
- Cycle: `MORNING_REVIEW`
- Auto-retro decision: `continue`
- Environment: `testnet`
- Risk state: `NORMAL`
- Daily net: `-5.79 USDT`
- Max drawdown: `1.70%`
- Total allocation: `3.85%`
- Open positions: `11`
- Orders: `200 submitted`, `181 filled`, `0 rejected`, `19 canceled`
- Sizing reject pressure: `low` (`6` sizing rejects, `3.0%` of decisions)
- Runtime health: `0 errors`, `0 restarts`, no exchange/order-sync backoff in top reasons
- AI mode: `OFF`
- Strategy effectiveness: `NOT_BETA_READY`; the adaptive shadow shows rule-based switching across strategy families `TREND`, `MEAN_REVERSION`, `GRID` and execution lanes `MARKET`, `GRID`, `DEFENSIVE`, but five-window net is `-93.82 USDT` and realized-after-fees is `-31.64 USDT`.
- PM/BA interpretation: the latest fresh window is a small controlled drawdown with low sizing pressure and clean execution. This supports continuing T-040 readiness work, but it does not support a normal-client beta claim because the multi-window strategy result is still negative after fees.
- Post-bundle engineering action: added Donchian breakout, Bollinger band position, EMA spread, and range-cycle signals to candidate scoring and adaptive strategy selection. The next fresh run must prove whether this improves after-fee results.

## Evidence Sequence

- `2026-05-29`: supportive positive window, `+31.00 USDT`, `0` rejects, `0` restarts.
- `2026-05-31`: supportive small-negative window, `-8.81 USDT`, `0` rejects, `0` restarts.
- `2026-06-01`: supportive controlled-negative window, `-38.71 USDT`, `0` rejects, `0` restarts, allocation reduced to `2.57%`.
- `2026-06-02`: validation-required controlled-negative window, `-36.55 USDT`, `0` rejects, `0` restarts, allocation reduced to `0.12%`.
- `2026-06-03`: supportive positive window, `+26.35 USDT`, `0` rejects, `0` restarts, allocation stayed low at `0.17%`.
- `2026-06-04`: controlled-negative window, `-39.12 USDT`, `0` rejects, `0` restarts, medium sizing reject pressure, allocation at `1.34%`.
- `2026-06-05`: small controlled-negative window, `-5.79 USDT`, `0` rejects, `0` restarts, sizing reject pressure back to low, allocation at `3.85%`.
- Interpretation: the process is no longer looping on ordinary live-market churn. The mixed positive/drawdown sequence remains T-026 validation input; it does not justify a same-ticket runtime patch without deterministic reproduction, and it does not justify beta promotion.

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

1. Preserve the generated `docs/easy_process/fixtures/t026/bear_choppy_controlled_drawdown.json` fixture.
2. Compare clean-room candidate families in ranked order: `risk_governor_hysteresis`, `grid_guard_v2`, `mean_reversion_gate`.
3. Treat `autobot-feedback-20260605-075150.tgz` as small controlled-drawdown/readiness evidence, not production proof and not a runtime patch trigger.
4. Include June 4 medium sizing pressure and June 5 recovery to low sizing pressure in the `grid_guard_v2` offline comparison.
5. Use `node scripts/t040-strategy-effectiveness-report.js` after each bundle so the operator sees whether adaptation improved net results after fees.
6. Add or map tests for the highest-risk missing safety scenarios.
7. Produce the release/rollback packet.
8. Only then consider a bounded beta promotion request.
