# T040_BETA_READINESS_PACKET

Last updated: 2026-06-02 08:45 UTC
Owner: PM/BA + Codex

Purpose: replace open-ended bundle-to-bundle patching with a bounded beta-readiness decision.

## Current Decision

- Active ticket: `T-040`
- Decision mode: `VALIDATION_REQUIRED`
- Runtime code posture: preserved
- Production posture: not approved for real-money production promotion
- Beta posture: pause promotion; convert the negative sequence into deterministic bear/choppy validation

## Latest Evidence

- Bundle: `autobot-feedback-20260602-082850.tgz`
- Cycle: `MORNING_REVIEW`
- Auto-retro decision: `validation_required`
- Environment: `testnet`
- Risk state: `NORMAL`
- Daily net: `-36.55 USDT`
- Max drawdown: `1.98%`
- Total allocation: `0.12%`
- Open positions: `5`
- Orders: `202 submitted`, `189 filled`, `0 rejected`, `12 canceled`
- Runtime health: `0 errors`, `0 restarts`, no exchange/order-sync backoff in top reasons
- PM/BA interpretation: third consecutive negative fresh window with very low allocation, normal risk, and no execution safety issue. This blocks beta promotion and requires deterministic bear/choppy validation; it does not justify a T-031/T-032 runtime patch.

## Evidence Sequence

- `2026-05-29`: supportive positive window, `+31.00 USDT`, `0` rejects, `0` restarts.
- `2026-05-31`: supportive small-negative window, `-8.81 USDT`, `0` rejects, `0` restarts.
- `2026-06-01`: supportive controlled-negative window, `-38.71 USDT`, `0` rejects, `0` restarts, allocation reduced to `2.57%`.
- `2026-06-02`: validation-required controlled-negative window, `-36.55 USDT`, `0` rejects, `0` restarts, allocation reduced to `0.12%`.
- Interpretation: the process is no longer looping on ordinary live-market churn. However, three fresh negative windows block beta promotion until bear/choppy behavior is validated deterministically.

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
| Execution reliability | repeated exchange rejects, order-sync backoff, and stuck order loops are detectable | `PARTIAL` | latest two bundles have 0 rejects and no backoff; still add deterministic order-failure scenarios |
| Strategy/adaptation proof | at least one range-leaning and one trend-leaning validation window or accepted deterministic equivalent | `VALIDATION_REQUIRED` | three negative fresh windows require deterministic bear/choppy validation before beta promotion |
| Operator controls | risk slider, kill switch, rollback, and readable state are documented | `PARTIAL` | produce release/rollback packet before beta promotion |
| Token/process budget | future agents use compact read order, skill, and gates instead of full history loading | `PASS` | keep archive docs out of default context |

## Beta Promotion Still Requires

- `docs/easy_process/T040_VALIDATION_MAP.md` maps each remaining Gate P1 requirement to exact commands or accepted fixture gaps.
- release and rollback steps are short enough for an operator to execute under stress.
- remaining runtime safety scenarios have deterministic tests or accepted beta-risk waivers.
- drawdown/adaptation evidence is classified across at least one trend-like and one bear/choppy validation case.
- `scripts/t040-readiness-check.js` no longer reports `VALIDATION_REQUIRED` for the latest readiness window, or PM/BA explicitly accepts the drawdown behavior as a beta risk.

## Immediate Next Batch

1. Use the generated `docs/easy_process/fixtures/t026/bear_choppy_controlled_drawdown.json` fixture.
2. Compare clean-room candidate families in ranked order: `risk_governor_hysteresis`, `grid_guard_v2`, `mean_reversion_gate`.
3. Adopt reference strategies clean-room using `docs/easy_process/REFERENCE_STRATEGY_ADOPTION.md`.
4. Add or map tests for the highest-risk missing safety scenarios.
5. Produce the release/rollback packet.
6. Only then consider a bounded beta promotion request.
