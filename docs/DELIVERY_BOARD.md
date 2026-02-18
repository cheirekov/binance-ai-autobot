# Delivery Board

Last updated: 2026-02-16
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
| T-016 | DONE | Telemetry and support bundle expansion | Faster iteration from runtime evidence | Better PM/BA review loop | Baseline KPI + adaptive shadow telemetry; feedback bundle includes telemetry artifacts and compose-log fallback tails (for remote-copy workflows without active local compose services). |
| T-017 | DONE | Startup migration and config normalization | Prevent drift after schema changes | Safer upgrades | Startup migration to normalize config and risk profile defaults when enabled. |
| T-008 | DONE | Process hardening (hard rules + board + changelog) | Keep focus and traceability across long sessions | Reduce drift/rework | Added mandatory process docs and feedback-bundle snapshots. |
| T-019 | DONE | Commit hygiene and traceability rules | Prevent context-loss and ambiguous history | Better PM/BA auditability | Added hard commit-subject rules and examples in team operating rules. |
| T-033 | DONE | PM/BA gate automation + anti-loop protocol | Eliminate drift/looping and reduce unsupported claims | Deterministic execution control | Added `scripts/pmba-gate.sh` (start/end checks), evidence taxonomy (`observed`/`inferred`/`assumption`), and hard no-loop escalation rules in PM/BA docs. |
| T-001 | DONE | Exposure-aware candidate fallback | Avoid idle bot on top-symbol exposure cap | Increase trading continuity | Implemented in bot engine; candidate rotates to next eligible symbol. |
| T-002 | DONE | High-risk profile aggressiveness tuning | Risk slider must materially affect behavior | Faster results in high-risk mode | Live cooldown/notional/entry limits now scale aggressively at risk=100. |
| T-003 | BLOCKED | Risk-linked adaptive exit policy (no hard fixed stop profile) | Protect downside in bearish periods while keeping automation | Reduce deep hold drawdowns | Temporarily paused by PM/BA reprioritization to deliver wallet policy first. Next after T-004: risk+regime-adjusted take-profit/stop-loss bands and hold-time logic. |
| T-004 | DONE | Wallet policy v1 (convert/sweep/autonomous reserve) | Handle mixed assets automatically | Keep tradeable quote liquidity | Delivered: `SPOT_GRID` quote reserve recovery + risk-linked hard/soft reserve (BUY affordability uses hard reserve; top-up triggers use soft reserve); stable-like -> home-stable conversion top-up in grid mode; do not block grid SELL leg when BUY is infeasible due to quote starvation (sell-first liquidity recovery). Note: this does **not** fully liquidate large non-stable holdings back to home stable; it preserves “preferred” liquid base assets for grid inventory. Follow-up: `T-029` exposure/dust/unmanaged-holdings. |
| T-005 | TODO | Daily risk guardrails visible in UI | User requested max-loss + per-position hard cap tied to risk | Safe live operation | Enforce maxDailyLoss and expose guard state in status panel. |
| T-006 | DONE | Universe discovery breadth + regime diversity | Improve pair selection quality and reduce single-symbol bias | Better candidate quality | Delivered: `SPOT_GRID` candidate selection ranks by grid suitability + actionability (avoid repeatedly selecting symbols already “waiting” with both legs open, and skip guard-paused/no-inventory symbols). Needs overnight validation evidence but CI is green. |
| T-007 | TODO | PnL correctness and exposure reporting | Trustworthy dashboard for non-trader users | Clear performance visibility | Reconcile realized/unrealized PnL from fills and holdings. |
| T-029 | IN_PROGRESS | Wallet policy v2 (unmanaged holdings, exposure cap, dust) | Autobot must manage holdings risk automatically | Reduce “bag holding” in bear markets | In progress: dust cleanup “band” + capped sweep minimum + protect only assets referenced by open orders/managed positions (avoid protecting top-universe assets by default). Added: pre-submit funds guards + stage-aware reject diagnostics + insufficient-balance cooldown/blacklist escalation. Added: risk-linked unmanaged non-home exposure cap trigger (`12%..50%`) that forces wallet sweep rebalance when cap is exceeded. Added: tiny-shortfall exit fallback (sell available validated qty). Added: position-exit loop now honors symbol/global locks to suppress repeated insufficient-exit storms. Added: grid-wait storm cooldown/rotation (`GRID_WAIT_ROTATE`) to reduce repeated `Grid waiting...` loops, then tuned storm threshold/window/cooldown to reduce over-locking in high-risk mode. Added: run-stats wallet-policy snapshot + dashboard status pills (exposure %, cap %, over-cap, observed sample) for operator visibility. Added: adaptive anti-loop layer for grid (reject-history actionability penalties, sell-leg feasibility gate from exchange filters, fee-edge/max-open cooldown locks, stronger sizing-reject cooldown escalation). Added: reason-level quarantine steering (`FEE_EDGE` + grid sizing families) and dashboard skip-family KPI counters. Added: guard-no-action candidate filter for buy-paused/no-inventory/no-ladder symbols and market-qty floor normalization fix to prevent false pre-check insufficiency loops on integer-step symbols. Added: bear-regime anti-overtrade tuning (earlier risk-linked bear BUY pause threshold + bear-grid score penalties) plus adaptive regime-router hard switch (`RANGE→GRID`, `BULL→MARKET`, `BEAR→DEFENSIVE` with defensive BUY-LIMIT cancel). Remaining: behavior-side closure and long-run validation evidence. |
| T-030 | TODO | Universe filter-chain v2 (NFI pattern) | Autobot should pick actionable pairs and avoid noisy candidates | Higher trade quality, fewer dead-end candidates | Add staged filters in `UniverseService`: liquidity/age/spread/range-stability/volatility with per-stage reject diagnostics; defaults risk-linked, Advanced override-capable. |
| T-031 | TODO | Regime engine v2 (bull/bear RSI + ADX) | Bot must adapt strategy thresholds by market regime automatically | More stable behavior across bull/bear/range | Replace fixed regime thresholds with risk-linked dynamic bands inspired by RSI bull/bear + ADX modifier; keep hard risk locks authoritative. |
| T-032 | TODO | Exit manager v2 (supertrend + ratchet) | Reduce drawdowns from held inventory while preserving upside | Better bearish protection and cleaner unwind | Add supertrend/ATR trend-break guard + progressive stop/profit ratchet for managed positions/grid inventory (non-hardcoded, risk-profile driven). |
| T-020 | TODO | Remove hidden ENV trading fallbacks | Keep UI/config export as single source of truth | Predictable cross-server behavior | Queued by single-lane rule. Delivered: engine/conversion cooldown/cap/buffer defaults from config defaults; remaining: move fee/spread env constants to explicit config controls. |
| T-021 | DONE | Transient exchange error backoff controller | Avoid retry storms on network/rate-limit faults | Stable live loop under exchange turbulence | Added exponential backoff with pause window + recovery for transient exchange errors. |
| T-022 | DONE | Freqtrade-develop deep reference mapping | Convert external best-practices into actionable backlog without GPL code copying | Faster, less-chaotic decision making for next milestones | Added concrete architecture mapping for FreqAI lifecycle, pairlist pipeline, protections, exchange sizing, and hyperopt objective design. |
| T-023 | TODO | Universe filter-chain architecture v1 | Improve autonomous pair discovery quality and explainability | Better candidate quality and less symbol-selection drift | Queued by single-lane rule. Delivered pre-steps: wallet-driven quote hints + stale-cache auto-rescan + UI-configurable quote-asset universe list + run-stats KPI visibility (% conversion trades / % entry trades / % sizing rejects). |
| T-024 | DONE | Protection manager v1 (global+pair locks) | Bearish-loss control without manual trader tuning | Reduced cascading losses and clearer risk state | Added risk-linked cooldown, stoploss-guard, max-drawdown, and low-profit locks with dashboard visibility. |
| T-025 | TODO | Adaptive confidence shadow model v1 | Bot should adapt automatically while risk policy remains authoritative | Higher-quality decisions before execution promotion | Add model-age guard, outlier confidence gate, and rolling prediction statistics in shadow path. |
| T-026 | TODO | Offline strategy calibration runner | Systematic parameter tuning from real telemetry/backtest data | Better repeatable improvements over ad-hoc tweaks | Add multi-metric objective calibration (profit, drawdown, winrate, expectancy, trade-count penalties). Seed initial parameter spaces from reference patterns (e.g. RSI/BB/ADX templates) without copying GPL code. Include offset/walk-forward stability gate and model/preprocessor meta-search (from `CryptoCurrencyTrader-master` concepts). |
| T-027 | DONE | Spot limit/grid execution v1 | Replace market-only execution path with true open-order lifecycle | Realistic grid behavior and actionable PnL | Delivered: ccxt adapter limit/open/cancel APIs + bot exchange order sync + SPOT_GRID LIMIT ladder lifecycle + limit-price affordability + stale bot LIMIT auto-cancel + external-order handling + dashboard snapshot + baseline PnL + Grid Guard v1 + faster open-order discovery scan + periodic supplemental discovery while active orders exist (fixes missing “yesterday” open orders after reset/restart). Follow-ups moved to `T-007` (commission-aware PnL) and a future KPI/UI ticket. |
| T-028 | TODO | Compact Advanced settings UX | Reduce operator overwhelm without hiding safety controls | Faster day-to-day operation for non-trader users | When `Follow Basic risk profile=On`: collapse risk-managed numeric inputs into a short "Managed by Risk" summary + toggle "Show details". Add a small "Refresh config" action, and improve small-width layout. Priority: PM/BA review tomorrow (non-blocking). |

## Next execution batch (single patch set)

### Priority order (PM/BA default)

1. `T-029` Wallet policy v2 closure (unmanaged holdings visibility + remaining loop reductions).
2. `T-005` Daily risk guardrails visible in UI (max daily loss + per-position cap tied to risk).
3. `T-007` PnL correctness and exposure reporting (commission-aware).
4. `T-030` Universe filter-chain v2 (NFI-inspired staged filters + explainability).
5. `T-031` Regime engine v2 (RSI bull/bear + ADX dynamic thresholds).
6. `T-032` Exit manager v2 (supertrend/ATR + progressive ratchet).
7. `T-025` Adaptive confidence shadow model v1 (AI specialist lane; shadow-first).
8. `T-028` Compact Advanced settings UX (non-blocking; reduce Advanced page noise when risk-managed).

### Next batch (execute now)

1. Start `T-029` (single active lane):
   - Keep runtime validation focused on unmanaged holdings + sweep behavior from latest night patch.
   - Add UI visibility for unmanaged exposure cap state before closing ticket.
2. Run one 1–2h validation batch (recommended: `./scripts/run-batch.sh --minutes 120`).
3. Run one overnight 8–12h batch and collect a feedback bundle.
4. Re-prioritize the next single ticket from measured gaps (default next: `T-005`, then `T-007`, then `T-030`).
