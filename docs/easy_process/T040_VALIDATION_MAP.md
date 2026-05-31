# T040_VALIDATION_MAP

Last updated: 2026-05-29 08:14 UTC
Owner: Validation Engineer + PM/BA

Purpose: make beta-readiness measurable. This file maps each production-readiness question to a command, fixture, or explicit gap.

## Current Command Map

| Validation class | Command / artifact | Status |
| --- | --- | --- |
| Process syntax | `bash -n scripts/auto-retro.sh scripts/update-session-brief.sh scripts/pmba-gate.sh scripts/validate-active-ticket.sh` | `PASS` |
| Evidence parser syntax | `node --check scripts/feedback-evidence.js` | `PASS` |
| PM/BA start gate | `./scripts/pmba-gate.sh start` | `PASS` |
| PM/BA end gate | `./scripts/pmba-gate.sh end` | `PASS` |
| T-040 active validation | `./scripts/validate-active-ticket.sh` | `MAPPED_THIS_BATCH` |
| Full CI | `./scripts/validate-active-ticket.sh --full` | `PASS` on 2026-05-29 |
| Latest bundle classification | `./scripts/auto-retro.sh autobot-feedback-20260529-081216.tgz` | `continue` |
| Latest session brief refresh | `./scripts/update-session-brief.sh autobot-feedback-20260529-081216.tgz` | `nextTicket=T-040` |

## Required Deterministic Scenarios

| Scenario | Why it matters | Current proof | Required next proof |
| --- | --- | --- | --- |
| Exposure cannot grow beyond hard caps | prevents production capital blow-up | existing risk-budget tests | map exact test names to Gate P1 |
| Sell/unwind remains reachable under reserve starvation | prevents boxed-in managed exposure | live evidence + bot-engine tests | add explicit T-040 test target |
| Exchange order rejects do not create retry storms | prevents fee/order chaos | latest bundle has `0` rejected orders | add synthetic reject fixture |
| Order-sync/backoff state is visible and recoverable | prevents silent stuck execution | latest bundle has no backoff in top reasons; auto-retro checks backoff | add deterministic bundle fixture |
| Fee-aware PnL accounting is stable | prevents false profitability | bot-engine tests | include in T-040 target list |
| Restart preserves state and operator visibility | prevents hidden position/order loss | config/state persistence exists | add restart fixture or documented manual test |
| Range-leaning market behavior is classified | proves adaptation beyond one bundle | live bundles exist | select replay or synthetic equivalent |
| Trend-leaning market behavior is classified | proves adaptation beyond one bundle | live bundles exist | select replay or synthetic equivalent |
| AI/news cannot directly drive orders | protects hard risk contract | policy docs | add explicit gate/test or config assertion |

## Latest Bundle Evidence

`autobot-feedback-20260529-081216.tgz` is supportive readiness evidence:
- `testnet` environment.
- `NORMAL` risk state.
- `+31.00 USDT` daily net.
- `0.86%` max drawdown.
- `4.62%` total allocation across `6` open positions.
- `200` submitted orders, `198` filled, `0` rejected, `2` canceled.
- `0` health errors and `0` restarts.
- top skip reasons are ordinary risk-budget/min-notional and fee/edge filters.

This does not close Gate P1 by itself because promotion still needs deterministic scenario proof, not one favorable live window.

## Severity Routing

Use this routing before creating any runtime patch:

| Evidence | Action |
| --- | --- |
| uncontrolled exposure growth | `P0/P1 PATCH_ALLOWED` |
| repeated exchange rejects or stuck order-sync | `P0/P1 PATCH_ALLOWED` after reproduction |
| inability to sell/unwind managed exposure | `P0/P1 PATCH_ALLOWED` after reproduction |
| broken PnL/exposure accounting | `P0/P1 PATCH_ALLOWED` after reproduction |
| crash/restart instability | `P0/P1 PATCH_ALLOWED` after reproduction |
| ordinary skip churn, no-feasible loops, negative daily net, min-notional pressure | `VALIDATION_ONLY` or backlog |
| one strong live-market observation without deterministic proof | `VALIDATION_ONLY` |

## Done For Gate P1

Gate P1 is ready for PM/BA review when:
- every required scenario above is `PASS` or explicitly accepted as a beta risk.
- `./scripts/validate-active-ticket.sh` passes in T-040 mode.
- `./scripts/validate-active-ticket.sh --full` passes.
- `docs/easy_process/T040_BETA_READINESS_PACKET.md` has no `PARTIAL` row without an owner/action.
- release/rollback steps are documented.
