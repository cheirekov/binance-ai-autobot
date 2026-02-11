# Delivery Board

Last updated: 2026-02-11
Owner: Codex + User

## Current milestone

M1: Stabilize Spot testnet automation with risk-linked execution behavior and clear telemetry.

## Status legend

- `TODO`: not started
- `IN_PROGRESS`: active implementation
- `BLOCKED`: waiting for dependency/input
- `DONE`: implemented and validated in CI

## Tickets

| ID | Status | Title | BA mapping | PM outcome | Notes |
|---|---|---|---|---|---|
| T-008 | DONE | Process hardening (hard rules + board + changelog) | Keep focus and traceability across long sessions | Reduce drift/rework | Added mandatory process docs and feedback-bundle snapshots. |
| T-001 | DONE | Exposure-aware candidate fallback | Avoid idle bot on top-symbol exposure cap | Increase trading continuity | Implemented in bot engine; candidate rotates to next eligible symbol. |
| T-002 | DONE | High-risk profile aggressiveness tuning | Risk slider must materially affect behavior | Faster results in high-risk mode | Live cooldown/notional/entry limits now scale aggressively at risk=100. |
| T-003 | IN_PROGRESS | Risk-linked adaptive exit policy (no hard fixed stop profile) | Protect downside in bearish periods while keeping automation | Reduce deep hold drawdowns | Next: risk+regime-adjusted take-profit/stop-loss bands and hold-time logic. |
| T-004 | TODO | Wallet policy v1 (convert/sweep/autonomous reserve) | Handle mixed assets automatically | Keep tradeable quote liquidity | USDC top-up + non-core sweep + cooldown governance. |
| T-005 | TODO | Daily risk guardrails visible in UI | User requested max-loss + per-position hard cap tied to risk | Safe live operation | Enforce maxDailyLoss and expose guard state in status panel. |
| T-006 | TODO | Universe discovery breadth + regime diversity | Improve pair selection quality and reduce single-symbol bias | Better candidate quality | Expand quote-aware ranking and rotational selection quality. |
| T-007 | TODO | PnL correctness and exposure reporting | Trustworthy dashboard for non-trader users | Clear performance visibility | Reconcile realized/unrealized PnL from fills and holdings. |

## Next execution batch (single patch set)

1. Complete `T-003` (adaptive exits tied to risk + regime).
2. Start `T-004` (wallet policy v1 with explicit sweep constraints).
3. Validate with one uninterrupted 4-6h run and collect feedback bundle.
