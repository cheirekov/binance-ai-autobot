# Delivery Board

Last updated: 2026-02-15
Owner: Codex + User

## Current milestone

M1: Stabilize Spot testnet automation with risk-linked execution behavior and clear telemetry.

## PM/BA execution control

- Prioritization and DoD rules are defined in `docs/PM_BA_PLAYBOOK.md`.
- Every batch must start/end with `docs/SESSION_BRIEF.md`.
- Only one ticket may stay `IN_PROGRESS` at any time.

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
| T-012 | DONE | Market filters and sizing resilience | Avoid invalid orders / repeated rejects | Fewer failed trades, cleaner decisions | minNotional qty suggestion, slippage-aware notional cap, filter-aware skip diagnostics, corrected exposure-cap check (notional vs buffered cost), plus symbol sizing-cooldown lock on live filter rejects. |
| T-013 | DONE | Conversion top-up routing v1 | Keep home stable liquidity for entries | Reduced idle due to quote shortage | Conversion router + reserve/top-up behavior + min tradable floor + cooldown controls; now also enforces never-trade/regional policy on conversion legs. |
| T-014 | DONE | Universe integration and quote policy | Better autonomous pair discovery | More relevant candidate selection | Universe scan integration, live quote filtering, candidate counts and visibility. |
| T-015 | DONE | Portfolio + dashboard reliability | Clear visibility for non-trader users | Better operator confidence | Portfolio module, PnL/wallet groundwork, responsive table rendering fixes. |
| T-016 | DONE | Telemetry and support bundle expansion | Faster iteration from runtime evidence | Better PM/BA review loop | Baseline KPI + adaptive shadow telemetry; feedback bundle includes telemetry artifacts. |
| T-017 | DONE | Startup migration and config normalization | Prevent drift after schema changes | Safer upgrades | Startup migration to normalize config and risk profile defaults when enabled. |
| T-008 | DONE | Process hardening (hard rules + board + changelog) | Keep focus and traceability across long sessions | Reduce drift/rework | Added mandatory process docs and feedback-bundle snapshots. |
| T-019 | DONE | Commit hygiene and traceability rules | Prevent context-loss and ambiguous history | Better PM/BA auditability | Added hard commit-subject rules and examples in team operating rules. |
| T-001 | DONE | Exposure-aware candidate fallback | Avoid idle bot on top-symbol exposure cap | Increase trading continuity | Implemented in bot engine; candidate rotates to next eligible symbol. |
| T-002 | DONE | High-risk profile aggressiveness tuning | Risk slider must materially affect behavior | Faster results in high-risk mode | Live cooldown/notional/entry limits now scale aggressively at risk=100. |
| T-003 | BLOCKED | Risk-linked adaptive exit policy (no hard fixed stop profile) | Protect downside in bearish periods while keeping automation | Reduce deep hold drawdowns | Temporarily paused by PM/BA reprioritization to deliver wallet policy first. Next after T-004: risk+regime-adjusted take-profit/stop-loss bands and hold-time logic. |
| T-004 | IN_PROGRESS | Wallet policy v1 (convert/sweep/autonomous reserve) | Handle mixed assets automatically | Keep tradeable quote liquidity | In progress: `SPOT_GRID` quote reserve recovery + reserve buffer so BUY ladders don't consume last home-stable liquidity; stable-like -> home-stable conversion top-up in grid mode (risk-linked); do not block grid SELL leg when BUY is infeasible due to quote starvation (sell-first liquidity recovery). |
| T-005 | TODO | Daily risk guardrails visible in UI | User requested max-loss + per-position hard cap tied to risk | Safe live operation | Enforce maxDailyLoss and expose guard state in status panel. |
| T-006 | TODO | Universe discovery breadth + regime diversity | Improve pair selection quality and reduce single-symbol bias | Better candidate quality | Queued by single-lane rule. Pre-trade feasibility filter already delivered; next slice adds deeper regime-diversity scoring and rotation diagnostics. |
| T-007 | TODO | PnL correctness and exposure reporting | Trustworthy dashboard for non-trader users | Clear performance visibility | Reconcile realized/unrealized PnL from fills and holdings. |
| T-020 | TODO | Remove hidden ENV trading fallbacks | Keep UI/config export as single source of truth | Predictable cross-server behavior | Queued by single-lane rule. Delivered: engine/conversion cooldown/cap/buffer defaults from config defaults; remaining: move fee/spread env constants to explicit config controls. |
| T-021 | DONE | Transient exchange error backoff controller | Avoid retry storms on network/rate-limit faults | Stable live loop under exchange turbulence | Added exponential backoff with pause window + recovery for transient exchange errors. |
| T-022 | DONE | Freqtrade-develop deep reference mapping | Convert external best-practices into actionable backlog without GPL code copying | Faster, less-chaotic decision making for next milestones | Added concrete architecture mapping for FreqAI lifecycle, pairlist pipeline, protections, exchange sizing, and hyperopt objective design. |
| T-023 | TODO | Universe filter-chain architecture v1 | Improve autonomous pair discovery quality and explainability | Better candidate quality and less symbol-selection drift | Queued by single-lane rule. Delivered pre-steps: wallet-driven quote hints + stale-cache auto-rescan + UI-configurable quote-asset universe list + run-stats KPI visibility (% conversion trades / % entry trades / % sizing rejects). |
| T-024 | DONE | Protection manager v1 (global+pair locks) | Bearish-loss control without manual trader tuning | Reduced cascading losses and clearer risk state | Added risk-linked cooldown, stoploss-guard, max-drawdown, and low-profit locks with dashboard visibility. |
| T-025 | TODO | Adaptive confidence shadow model v1 | Bot should adapt automatically while risk policy remains authoritative | Higher-quality decisions before execution promotion | Add model-age guard, outlier confidence gate, and rolling prediction statistics in shadow path. |
| T-026 | TODO | Offline strategy calibration runner | Systematic parameter tuning from real telemetry/backtest data | Better repeatable improvements over ad-hoc tweaks | Add multi-metric objective calibration (profit, drawdown, winrate, expectancy, trade-count penalties). Seed initial parameter spaces from reference patterns (e.g. RSI/BB/ADX templates) without copying GPL code. |
| T-027 | DONE | Spot limit/grid execution v1 | Replace market-only execution path with true open-order lifecycle | Realistic grid behavior and actionable PnL | Delivered: ccxt adapter limit/open/cancel APIs + bot exchange order sync + SPOT_GRID LIMIT ladder lifecycle + limit-price affordability + stale bot LIMIT auto-cancel + external-order handling + dashboard snapshot + baseline PnL + Grid Guard v1 + faster open-order discovery scan. Follow-ups moved to `T-007` (commission-aware PnL) and a future KPI/UI ticket. |
| T-028 | TODO | Compact Advanced settings UX | Reduce operator overwhelm without hiding safety controls | Faster day-to-day operation for non-trader users | When `Follow Basic risk profile=On`: collapse risk-managed numeric inputs into a short "Managed by Risk" summary + toggle "Show details". Add a small "Refresh config" action, and improve small-width layout. Priority: PM/BA review tomorrow (non-blocking). |

## Next execution batch (single patch set)

### Priority order (PM/BA default)

1. `T-004` Wallet policy v1 (convert/sweep/autonomous reserve; dust policy; risk-linked).
2. `T-005` Daily risk guardrails visible in UI (max daily loss + per-position cap tied to risk).
3. `T-007` PnL correctness and exposure reporting.
4. `T-023` Universe filter-chain architecture v1 (then `T-006` breadth/regime diversity).
5. `T-025` Adaptive confidence shadow model v1 (AI specialist lane; shadow-first).
6. `T-028` Compact Advanced settings UX (non-blocking; reduce Advanced page noise when risk-managed).

### Next batch (execute now)

1. Start `T-004` (single active lane):
   - Add grid-mode quote reserve recovery (stable-like -> home stable) and reserve buffer so BUY ladders don't consume the last quote.
   - Ensure skip details show reserve and spendable quote amounts when BUY sizing rejects occur.
2. Run one 1-2h validation batch with explicit KPI targets (recommended: `./scripts/run-batch.sh --minutes 120`).
3. Run one overnight 8-12h batch and collect feedback bundle.
4. Re-prioritize the next single ticket from measured gaps (default next: `T-005`).
