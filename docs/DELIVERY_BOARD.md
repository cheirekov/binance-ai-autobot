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
| T-000 | DONE | Monorepo + Dockerized foundation | Start fast with reproducible runtime | Reliable local/remote deployment baseline | Initial API/UI/shared workspace, Docker compose, base docs. |
| T-009 | DONE | API/UI security baseline | Protect API and UI access | Safe remote deployment posture | API key guard, UI HTTP auth, auth diagnostics, controlled setup flow. |
| T-010 | DONE | Config lifecycle management | Full automation without manual file edits | Configurable operations and portability | Basic/Advanced settings APIs, import/export, API key rotation, UI auth update, Binance credentials update. |
| T-011 | DONE | Spot testnet live execution path | Enable real exchange behavior in MVP | Practical live-test capability | CCXT Binance adapter, mainnet safety gate, market order persistence and status mapping. |
| T-012 | DONE | Market filters and sizing resilience | Avoid invalid orders / repeated rejects | Fewer failed trades, cleaner decisions | minNotional qty suggestion, slippage-aware notional cap, filter-aware skip diagnostics. |
| T-013 | DONE | Conversion top-up routing v1 | Keep home stable liquidity for entries | Reduced idle due to quote shortage | Conversion router + reserve/top-up behavior + min tradable floor + cooldown controls. |
| T-014 | DONE | Universe integration and quote policy | Better autonomous pair discovery | More relevant candidate selection | Universe scan integration, live quote filtering, candidate counts and visibility. |
| T-015 | DONE | Portfolio + dashboard reliability | Clear visibility for non-trader users | Better operator confidence | Portfolio module, PnL/wallet groundwork, responsive table rendering fixes. |
| T-016 | DONE | Telemetry and support bundle expansion | Faster iteration from runtime evidence | Better PM/BA review loop | Baseline KPI + adaptive shadow telemetry; feedback bundle includes telemetry artifacts. |
| T-017 | DONE | Startup migration and config normalization | Prevent drift after schema changes | Safer upgrades | Startup migration to normalize config and risk profile defaults when enabled. |
| T-008 | DONE | Process hardening (hard rules + board + changelog) | Keep focus and traceability across long sessions | Reduce drift/rework | Added mandatory process docs and feedback-bundle snapshots. |
| T-019 | DONE | Commit hygiene and traceability rules | Prevent context-loss and ambiguous history | Better PM/BA auditability | Added hard commit-subject rules and examples in team operating rules. |
| T-001 | DONE | Exposure-aware candidate fallback | Avoid idle bot on top-symbol exposure cap | Increase trading continuity | Implemented in bot engine; candidate rotates to next eligible symbol. |
| T-002 | DONE | High-risk profile aggressiveness tuning | Risk slider must materially affect behavior | Faster results in high-risk mode | Live cooldown/notional/entry limits now scale aggressively at risk=100. |
| T-003 | IN_PROGRESS | Risk-linked adaptive exit policy (no hard fixed stop profile) | Protect downside in bearish periods while keeping automation | Reduce deep hold drawdowns | Next: risk+regime-adjusted take-profit/stop-loss bands and hold-time logic. |
| T-004 | TODO | Wallet policy v1 (convert/sweep/autonomous reserve) | Handle mixed assets automatically | Keep tradeable quote liquidity | USDC top-up + non-core sweep + cooldown governance. |
| T-005 | TODO | Daily risk guardrails visible in UI | User requested max-loss + per-position hard cap tied to risk | Safe live operation | Enforce maxDailyLoss and expose guard state in status panel. |
| T-006 | TODO | Universe discovery breadth + regime diversity | Improve pair selection quality and reduce single-symbol bias | Better candidate quality | Expand quote-aware ranking and rotational selection quality. |
| T-007 | TODO | PnL correctness and exposure reporting | Trustworthy dashboard for non-trader users | Clear performance visibility | Reconcile realized/unrealized PnL from fills and holdings. |
| T-020 | TODO | Remove hidden ENV trading fallbacks | Keep UI/config export as single source of truth | Predictable cross-server behavior | Replace engine/conversion fallback env knobs with config-backed values and explicit defaults. |
| T-021 | DONE | Transient exchange error backoff controller | Avoid retry storms on network/rate-limit faults | Stable live loop under exchange turbulence | Added exponential backoff with pause window + recovery for transient exchange errors. |

## Next execution batch (single patch set)

1. Complete `T-003` (adaptive exits tied to risk + regime).
2. Start `T-004` (wallet policy v1 with explicit sweep constraints).
3. Validate with one uninterrupted 4-6h run and collect feedback bundle.
