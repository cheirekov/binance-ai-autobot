# PM/BA Changelog

This log is mandatory for every implementation patch batch.

## Entry template

```md
## YYYY-MM-DD HH:MM UTC — <ticket id/title>
- Scope:
- BA requirement mapping:
- PM milestone mapping:
- Technical changes:
- Risk slider impact:
- Validation evidence:
- Runtime test request:
- Follow-up:
```

## 2026-02-12 07:50 UTC — T-004/T-006 supporting patch (wallet policy + universe candidate mapping)
- Scope: align bot behavior with autonomous wallet governance and universe-first strategy selection.
- BA requirement mapping:
  - Bot should not trade based on existing wallet bag only; it should follow universe winners and perform required conversions.
  - Bot should reduce stale/falling non-core holdings back to home stable coin automatically.
- PM milestone mapping: M1 stabilization with practical wallet policy before deeper adaptive exit tuning.
- Technical changes:
  - Candidate selection no longer discards non-home-quote universe winners immediately; in live mode it maps winner base assets to tradable home-quote candidates when available.
  - Added wallet sweep policy in bot loop:
    - derives preferred base assets from top home-quote universe candidates and current open managed positions,
    - detects stale/non-preferred holdings above a risk-scaled value floor,
    - requires weak/absent trend on `<asset><homeStable>` candidate before sweep,
    - executes conversion via conversion router with cooldown checks to prevent churn.
  - Sweep conversions are explicitly tagged in decisions/details (`mode=wallet-sweep`) for runtime diagnostics.
  - Reference strategy alignment used from:
    - `references/freqtrade-develop/freqtrade/plugins/protections/*` (lock/cooldown discipline),
    - `references/jesse-master/jesse/services/broker.py` + spot tests (position lifecycle and reduction discipline patterns).
- Risk slider impact: explicit; sweep activation floor scales with wallet size and risk level, and cooldown behavior reuses risk-linked rebalance cooldown.
- Validation evidence: Docker CI passed (`docker compose -f docker-compose.ci.yml run --rm ci`).
- Runtime test request:
  - Run 4-8h with mixed-asset wallet.
  - Verify decisions include occasional `wallet-sweep <asset> -> <homeStable>` for stale assets, without rapid repeated flips.
  - Verify entries still follow universe candidates (not just held wallet assets).
- Follow-up:
  - Continue T-004 with broader quote-routing policy for non-home candidate execution when direct home pair is missing.
  - Resume T-003 adaptive exit-band implementation after wallet policy stabilization.

## 2026-02-12 07:41 UTC — T-003 supporting patch (adaptive visibility + universe freshness)
- Scope: deliver immediate operator-visible progress without waiting for another long overnight-only cycle.
- BA requirement mapping:
  - Adaptive policy should be visible and understandable in UI (history, not only last status).
  - Universe discovery must react to real wallet composition and stay fresh over time.
- PM milestone mapping: M1 stabilization speed-up while keeping T-003 active and preparing T-023 quality improvements.
- Technical changes:
  - Increased adaptive shadow tail payload from 60 to 200 events in run-stats API.
  - Added adaptive history table in dashboard (time, candidate, regime, strategy, decision summary).
  - Universe service now auto-triggers background rescan when cached snapshot is stale.
  - Universe quote-asset set now includes wallet-derived quote hints (top held assets), constrained by exchange-available quote assets.
  - `UniverseModule` now imports `IntegrationsModule` so universe scans can use wallet balances safely.
- Risk slider impact: indirect only; no sizing formula change. Faster universe refresh improves candidate turnover under all risk levels.
- Validation evidence: Docker CI passed (`docker compose -f docker-compose.ci.yml run --rm ci`).
- Runtime test request:
  - Run 4-6h and verify Adaptive section shows scrolling event history (not only summary pills).
  - Verify universe `Last scan` time advances automatically without manual rescan after cache TTL.
  - Verify `quoteAssets` line includes wallet-driven hints when holdings change.
- Follow-up:
  - Continue T-003 core exit-band implementation (adaptive TP/SL + hold-time).
  - Start full T-023 staged filter diagnostics once exit policy patch is merged.

## 2026-02-12 07:26 UTC — T-003 supporting patch (anti-churn + runtime accuracy)
- Scope: resolve overnight trade flip churn and adaptive runtime drift seen in `autobot-feedback-20260212-071236.tgz`.
- BA requirement mapping: autonomous bot must avoid confusing buy/sell loops and show reliable runtime telemetry in UI.
- PM milestone mapping: M1 stabilization before deeper adaptive-exit rollout.
- Technical changes:
  - Added persistent `startedAt` in bot state and migrated runtime calculation to use this stable run-start anchor.
  - On each engine start, state now resets run-start timestamp explicitly for the new session.
  - Added conversion source guard: skip using a source asset for conversion when that asset had a recent BUY on its home-stable pair within rebalance cooldown.
  - This prevents immediate `entry BUY` then `convert SELL` churn on the same asset (for example `ETHUSDC` flip loops).
  - Added Jesse/Freqtrade reference mapping update in `docs/REFERENCES_ANALYSIS.md` to guide next adaptive-exit and fee-accounting work.
- Risk slider impact: explicit; anti-churn guard uses `liveTradeRebalanceSellCooldownMs` (risk-linked via follow-risk-profile), so higher risk still shortens guard windows.
- Validation evidence: Docker CI passed (`docker compose -f docker-compose.ci.yml run --rm ci`); root-cause evidence from state/kpi in `autobot-feedback-20260212-071236.tgz`.
- Runtime test request:
  - Run 4-8h with current config and verify no repeated immediate BUY/SELL flip on the same symbol/qty.
  - Verify adaptive runtime in UI grows continuously beyond prior 200-decision horizon.
  - Collect next feedback bundle for T-003 exit-band tuning.
- Follow-up:
  - Continue `T-003` with adaptive exit bands and minimum hold-time logic.
  - Continue `T-007` with fee-aware realized/unrealized PnL ledger.

## 2026-02-11 17:19 UTC — T-013 supporting hotfix (conversion policy enforcement)
- Scope: stop repeated conversion fills on symbols that users explicitly blocked (for example `USDCUSDT`).
- BA requirement mapping: Advanced settings (`neverTradeSymbols`, region policy) must apply consistently to autonomous execution paths.
- PM milestone mapping: M1 stabilization and loop/noise reduction before adaptive-exit rollout.
- Technical changes:
  - Updated `ConversionRouterService` to run pair-policy checks before executing each conversion leg.
  - Conversion legs now honor `neverTradeSymbols` and regional enforcement settings.
  - Kept utility conversion behavior intact for non-blocked symbols to avoid liquidity deadlocks.
- Risk slider impact: none (policy consistency fix; no sizing/cooldown formula change).
- Validation evidence: Docker CI passed (`docker compose -f docker-compose.ci.yml run --rm ci`).
- Runtime test request:
  - Keep `USDCUSDT` in `neverTradeSymbols` and run 1-2h.
  - Verify no new `TRADE ... USDCUSDT ... convert ...` decisions appear.
  - If quote shortfall appears, verify bot either uses another allowed route or logs a clean insufficient-quote skip.
- Follow-up:
  - Evaluate whether conversion should expose a dedicated skip reason when blocked by policy (UI diagnostics improvement).
  - Continue `T-003` adaptive exit implementation on top of this stabilized conversion behavior.

## 2026-02-11 15:00 UTC — T-001 Exposure-aware candidate fallback
- Scope: prevent idle loop when top candidate is blocked by symbol exposure cap.
- BA requirement mapping: full automation should continue without manual intervention.
- PM milestone mapping: M1 stabilization of Spot testnet execution continuity.
- Technical changes:
  - Added exposure-aware candidate picker in bot engine.
  - Rotates to next eligible home-quote symbol before placement path.
  - Keeps telemetry candidate context aligned after candidate switch.
- Risk slider impact: none (selection fallback only; no risk formula change).
- Validation evidence: Docker CI passed (`lint`, `test`, `build`).
- Runtime test request: run 4-6h uninterrupted and verify decision stream is not stuck on a single repeated exposure skip.
- Follow-up: evaluate candidate rotation quality and add guard metrics to telemetry.

## 2026-02-11 15:20 UTC — T-002 High-risk aggressiveness tuning
- Scope: make risk=100 visibly more aggressive in execution pacing/sizing.
- BA requirement mapping: user requested stronger behavior in highest-risk mode and faster measurable results.
- PM milestone mapping: M1 stabilization with meaningful risk-slider effect.
- Technical changes:
  - `deriveAdvancedRiskProfile` now scales to fast/high throughput at high risk:
    - lower trade/entry cooldowns
    - higher notional cap
    - faster conversion/rebalance loops
    - higher consecutive entries per symbol.
  - Fee/edge gate now applies risk-adjusted minimum edge threshold.
  - Added shared-schema tests for high-risk output values.
- Risk slider impact: explicit behavior increase at high risk (more frequent entries, larger allowed notional, lower edge threshold).
- Validation evidence: Docker CI passed (`lint`, `test`, `build`).
- Runtime test request: run 4-6h uninterrupted, collect bundle, compare trades/hour and skip reasons vs previous run.
- Follow-up: combine with adaptive exits (T-003) to control bearish hold risk.

## 2026-02-11 15:35 UTC — T-008 Process hardening for team continuity
- Scope: enforce persistent PM/BA delivery discipline to prevent context-loss drift.
- BA requirement mapping: user requested hard rules and reliable ticket/process tracking.
- PM milestone mapping: delivery governance for M1 and future tracks.
- Technical changes:
  - Added `docs/TEAM_OPERATING_RULES.md` with mandatory workflow and definition of done.
  - Added `docs/DELIVERY_BOARD.md` as the ticket source of truth.
  - Added `docs/PM_BA_CHANGELOG.md` template + structured entries.
  - Linked governance docs from `README.md`, `docs/AI_CONTEXT.md`, `docs/ROADMAP.md`.
  - Updated `scripts/collect-feedback.sh` to include governance docs snapshot in feedback bundles.
- Risk slider impact: none (process/documentation + feedback packaging only).
- Validation evidence: Docker CI passed (`lint`, `test`, `build`).
- Runtime test request: generate next bundle and confirm `meta/docs/` contains board/changelog snapshots.
- Follow-up: enforce board/changelog updates before each feature batch (starting with T-003 adaptive exits).

## Backfilled history (from commit review)

## 2026-02-04 09:00 UTC — T-000/T-009 Foundation + security baseline
- Scope: establish runnable monorepo and baseline remote safety.
- BA requirement mapping: dockerized API/UI, protected endpoints, onboarding-first usage.
- PM milestone mapping: foundation readiness for MVP iterations.
- Technical changes:
  - Initial monorepo/docs and workspace wiring (`548022a`, `39858e9`).
  - API default host/port normalization for deployment (`c961f93`).
  - API key + UI auth operational paths and diagnostics (`cd57672`, `8852c2b`, `eb87070`).
- Risk slider impact: none.
- Validation evidence: subsequent CI and runtime sessions passed startup/auth flows.
- Runtime test request: verify `/health` and protected endpoints remain consistent after restart.
- Follow-up: keep API health exposure policy explicit for remote deployments.

## 2026-02-04 11:30 UTC — T-010 Config lifecycle features
- Scope: remove manual file edits and support portable bot configuration.
- BA requirement mapping: update credentials in UI, support import/export, rotate API key.
- PM milestone mapping: operator usability and deployment portability.
- Technical changes:
  - Config import/export and UI auth update APIs (`8852c2b`).
  - Advanced host/port and API key rotation (`eb87070`).
  - Binance credential update endpoint + UI flow (`0feb106`).
- Risk slider impact: none.
- Validation evidence: feature available via settings endpoints and UI.
- Runtime test request: export config, import into fresh deployment, verify startup parity.
- Follow-up: ensure all new advanced controls remain JSON-export compatible.

## 2026-02-04 13:00 UTC — T-012 Market filter reliability
- Scope: reduce order rejects and improve sizing diagnostics.
- BA requirement mapping: account for Binance minimums and avoid false “broken bot” behavior.
- PM milestone mapping: execution correctness under exchange constraints.
- Technical changes:
  - Min-notional required qty hints (`a405a16`).
  - Order qty validation + tick overlap prevention (`502b0c6`).
  - Feed normalization and timeout safety for news ingestion (`2581c20`).
- Risk slider impact: none.
- Validation evidence: fewer invalid-order paths and clearer skip messages.
- Runtime test request: confirm skips include market-constraint context (`minNotional`, `qty`, `price`).
- Follow-up: keep minQty/stepSize details visible in diagnostics.

## 2026-02-04 15:00 UTC — T-015 Portfolio + paper visibility baseline
- Scope: expose wallet/decision/order context in UI during paper/live iterations.
- BA requirement mapping: user-visible bot reasoning and wallet awareness.
- PM milestone mapping: observability for iterative tuning.
- Technical changes:
  - Portfolio module + paper-trading decision flow (`6dc2c54`).
  - Universe integration and URL validation (`f49d905`).
  - UI visual cleanup and responsiveness adjustments (`f6cccbf`).
- Risk slider impact: none.
- Validation evidence: dashboard paths are active and used in later test bundles.
- Runtime test request: confirm decisions/orders/wallet panels update during run.
- Follow-up: improve realized/unrealized PnL accounting (tracked by T-007).

## 2026-02-09 10:00 UTC — T-011 Live Spot execution hardening
- Scope: move from stub-only toward real Spot testnet execution with safety controls.
- BA requirement mapping: live testnet trading capability with controlled risk.
- PM milestone mapping: live-path MVP readiness.
- Technical changes:
  - CCXT Binance trading adapter adoption (`d3bbfe5`).
  - Mainnet live trade gating and safety caps (`5d837b2`).
  - Slippage-adjusted notional cap and quote filtering in live mode (`36706d8`, `6bccd1f`).
  - Skip cost diagnostics and candidate visibility (`6c308d6`).
  - Market order status/qty persistence fixes (`b29f855`).
- Risk slider impact: moderate (through derived limits and notional guard behavior).
- Validation evidence: repeated testnet sessions with live fills and persisted order history.
- Runtime test request: verify live mode only in Spot testnet unless explicitly allowed.
- Follow-up: adaptive exits and daily risk guardrails.

## 2026-02-10 12:00 UTC — T-013/T-017 Conversion and migration hardening
- Scope: improve autonomous quote top-up behavior and upgrade safety.
- BA requirement mapping: bot should recover quote liquidity and survive schema evolution.
- PM milestone mapping: stable long-running iteration cycle.
- Technical changes:
  - Startup config migration + risk-profile normalization (`143a0de`).
  - Conversion top-up floor and richer diagnostics (`296fd6b`).
- Risk slider impact: low-to-moderate via follow-risk-profile defaults on migration.
- Validation evidence: Docker CI explicitly recorded green in migration commit context.
- Runtime test request: restart with existing config and verify no manual repair needed.
- Follow-up: wallet policy v1 sweep/cleanup is tracked in T-004.

## 2026-02-11 14:40 UTC — Commit hygiene review corrective action
- Scope: address inconsistent commit subjects that reduce traceability.
- BA requirement mapping: reduce process loops and context-loss confusion.
- PM milestone mapping: governance hardening for predictable delivery.
- Technical changes:
  - Reviewed last commit range and identified non-actionable subjects (`773e187`, `ca07630`, `2e7692c`, `163bdb1`, `bcf4fbd`, `de85893`, `ef19148`).
  - Added hard commit quality rules in team operating process.
- Risk slider impact: none.
- Validation evidence: governance docs updated and enforced in current branch.
- Runtime test request: none.
- Follow-up: all new commits must use structured actionable subjects.

## 2026-02-11 16:25 UTC — Retrospective backfill + board coverage repair
- Scope: backfill PM/BA artifacts so implemented work is visible and auditable.
- BA requirement mapping: avoid loop/repeat cycles and preserve continuity across sessions.
- PM milestone mapping: governance completion for M1 execution.
- Technical changes:
  - Expanded `docs/DELIVERY_BOARD.md` with completed historical tickets from commit history.
  - Added retrospective entries for commit clusters (foundation, config, live execution, migration, process).
  - Added ticket `T-020` to eliminate hidden env fallback behavior in trading paths.
- Risk slider impact: none (documentation/governance update).
- Validation evidence: Docker CI passed (`lint`, `test`, `build`) after updates.
- Runtime test request: next feedback bundle should include updated board/changelog snapshots.
- Follow-up: execute `T-003` and `T-020` in the next implementation batch.

## 2026-02-11 16:45 UTC — T-021 Reference-driven transient backoff adoption
- Scope: adopt risk-control behavior from `crypto-trading-open-main` for transient exchange faults.
- BA requirement mapping: autonomous bot must handle noisy network/rate-limit periods without retry floods.
- PM milestone mapping: M1 live path hardening and runtime stability.
- Technical changes:
  - Added transient exchange error backoff state in bot engine.
  - Added exponential pause logic on transient errors (timeout/network/429 families).
  - Added pre-trade backoff gate so live loop skips cleanly while backoff is active.
  - Added auto-clear on successful trade execution.
  - Added decision details for backoff diagnostics (`backoffMs`, `pauseUntil`, `errorCount`).
- Risk slider impact: none (error handling path only; no sizing/risk formula changes).
- Validation evidence: Docker CI passed (`lint`, `test`, `build`).
- Runtime test request: during API/network instability, verify decisions show backoff activation instead of repeated immediate retries.
- Follow-up: make backoff tuning config-driven in Advanced settings as part of `T-020`.

## 2026-02-11 16:46 UTC — T-022 Freqtrade-develop deep reference mapping
- Scope: perform implementation-level review of `references/freqtrade-develop` and convert findings into concrete team backlog items.
- BA requirement mapping: improve strategy quality, autonomous behavior, and reduce loop/rework from missing architecture direction.
- PM milestone mapping: bridge from M1 stabilization into structured M2 strategy/protection improvements.
- Technical changes:
  - Added deep-review section in `docs/REFERENCES_ANALYSIS.md` with concrete mappings for:
    - FreqAI lifecycle (train queue, model expiry, confidence/outlier gating, rolling prediction stats)
    - Pairlist pipeline architecture (generator + staged filters + TTL)
    - Protection manager model (global/pair locks for cooldown, stoploss streak, drawdown, low-profit)
    - Exchange precision/min-stake discipline and exception taxonomy
    - Hyperopt objective design and offline optimization discipline.
  - Updated `docs/DELIVERY_BOARD.md` with new tickets `T-023` to `T-026`.
  - Updated execution batch order to prioritize protections before adaptive exits.
- Risk slider impact: none (analysis + planning artifacts only).
- Validation evidence: local source review of reference files + updated board/changelog artifacts.
- Runtime test request: none for this ticket (no runtime code change).
- Follow-up: implement `T-024` next, then finish `T-003`, then start `T-023`.

## 2026-02-11 16:58 UTC — T-024 Protection manager v1 (risk-linked)
- Scope: introduce runtime protection locks so the bot automatically pauses risky entries in adverse conditions.
- BA requirement mapping: autobot must reduce cascading losses and not require manual trader intervention during bearish/choppy periods.
- PM milestone mapping: M1 live-path risk hardening before deeper adaptive strategy work.
- Technical changes:
  - Extended shared bot state with `protectionLocks` (`GLOBAL`/`SYMBOL`, typed lock kinds).
  - Added protection engine in `apps/api/src/modules/bot/bot-engine.service.ts`:
    - `COOLDOWN` (per-symbol lock after recent fill),
    - `STOPLOSS_GUARD` (global lock on stop-loss streak),
    - `MAX_DRAWDOWN` (global lock on realized drawdown threshold),
    - `LOW_PROFIT` (per-symbol lock on poor recent close performance).
  - Added lock expiry pruning + upsert semantics to prevent duplicate lock spam.
  - Integrated protection evaluation into trading loop (pre-candidate and post-wallet phases).
  - Integrated protection lock checks into symbol blocking logic (global + per-symbol).
  - Updated dashboard status to show lock count + lock table (`type/scope/symbol/reason/expires`).
- Risk slider impact: explicit and significant; lock thresholds, lookbacks, and lock durations now scale with `basic.risk` (higher risk = looser guards, lower risk = stricter guards).
- Validation evidence: Docker CI passed (`docker compose -f docker-compose.ci.yml run --rm ci`).
- Runtime test request:
  - Deploy this patch, reset state, run uninterrupted overnight (6-10h),
  - Verify dashboard shows active protection locks when triggered,
  - Verify decision stream includes `Skip <symbol>: Protection lock ...` instead of repeated risky entries.
- Follow-up:
  - Complete `T-003` adaptive exits using these lock signals.
  - Expose optional Advanced overrides for protection thresholds in a later patch if runtime data indicates need.
