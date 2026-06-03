# T040_BETA_READINESS_PACKET

Last updated: 2026-06-03 16:08 UTC
Owner: PM/BA + Codex

Purpose: replace open-ended bundle-to-bundle patching with a bounded beta-readiness decision.

## Current Decision

- Active ticket: `T-040`
- Decision mode: `CONTINUE_READINESS`
- Runtime code posture: preserved
- Production posture: not approved for real-money production promotion
- Beta posture: continue readiness work; promotion still waits for Gate P1 partials, release/rollback proof, and deterministic strategy validation

## Latest Evidence

- Bundle: `autobot-feedback-20260603-160659.tgz`
- Cycle: `NIGHT_RUN`
- Auto-retro decision: `continue`
- Environment: `testnet`
- Risk state: `NORMAL`
- Daily net: `+26.35 USDT`
- Max drawdown: `1.98%`
- Total allocation: `0.17%`
- Open positions: `10`
- Orders: `200 submitted`, `186 filled`, `0 rejected`, `14 canceled`
- Runtime health: `0 errors`, `0 restarts`, no exchange/order-sync backoff in top reasons
- PM/BA interpretation: the latest fresh window broke the three-negative-window sequence and stayed execution-safe. This supports continuing T-040 readiness work, but it is not a beta or production approval.

## Evidence Sequence

- `2026-05-29`: supportive positive window, `+31.00 USDT`, `0` rejects, `0` restarts.
- `2026-05-31`: supportive small-negative window, `-8.81 USDT`, `0` rejects, `0` restarts.
- `2026-06-01`: supportive controlled-negative window, `-38.71 USDT`, `0` rejects, `0` restarts, allocation reduced to `2.57%`.
- `2026-06-02`: validation-required controlled-negative window, `-36.55 USDT`, `0` rejects, `0` restarts, allocation reduced to `0.12%`.
- `2026-06-03`: supportive positive window, `+26.35 USDT`, `0` rejects, `0` restarts, allocation stayed low at `0.17%`.
- Interpretation: the process is no longer looping on ordinary live-market churn. The latest positive window removes the immediate three-negative-window blocker, while the preserved bear/choppy fixture remains required validation input before beta promotion.

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
| Execution reliability | repeated exchange rejects, order-sync backoff, and stuck order loops are detectable | `PARTIAL` | latest four readiness bundles have 0 rejects and no backoff; still add deterministic order-failure scenarios |
| Strategy/adaptation proof | at least one range-leaning and one trend-leaning validation window or accepted deterministic equivalent | `PARTIAL` | positive and controlled-drawdown windows exist; compare the generated bear/choppy fixture against candidate strategy families |
| Operator controls | risk slider, kill switch, rollback, and readable state are documented | `PARTIAL` | produce release/rollback packet before beta promotion |
| Token/process budget | future agents use compact read order, skill, and gates instead of full history loading | `PASS` | keep archive docs out of default context |

## Beta Promotion Still Requires

- `docs/easy_process/T040_VALIDATION_MAP.md` maps each remaining Gate P1 requirement to exact commands or accepted fixture gaps.
- release and rollback steps are short enough for an operator to execute under stress.
- remaining runtime safety scenarios have deterministic tests or accepted beta-risk waivers.
- drawdown/adaptation evidence is classified across at least one trend-like and one bear/choppy validation case, with offline comparison results recorded.
- `scripts/t040-readiness-check.js` continues to report `CONTINUE_READINESS` or PM/BA explicitly accepts any renewed drawdown behavior as beta risk.

## Immediate Next Batch

1. Preserve the generated `docs/easy_process/fixtures/t026/bear_choppy_controlled_drawdown.json` fixture.
2. Compare clean-room candidate families in ranked order: `risk_governor_hysteresis`, `grid_guard_v2`, `mean_reversion_gate`.
3. Treat `autobot-feedback-20260603-160659.tgz` as supportive positive/readiness evidence, not production proof.
4. Add or map tests for the highest-risk missing safety scenarios.
5. Produce the release/rollback packet.
6. Only then consider a bounded beta promotion request.
