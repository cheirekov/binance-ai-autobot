# T040_BETA_READINESS_PACKET

Last updated: 2026-05-29 08:14 UTC
Owner: PM/BA + Codex

Purpose: replace open-ended bundle-to-bundle patching with a bounded beta-readiness decision.

## Current Decision

- Active ticket: `T-040`
- Decision mode: `CONTINUE_READINESS`
- Runtime code posture: preserved
- Production posture: not approved for real-money production promotion
- Beta posture: continue bounded readiness work; latest bundle is supportive evidence, not promotion approval

## Latest Evidence

- Bundle: `autobot-feedback-20260529-081216.tgz`
- Cycle: `MORNING_REVIEW`
- Auto-retro decision: `continue`
- Environment: `testnet`
- Risk state: `NORMAL`
- Daily net: `+31.00 USDT`
- Max drawdown: `0.86%`
- Total allocation: `4.62%`
- Open positions: `6`
- Orders: `200 submitted`, `198 filled`, `0 rejected`, `2 canceled`
- Runtime health: `0 errors`, `0 restarts`, no exchange/order-sync backoff in top reasons
- PM/BA interpretation: no `P0/P1` safety issue; continue T-040 readiness and do not patch T-031/T-032.

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
| Execution reliability | repeated exchange rejects, order-sync backoff, and stuck order loops are detectable | `PARTIAL` | latest bundle has 0 rejects and no backoff; still add deterministic order-failure scenarios |
| Strategy/adaptation proof | at least one range-leaning and one trend-leaning validation window or accepted deterministic equivalent | `PARTIAL` | classify evidence windows; do not tune from one bundle |
| Operator controls | risk slider, kill switch, rollback, and readable state are documented | `PARTIAL` | produce release/rollback packet before beta promotion |
| Token/process budget | future agents use compact read order, skill, and gates instead of full history loading | `PASS` | keep archive docs out of default context |

## Beta Promotion Still Requires

- `docs/easy_process/T040_VALIDATION_MAP.md` maps each remaining Gate P1 requirement to exact commands or accepted fixture gaps.
- release and rollback steps are short enough for an operator to execute under stress.
- at least one more normal-window bundle is reviewed as readiness evidence, not as automatic patch input.

## Immediate Next Batch

1. Fill the deterministic validation gaps in `docs/easy_process/T040_VALIDATION_MAP.md`.
2. Add or map tests for the highest-risk missing safety scenarios.
3. Produce the release/rollback packet.
4. Only then consider a bounded beta promotion request.
