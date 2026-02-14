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

## 2026-02-14 16:20 UTC — T-027 Grid Guard v1 (pause BUY legs in bear trend)
- Scope: reduce bearish “bag accumulation” risk in `SPOT_GRID` by pausing new grid BUY LIMIT placements during strong bearish regimes while keeping SELLs active.
- BA requirement mapping:
  - User requirement: autop must manage losses automatically in bearish conditions without manual tuning.
  - Goal: stop adding inventory into a strong downtrend, but still allow sell-side unwinds.
- PM milestone mapping: close remaining slices of `T-027` with realistic LIMIT lifecycle and safer unattended overnight operation.
- Technical changes:
  - Shared:
    - Added protection lock type `GRID_GUARD_BUY_PAUSE` to `packages/shared/src/schemas/bot-state.ts`.
  - API:
    - Added risk-linked grid guard in the `SPOT_GRID` branch: if regime is `BEAR_TREND` with sufficient confidence, create/refresh a symbol-scoped `GRID_GUARD_BUY_PAUSE` lock and skip placing new BUY ladder orders (`apps/api/src/modules/bot/bot-engine.service.ts`).
    - `isSymbolBlocked` ignores `GRID_GUARD_BUY_PAUSE` so SELL legs remain eligible; other lock types still block as before.
    - If BUYs are paused and there is no inventory to sell, apply a short symbol `COOLDOWN` lock to rotate to other candidates instead of idling.
- Risk slider impact:
  - Higher risk requires **higher** regime confidence to pause buys (more aggressive trading).
  - Higher risk uses **shorter** guard lock durations (faster re-evaluation).
- Validation evidence:
  - Docker CI passed: `docker compose -f docker-compose.ci.yml run --rm ci`.
- Runtime test request (2–4h):
  - Run `SPOT_GRID` in a bearish period; verify the dashboard shows `GRID_GUARD_BUY_PAUSE` locks and BUY ladder placement slows/stops while SELLs continue.
  - Confirm the bot rotates away from symbols with no sellable inventory instead of repeating no-op skips.
- Follow-up:
  - Extend Grid Guard from “bear trend” to “volatility spike / breakout” regimes and consider optional cancellation of bot-owned BUY LIMITs when guard triggers.

## 2026-02-14 16:11 UTC — Reference review: `freqtrade-strategies-main` (GPL strategy patterns)
- Scope: review community Freqtrade strategy repository to extract reusable design patterns (no GPL code copying) and map them to our active backlog.
- BA requirement mapping:
  - User requested “adaptive AUTOBOT” behavior and asked if the shared strategy pool can speed up delivery.
  - Goal: identify what can be safely reused now (patterns) vs what requires a larger subsystem (backtesting / calibration / ML lifecycle).
- PM milestone mapping: accelerate closure of `T-027` and prepare the next milestones (`T-003`, `T-026`) with a clearer execution plan.
- Technical changes:
  - Updated `docs/REFERENCES_ANALYSIS.md` with license-safe guidance and specific pattern mappings:
    - Grid guard inputs (ADX/RSI/BB style regime gating),
    - exit primitives (break-even, ATR-based stop distance, trailing),
    - multi-timeframe “informative” context,
    - hyperopt-like calibration discipline.
  - Updated `docs/DELIVERY_BOARD.md` to connect `T-026` and `T-027` to these patterns (no behavior change).
- Risk slider impact: none (analysis/docs only).
- Validation evidence: none required (docs only).
- Runtime test request: none.
- Follow-up:
  - Implement `T-027` remaining slice “Grid Guard v1” (pause BUY legs in bearish trend/vol regimes; keep SELLs) using our existing ADX/RSI/ATR features.
  - Use `T-026` calibration runner to tune thresholds against our own telemetry (rather than adopting strategy constants).

## 2026-02-13 16:09 UTC — Grid execution guardrails (reduce cycling; limit-mode affordability)
- Scope: reduce “cycling SKIP” behavior in grid mode and avoid false quote-insufficient skips by sizing against LIMIT prices.
- BA requirement mapping:
  - User reported repeated alternation like:
    - `Skip <symbol>: Insufficient USDC for estimated cost` (even in grid mode),
    - `Skip <symbol>: Grid sell sizing rejected (Below minNotional...)`,
    - `Skip <symbol>: Grid waiting for ladder slot or inventory`.
  - Goal: autop should rotate away from infeasible candidates and stop spamming no-action skips.
- PM milestone mapping: keep `T-027` usable for 2–4h and overnight validation by preventing “no-op loops”.
- Technical changes:
  - API:
    - In `SPOT_GRID`, stop using market-price affordability / conversion shortfall gating to block the grid ladder; the grid BUY leg now sizes against the LIMIT price path only (`apps/api/src/modules/bot/bot-engine.service.ts`).
    - Allow grid SELL leg to use `requiredQty` when it satisfies filters and is within `baseFree` (prevents unnecessary sell sizing rejects).
    - Add short, risk-linked symbol cooldown after repeated no-action skips (quote shortfall skips and grid buy/sell sizing rejects) to prevent symbol cycling and improve candidate rotation.
- Risk slider impact:
  - Low risk = longer no-action cooldowns and wider grid spacing (fewer trades).
  - High risk = shorter cooldowns and tighter grid spacing (more trades).
- Validation evidence:
  - Docker CI passed: `docker compose -f docker-compose.ci.yml run --rm ci`.
- Runtime test request (30–60 min):
  - Run `SPOT_GRID` with low `USDC` free (or minor shortfalls) and confirm the bot places/maintains LIMIT orders instead of repeatedly skipping on market-cost affordability.
  - Confirm “cycling” reduces: the same infeasible symbol should disappear temporarily via the cooldown lock, and the bot should rotate to other candidates.

## 2026-02-14 10:06 UTC — PnL mark-to-market visibility + external order warning (T-027 slice)
- Scope: improve operator visibility during `SPOT_GRID` runs without changing trading behavior.
- BA requirement mapping:
  - User requested clearer PnL and asked why “PnL” is sometimes not obvious even when the bot is trading.
  - User reported occasional “manual/other bot” open orders appearing during runs; needs to be visible and not silently affect results.
- PM milestone mapping: keep `T-027` validation loop tight (2–4h + overnight) by making results interpretable without log archaeology.
- Technical changes:
  - UI:
    - PnL card now shows `Unrealized` and `Total` by combining baseline cost-basis (fills) with wallet mark-to-market prices from the portfolio snapshot (`apps/ui/src/pages/DashboardPage.tsx`).
    - Renamed “Open exposure” to “Open cost” and added “Open value” + “Open positions” counters to reduce confusion.
    - Added a warning pill when external/manual open LIMIT orders are detected (orders whose `clientOrderId` does not match the bot prefix) (`apps/ui/src/pages/DashboardPage.tsx`).
    - Extended `BaselineRunStats` UI typing to include symbol-level stats (open cost/netQty) so the above can be computed safely (`apps/ui/src/hooks/useRunStats.ts`).
- Risk slider impact: none (display-only changes).
- Validation evidence:
  - Docker CI passed: `docker compose -f docker-compose.ci.yml run --rm ci`.
- Runtime test request (10–30 min):
  - Ensure `Advanced → Manage external/manual open orders = Off` and cancel any manual open LIMIT orders on the exchange.
  - Confirm dashboard shows `Realized`, `Unrealized`, `Total`, and that the external-orders warning pill is absent in a clean run.
- Follow-up:
  - Next step for `T-007`: include commissions in PnL, and add a small “PnL breakdown” table by open position (symbol, qty, avg entry, mark price, unrealized).

## 2026-02-14 13:04 UTC — Skip-storm symbol cooldown escalation (T-027 slice)
- Scope: reduce repeated “same skip reason” loops by escalating symbol cooldowns when a symbol is repeatedly infeasible.
- BA requirement mapping:
  - User request (BG): `при повтарящи се skip-ове да охлажда символа и да преминава към следващ кандидат`.
  - Goal: keep the bot adaptive in high-risk mode by rotating away from infeasible symbols instead of retrying the same one every ~15s.
- PM milestone mapping: improve 2–4h and overnight evidence quality for `T-027` by reducing no-action churn and making protection behavior visible.
- Technical changes:
  - API:
    - Added “skip storm” detection keyed by normalized skip reason (e.g., `Grid sell sizing rejected`, `Insufficient <homeStable>`, etc.). When the same key repeats within a short window, the existing symbol `COOLDOWN` lock is extended and annotated (`apps/api/src/modules/bot/bot-engine.service.ts`).
    - Applied to the main high-noise infeasible paths: quote shortfall/insufficient skips and grid buy/sell sizing rejects.
- Risk slider impact:
  - Risk 0: storm threshold `4` skips in `2m`, storm cooldown ≈ `60s`.
  - Risk 100: storm threshold `2` skips in `2m`, storm cooldown ≈ `240s`.
  - Practical effect: high risk rotates away from infeasible symbols sooner (less cycling).
- Validation evidence:
  - Docker CI passed: `docker compose -f docker-compose.ci.yml run --rm ci`.
- Runtime test request (30–60 min):
  - Start `SPOT_GRID` with an intentionally infeasible scenario (e.g., dust base free, or repeated minNotional rejects).
  - Confirm the dashboard shows a `COOLDOWN` protection lock reason containing `Skip storm (...)` and the bot rotates to other candidates.
- Follow-up:
  - If needed, extend skip-storm to also throttle non-infeasible “waiting” SKIPs by converting them to a single periodic `ENGINE` status update (reduce UI spam).

## 2026-02-14 15:52 UTC — Grid waiting log throttle + sizing KPI fix (T-027 slice)
- Scope: reduce “bot does nothing” perception during quiet market periods and make KPIs reflect minQty sizing rejects.
- BA requirement mapping:
  - User feedback: grid runs can look “stuck” due to repeated `Grid waiting for ladder slot or inventory` messages, and sizing KPIs should reflect real reasons.
- PM milestone mapping: improve overnight evidence quality for `T-027` without changing execution behavior.
- Technical changes:
  - API:
    - Throttle `Grid waiting for ladder slot or inventory` SKIPs to at most once per symbol per minute (prevents alternating ETH/SOL waiting spam) (`apps/api/src/modules/bot/bot-engine.service.ts`).
    - Count `minQty`/`LOT_SIZE`/`MARKET_LOT_SIZE` rejects as sizing rejects in baseline KPI telemetry (`apps/api/src/modules/bot/bot-engine.service.ts`).
- Risk slider impact: none (log/telemetry only).
- Validation evidence:
  - Docker CI passed: `docker compose -f docker-compose.ci.yml run --rm ci`.
- Runtime test request (2–4h + overnight):
  - Confirm “waiting” spam is reduced in Decisions, while active orders still refresh and fills still appear normally.
  - Confirm dashboard shows non-zero `Sizing rejects` when `Below minQty ...` happens.
- Follow-up:
  - If the bot still stays “flat” in sustained trends, implement `Grid Guard v1` (risk-linked pause of BUY legs in strong trends) and/or add a “seed inventory” option (requires PM/BA decision).

## 2026-02-13 15:22 UTC — P0 bot idle fix (feasibility filter: exposure cap vs buffered cost)
- Scope: fix a live-candidate feasibility bug that could reject every candidate and leave the bot “running but doing nothing”.
- BA requirement mapping:
  - User reported: bot starts, scans universe, then only logs `Skip: No feasible candidates after sizing/cap filters (9 rejected)`.
  - Feedback bundle `autobot-feedback-20260213-150356.tgz` showed all rejections were `max-symbol-exposure` with `bufferedCost` barely above `remainingSymbolNotional`.
- PM milestone mapping: unblock `T-027` nightly validation by restoring baseline entry execution (prevents false “no feasible candidates” stalls).
- Technical changes:
  - API:
    - Fixed `pickFeasibleLiveCandidate()` to enforce symbol exposure using mark-to-market notional (`qty * price`) instead of buffered cost (`qty * price * bufferFactor`) (`apps/api/src/modules/bot/bot-engine.service.ts`).
    - Added a regression test covering the failure mode (slippage buffer > 1 while target notional equals remaining exposure) (`apps/api/src/modules/bot/bot-engine.service.test.ts`).
- Risk slider impact:
  - No formula changes.
  - Behavioral impact: reduces “idle due to false exposure-cap rejects”, especially visible at higher `risk` where `maxPositionPct` is larger and `bufferFactor` is still > 1.
- Validation evidence:
  - Docker CI passed: `docker compose -f docker-compose.ci.yml run --rm ci`.
- Runtime test request (10–30 min):
  - Redeploy, reset state, start bot.
  - Confirm decisions no longer flood `Skip: No feasible candidates ... max-symbol-exposure` when `remainingSymbolNotional` is the binding constraint.
- Follow-up:
  - If wallets with `homeStable` free near zero still idle, adjust feasibility selection to allow candidates that require conversion top-up (handled later in the tick) instead of rejecting early.

## 2026-02-13 13:36 UTC — P0 UI blank-screen hotfix (Dashboard refresh handler + UI typecheck)
- Scope: restore dashboard rendering after the snapshot refactor (a missing handler caused a runtime crash that produced a blank screen after the “Loading…” card).
- BA requirement mapping:
  - User reported: “Loading then empty dark blue screen” after deploying the snapshot changes.
  - User requested P0 priority to keep UI usable for overnight evidence collection.
- PM milestone mapping: keep `T-027` validation loop operational; prevent UI regressions that block all testing.
- Technical changes:
  - UI:
    - Fixed `DashboardPage` refresh button to call `dashboard.refresh()` (it referenced an undefined identifier at runtime) (`apps/ui/src/pages/DashboardPage.tsx`).
    - Added TypeScript typecheck to the UI build step so similar runtime failures are caught in CI and Docker builds (`apps/ui/package.json`).
  - UI server:
    - Removed unsupported `logLevel` option in `http-proxy-middleware` config (TypeScript typecheck surfaced the mismatch) (`apps/ui/server/index.ts`).
- Risk slider impact: none.
- Validation evidence:
  - Docker CI passed: `docker compose -f docker-compose.ci.yml run --rm ci`.
- Runtime test request (2–5 min):
  - Redeploy and load the dashboard: it must render cards/tables and not go blank after initial load.
- Follow-up:
  - If UI still “feels slow”, tune `useDashboardSnapshot({ pollMs })` and/or add a short TTL cache on `/dashboard/snapshot`.

## 2026-02-13 13:10 UTC — T-027 Dashboard snapshot endpoint (faster UI refresh, fewer pollers)
- Scope: reduce dashboard slowness and API polling fan-out by returning a single aggregated snapshot payload (similar to `binance-ai-bot-1`’s `GET /strategy` pattern), without changing trading logic.
- BA requirement mapping:
  - User reported the dashboard is slower and “refresh” feels heavy (multiple endpoints and timers).
  - User asked for clearer, faster evidence during 2–4h/night runs with fewer moving parts.
- PM milestone mapping: keep `T-027` validation stable and reduce noise in runtime evidence; improve operator experience on remote deployments.
- Technical changes:
  - API:
    - Added `GET /dashboard/snapshot` returning: public config view, integrations status, wallet snapshot, universe snapshot, bot state, and run-stats (`apps/api/src/modules/dashboard/dashboard.controller.ts`).
    - Added `DashboardModule` and wired it into `AppModule` (`apps/api/src/modules/dashboard/dashboard.module.ts`, `apps/api/src/modules/app.module.ts`).
    - Exported required services for injection (no behavioral change): `BotEngineService`, `PortfolioService`, `BinanceStatusService`.
  - UI:
    - Added `useDashboardSnapshot()` and updated `DashboardPage` to use it (single poll loop) instead of 6+ separate hooks/timers (`apps/ui/src/hooks/useDashboardSnapshot.ts`, `apps/ui/src/pages/DashboardPage.tsx`).
- Risk slider impact: none (UI/API aggregation only).
- Validation evidence:
  - Docker CI passed: `docker compose -f docker-compose.ci.yml run --rm ci`.
- Runtime test request (10–20 min):
  - Open dashboard and confirm: pills update, wallet/universe blocks render, decisions/details render, and start/stop still works.
  - In browser devtools, confirm dashboard no longer spams many concurrent `/api/*` requests; it should mostly poll `/api/dashboard/snapshot`.
- Follow-up:
  - If dashboard still feels slow on high-latency links, add server-side snapshot caching (short TTL) and/or reduce poll interval on `risk=0` profiles.

## 2026-02-13 12:57 UTC — Reference extraction: `binance-ai-bot-1` (UI snapshot + wallet sweep patterns)
- Scope: analyze internal v1 reference bot (`references/binance-ai-bot-1`) to extract patterns that reduce UI/API load and accelerate delivery of wallet automation, without adopting the old architecture.
- BA requirement mapping:
  - User reported the current dashboard feels slower (multiple endpoints/pollers) compared to earlier prototypes.
  - User requested wallet policy to handle “unused coins/dust” and return non-preferred assets back to HOME automatically (or at least via a safe operator action first).
  - User requested AI to be additive and gated (no engine vs AI fighting).
- PM milestone mapping:
  - Feed concrete design into `T-027` (dashboard snapshot for faster refresh and clearer evidence).
  - Feed concrete wallet policy design into `T-004` (sweep/panic controls and later automation).
  - Provide guardrails for future AI/news tracks (`T-025`, later news tickets).
- Technical changes:
  - Updated `docs/REFERENCES_ANALYSIS.md`:
    - Added internal references (`binance-ai-bot-1`, `binance-ai-bot-24`) to the table.
    - Added a new section summarizing v1 patterns: snapshot endpoint, sweep-unused policy, grid breakout action, AI policy gating, RSS ingestion constraints.
    - Replaced stale `references/freqtrade-stable/*` paths with `references/freqtrade-develop/*` (folder is not present locally).
- Risk slider impact: none (docs-only extraction). Recommended mapping for implementation:
  - higher risk: allow more frequent snapshot refresh and more aggressive sweep thresholds; lower risk: slower refresh and more conservative sweep automation.
- Validation evidence: not applicable (docs-only).
- Runtime test request: not applicable.
- Follow-up:
  - Consider adding `GET /dashboard/snapshot` to reduce UI polling fan-out (reference: v1 `GET /strategy`).
  - Implement `T-004` slice: `POST /portfolio/sweep-unused` as dry-run first, then gated live mode with risk-linked thresholds.

## 2026-02-13 12:37 UTC — Reference extraction: `binance-ai-bot-24` (strategy/risk patterns)
- Scope: analyze internal reference bot (`references/binance-ai-bot-24`) and extract concrete patterns we should port (without dragging old architecture into the current monorepo).
- BA requirement mapping:
  - User requested “autobot” behavior: adaptive risk handling, grid behavior that does not accumulate bags in bearish/trending markets, and explainable PnL.
  - User requested reduced hardcoding: exchange/environment differences should be handled via config/policy, not per-coin code edits.
- PM milestone mapping: inform the next `T-027` and post-`T-027` roadmap choices with proven patterns (reduce churn and long-run drift).
- Technical changes:
  - Added a new “patterns worth porting” section to `docs/REFERENCES_ANALYSIS.md` referencing:
    - Risk Governor hysteresis + fee burn telemetry,
    - Grid Guard BUY-pause (SELLs remain active) with hysteresis,
    - conversion blocking under risk HALT/caps,
    - explainable PnL reconciliation,
    - universe quote-asset discovery + allow/deny policy,
    - UI safety UX patterns (LIVE/HALT banners).
- Risk slider impact: none (docs-only extraction). Recommended mapping for implementation:
  - higher risk: shorter resume/hold windows, tighter guard thresholds; lower risk: wider/safer.
- Validation evidence: not applicable (docs-only).
- Runtime test request: not applicable.
- Follow-up (recommended next patch scope):
  - Implement Grid Guard BUY-pause inside `T-027` SPOT_GRID path (pause/cancel bot-owned BUY LIMITs on trend/vol regimes; keep SELLs).
  - Add fee-burn telemetry and daily/rolling equity baselines to improve global protections (`T-005`/`T-003`).

## 2026-02-13 12:13 UTC — Region policy defaults (EEA blocked quotes aligned to Binance MiCA list)
- Scope: tighten region-policy defaults so EEA quote filtering matches Binance’s published impacted-asset list, avoiding over-blocking and testnet confusion.
- BA requirement mapping:
  - User asked to verify which “stable-like” quote assets are blocked for EEA on Binance and flagged `U` as likely testnet-only.
- PM milestone mapping: keep `T-013`/`T-027` runs representative of real-world constraints without hardcoding testnet quirks.
- Technical changes:
  - Trading policy (`apps/api/src/modules/policy/trading-policy.ts`):
    - Updated default `EEA_BLOCKED_QUOTE_ASSETS` to the published impacted assets list (USDT, FDUSD, TUSD, USDP, DAI, AEUR, XUSD, PAXG).
  - Tests updated accordingly (`apps/api/src/modules/policy/trading-policy.test.ts`).
- Risk slider impact: none (policy defaults only).
- Validation evidence:
  - Docker CI passed: `docker compose -f docker-compose.ci.yml run --rm ci`.
- Runtime test request:
  - For Spot testnet runs where restrictions are not enforced by Binance, consider disabling `Advanced → Enforce region policy` to prevent unnecessary filtering.
- Follow-up:
  - Make region blocked quotes explicitly configurable (Advanced/Expert) instead of code defaults (tracked under `T-020`).

## 2026-02-13 12:07 UTC — T-027 order ownership + open-order safety (bot-owned only)
- Scope: make open-order lifecycle safe and adaptive by default (manage/cancel bot-owned orders without touching external/manual ones), and remove a P0 UI false-onboarding failure mode.
- BA requirement mapping:
  - User reported orphaned open LIMIT orders on Binance not reflected in bot UI after state resets.
  - User reported chaos around “who owns this order” and asked for adaptive order lifecycle behavior tied to risk slider.
  - User reported UI occasionally redirecting to onboarding despite an existing config (API temporarily unreachable).
- PM milestone mapping: close the “don’t leave live orders behind” gap inside `T-027` so nightly runs produce reliable evidence and less operator confusion.
- Technical changes:
  - Shared schema:
    - Added optional `clientOrderId` on orders so the bot can tag/recognize its own exchange orders (`packages/shared/src/schemas/bot-state.ts`).
  - Config + UI:
    - Added Advanced “Open order management” controls (clientOrderId prefix, stale TTL/distance, cancel-on-stop, cancel-on-global-lock, manage external orders toggle) and risk-derived defaults for TTL/distance (`packages/shared/src/schemas/app-config.ts`, `apps/api/src/modules/config/*`, `apps/ui/src/pages/settings/SettingsAdvanced.tsx`).
  - Exchange adapter:
    - CCXT order mapping now carries `clientOrderId` and a better `transactTime` fallback; limit/market order placement supports `newClientOrderId` (`apps/api/src/modules/integrations/ccxt-binance-adapter.ts`, `apps/api/src/modules/integrations/binance-trading.service.ts`).
  - Bot engine:
    - Bot-owned order identification via `clientOrderId` prefix and deterministic ID builder.
    - Grid path cancels stale bot-owned open LIMIT orders using TTL and distance-from-market thresholds (risk-linked).
    - Safe default: if external/manual open LIMIT orders exist for the symbol and `manageExternalOpenOrders=false`, bot logs a SKIP with details and does not touch them.
    - Global protection locks now optionally auto-cancel bot-owned open orders, and `Stop` optionally cancels bot-owned open orders on the exchange (without falsely “canceling” external ones in local state).
  - UI bootstrap P0:
    - Setup status no longer treats “API unreachable” as “not initialized” (prevents false onboarding redirects) (`apps/ui/src/hooks/useSetupStatus.ts`, `apps/ui/src/app/App.tsx`).
- Risk slider impact:
  - Affects stale order cancellation thresholds via derived defaults:
    - higher risk: shorter stale TTL + tighter distance threshold,
    - lower risk: longer TTL + wider distance threshold.
- Validation evidence:
  - Docker CI passed: `docker compose -f docker-compose.ci.yml run --rm ci`.
- Runtime test request (2-4h):
  - Run with `tradeMode=SPOT_GRID`, `liveTrading=true`, Spot testnet.
  - Create one manual LIMIT order on the same symbol: bot should SKIP with “External open LIMIT order(s) detected” and must not cancel it.
  - Observe bot-created LIMIT orders: they should include `clientOrderId` with the configured prefix, and stale/far ones should be canceled over time.
  - Press Stop: bot-owned open orders should be canceled best-effort; manual orders should remain open.
- Follow-up:
  - Add UI “ownership” badges (bot vs external) and a controlled “cancel external” action gated behind `manageExternalOpenOrders`.

## 2026-02-13 11:07 UTC — T-027 validation automation + visibility fixes
- Scope: speed up the 2-4h/night validation loop by standardizing batch runs, and make order/skip evidence visible without unpacking bundles.
- BA requirement mapping:
  - User reported only seeing a single SKIP summary (`No feasible candidates...`) with no actionable context.
  - User reported `Orders (active)` empty after state resets, while Binance UI still had a live open LIMIT order.
- PM milestone mapping: keep `T-027` moving with fast feedback and correct open-order visibility during Spot testnet runs.
- Technical changes:
  - Batch automation:
    - Added `scripts/run-batch.sh` to run a timed batch (optional state/universe reset), then auto-run `./scripts/collect-feedback.sh` and `./scripts/update-session-brief.sh`.
    - Reordered next-batch priorities and clarified post-`T-027` lane order in `docs/DELIVERY_BOARD.md`.
  - Order discovery (API engine):
    - Bot engine order sync now uses a bounded `symbolsHint` list (recent order history + top universe candidates) to discover exchange open orders even when local state was reset.
    - Discovery is symbol-scoped (no global `fetchOpenOrders`), and only probes one hint symbol per tick when there are no tracked open orders.
  - Evidence visibility (UI):
    - Dashboard decisions table now exposes `decision.details` via a `View/Hide` expander (renders JSON).
    - Added UI styles for compact buttons and detail blocks (`apps/ui/src/styles.css`).
- Risk slider impact: none (validation automation + sync/visibility only; no sizing/strategy change).
- Validation evidence:
  - Docker CI passed: `docker compose -f docker-compose.ci.yml run --rm ci`.
- Runtime test request (2-4h):
  - Deploy and run with `tradeMode=SPOT_GRID` and `liveTrading=true` (Spot testnet).
  - If Binance has existing open LIMIT orders, confirm they appear in `Orders (active)` within ~1 minute after start.
  - When a feasibility SKIP occurs, confirm `Decisions → Details` shows `rejectionSamples` and wallet/cap context.
- Follow-up:
  - Add explicit operator controls (per-symbol open-order refresh and cancel) if bundles show stale/external orders frequently.

## 2026-02-13 09:37 UTC — T-027 P0 hotfix (CCXT open-orders fetch without symbol)
- Scope: unblock live trading by preventing CCXT `fetchOpenOrders()` from being called without a symbol (which CCXT treats as warning-as-error and triggers our transient backoff loop).
- BA requirement mapping:
  - User reported bot “does nothing” for hours and UI appears slow.
  - Night bundle showed decision flood of `Skip: Live order sync failed` + `Skip: Transient exchange backoff active`.
- PM milestone mapping: keep `T-027` runnable for 2-4h and overnight validation; remove self-inflicted exchange-sync stall.
- Technical changes:
  - CCXT adapter (`apps/api/src/modules/integrations/ccxt-binance-adapter.ts`):
    - `getOpenOrders()` now returns `[]` when `symbolId` is missing/blank (no global open-order fetch),
    - force-sets `ex.options.warnOnFetchOpenOrdersWithoutSymbol=false` after exchange construction (constructor option was not reliably honored in runtime).
- Risk slider impact: none (execution reliability only).
- Validation evidence:
  - Evidence bundle `autobot-feedback-20260213-092451.tgz` shows backoff loop error text from CCXT: `fetchOpenOrders() WARNING ... without specifying a symbol ...` and zero trades.
  - API image builds clean: `docker compose build api`.
- Runtime test request:
  - Redeploy API/UI and run 20-30 minutes with `liveTrading=true` on Spot testnet.
  - Confirm decisions progress beyond `order-sync` skips and trades resume.
- Follow-up:
  - If we later need “global open orders” discovery, implement it as an explicit low-frequency job (not per-tick) and accept stricter limits intentionally.

## 2026-02-13 09:57 UTC — T-027 grid hardening (LIMIT ladder sizing at LIMIT price)
- Scope: make `SPOT_GRID` LIMIT ladder placements pass Binance filters more reliably (tick size + minNotional evaluated at the LIMIT price), so open orders actually stay open.
- BA requirement mapping:
  - User expects to see real open LIMIT orders (grid ladder) in Binance UI and our dashboard when `tradeMode=SPOT_GRID`.
  - User reported repeated `Filter failure: NOTIONAL` and lack of active orders.
- PM milestone mapping: finish the next `T-027` slice to support a meaningful 2–4h live test where active orders are visible.
- Technical changes:
  - Market data rules (`apps/api/src/modules/integrations/binance-market-data.service.ts`):
    - parse `PRICE_FILTER` and expose `priceFilter` in `BinanceSymbolRules`,
    - add `normalizeLimitPrice(symbol, desiredPrice, side)` (BUY floors to tick, SELL ceils to tick),
    - add `validateLimitOrderQty(symbol, desiredQty, limitPrice)` (LOT_SIZE + minNotional check at LIMIT price).
  - Bot grid ladder (`apps/api/src/modules/bot/bot-engine.service.ts`):
    - normalize buy/sell ladder prices to tick size,
    - size/validate BUY ladder by affordability then enforce minNotional at LIMIT price,
    - validate SELL ladder using LOT_SIZE + minNotional at LIMIT price,
    - emit explicit SKIP decisions when ladder sizing is rejected (instead of silent retries).
- Risk slider impact:
  - Existing risk scaling remains (grid density/spacing). This change improves feasibility for all risk levels by applying correct filter math at the ladder price.
- Validation evidence:
  - Docker CI passed: `docker compose -f docker-compose.ci.yml run --rm ci`.
- Runtime test request:
  - Run 30–60 minutes in Spot testnet with `tradeMode=SPOT_GRID` and `risk=100`.
  - Confirm `Orders (active)` becomes non-empty and no repeated `Filter failure: NOTIONAL` loops for the same symbol.
- Follow-up:
  - If LIMIT orders still cancel quickly, capture bundle and check `TRADE` details `validation.*` fields for tick/minNotional drift.

## 2026-02-13 10:33 UTC — T-027 diagnostics (feasible-candidate rejection samples)
- Scope: make “No feasible candidates after sizing/cap filters” actionable by capturing *why* candidates were rejected (without needing long runs).
- BA requirement mapping:
  - User reported long idle periods with only a single SKIP message and asked for faster iteration.
  - Current bundles lacked per-candidate reject reasons, making analysis guessy.
- PM milestone mapping: speed up T-027 validation loop by improving decision evidence quality.
- Technical changes:
  - Bot engine (`apps/api/src/modules/bot/bot-engine.service.ts`):
    - `pickFeasibleLiveCandidate()` now returns `rejectionSamples` (up to 8) containing symbol, stage, reason, and key sizing numbers,
    - the resulting SKIP decision now includes wallet/cap context (`walletTotalHome`, `quoteFree`, `maxSymbolNotional`, `bufferFactor`, `capitalTier`) plus `rejectionSamples`.
- Risk slider impact: none (diagnostics only; no change to sizing formulas).
- Validation evidence:
  - Docker CI passed: `docker compose -f docker-compose.ci.yml run --rm ci`.
- Runtime test request:
  - Redeploy and run 5–10 minutes.
  - If the bot skips feasibility, open the latest decision details and confirm `rejectionSamples` explains the dominant blocker (minNotional, exposure cap, notional cap, etc.).
- Follow-up:
  - Implement the smallest behavior change that addresses the dominant blocker (based on the new evidence) for the next 2–4h run.

## 2026-02-12 19:45 UTC — T-027 P0 hotfix (CCXT open-orders sync warning loop)
- Scope: fix immediate no-trade loop where bot entered transient backoff repeatedly during pre-trade order sync.
- BA requirement mapping:
  - User reported bot inactivity and repeating sync loop immediately after restart.
  - User asked if issue was Binance Testnet inability to return orders.
- PM milestone mapping: keep active `T-027` lane stable and runnable for overnight validation.
- Technical changes:
  - Confirmed root cause from bundle `autobot-feedback-20260212-194020.tgz`:
    - repeated decisions: `Skip: Live order sync failed`,
    - error text from CCXT Binance: `fetchOpenOrders() WARNING ... without specifying a symbol ...`.
  - Bot engine sync path (`apps/api/src/modules/bot/bot-engine.service.ts`):
    - switched live order sync to symbol-aware calls only (tracked active-order symbols),
    - removed unsymbolized open-order fetch from tick path to avoid warning-triggered backoff loop.
  - CCXT adapter safety (`apps/api/src/modules/integrations/ccxt-binance-adapter.ts`):
    - set `options.warnOnFetchOpenOrdersWithoutSymbol = false` as defensive guard.
- Risk slider impact: none (exchange sync reliability only; trading/risk formulas unchanged).
- Validation evidence:
  - Docker CI passed: `docker compose -f docker-compose.ci.yml run --rm ci`.
  - Bundle evidence shows this is not a generic “testnet can’t return orders” limitation; it was our unsymbolized sync call pattern.
- Runtime test request:
  - Redeploy and run 20-30 minutes.
  - Verify no new `order-sync` backoff loop decisions.
  - Verify decisions progress to normal `SKIP`/`TRADE` flow.
- Follow-up:
  - Consider optional periodic full open-order reconciliation job (slower cadence) if we need discovery of externally-created orders.

## 2026-02-12 19:26 UTC — T-027 P0 hotfix (engine stall prevention after night patch)
- Scope: fix bot inactivity where runtime showed `running=true` but produced almost no decisions/trades after startup.
- BA requirement mapping:
  - User reported only ~2 actions for ~2h and bot effectively idle.
  - User requested highest-priority investigation of night patch impact.
- PM milestone mapping: critical runtime continuity fix under active `T-027` lane.
- Technical changes:
  - Bot engine (`apps/api/src/modules/bot/bot-engine.service.ts`):
    - added `onModuleInit` recovery to resume loop when persisted state is `running=true` after process/container restart,
    - refactored start path to ensure loop/examine timers are (re)attached when needed,
    - added `withTimeout(...)` helper and guarded live order sync with 15s timeout,
    - moved transient backoff handling to cover pre-trade order-sync stage,
    - added explicit `SKIP` decisions/details for order-sync failures/backoff instead of silent tick abort.
- Risk slider impact: none (execution continuity/observability fix only; risk formulas unchanged).
- Validation evidence:
  - Root-cause evidence from `autobot-feedback-20260212-191102.tgz`:
    - baseline runtime only ~10s with `running=true`, `trades=0`, `skips=0`,
    - indicates tick loop stalled before decision/trade path.
  - Docker CI passed: `docker compose -f docker-compose.ci.yml run --rm ci`.
- Runtime test request:
  - Redeploy and run 20-30 minutes.
  - Verify decisions continue beyond initial EXAMINE and include either trades or explicit skips.
  - Verify no prolonged `running=true` + zero decision growth state.
- Follow-up:
  - If inactivity repeats, collect immediate bundle and check for new `order-sync` skip details to isolate exchange-side behavior.

## 2026-02-12 19:18 UTC — T-027 P0 hotfix (UI setup-state stability + polling resilience)
- Scope: fix urgent runtime issue where UI intermittently redirected to onboarding and appeared slow despite existing config.
- BA requirement mapping:
  - User reported setup wizard reappearing after refresh/restart even when bot remained configured.
  - User reported degraded UI responsiveness during live run.
- PM milestone mapping: P0 production stability fix while staying within active single-lane ticket (`T-027`).
- Technical changes:
  - UI HTTP client (`apps/ui/src/api/http.ts`):
    - added `no-store`/no-cache fetch policy for API calls,
    - added `304` recovery path with in-memory GET payload fallback + retry fetch,
    - hardened JSON parsing for empty/204 responses.
  - Setup status hook (`apps/ui/src/hooks/useSetupStatus.ts`):
    - no longer forces `initialized=false` on transient fetch failures,
    - added retry loop and error state to avoid false onboarding redirects.
  - App boot view (`apps/ui/src/app/App.tsx`):
    - shows setup-status retry message during transient bootstrap failures.
  - Polling resilience and UI smoothness:
    - hooks now retain last good snapshot on transient fetch errors (`config`, `integrations`, `wallet`, `universe`, `run-stats`),
    - lowered expensive polling pressure (`integrations`/`wallet` to 30s, run-stats to 8s).
- Risk slider impact: none (UI/runtime transport behavior only; trading policy unchanged).
- Validation evidence:
  - Root-cause evidence from `autobot-feedback-20260212-191102.tgz`:
    - repeated `304` on `/setup/status` and `/config/public`,
    - setup hook previously interpreted fetch failure as uninitialized.
  - Docker CI passed: `docker compose -f docker-compose.ci.yml run --rm ci`.
- Runtime test request:
  - Redeploy UI+API containers and refresh dashboard repeatedly.
  - Confirm no onboarding redirect when `data/config.json` exists.
  - Confirm reduced UI jitter and stable data cards during temporary API latency.
- Follow-up:
  - If any onboarding bounce remains, capture fresh bundle immediately after bounce and include browser network HAR for `/api/setup/status`.

## 2026-02-12 17:56 UTC — Session brief automation helper (bundle -> section 4)
- Scope: automate end-of-batch `SESSION_BRIEF` completion from collected feedback bundle to reduce manual errors and speed morning handoff.
- BA requirement mapping:
  - User asked to automate manual section filling.
  - Keep PM/BA process usable without repeated prompt guidance.
- PM milestone mapping: execution process acceleration for nightly/day cycle analysis.
- Technical changes:
  - Added `scripts/update-session-brief.sh`:
    - reads latest (or provided) `autobot-feedback-*.tgz`,
    - extracts `state` + telemetry artifacts,
    - computes LIMIT lifecycle, market-order share signal, sizing reject pressure,
    - auto-updates Section 4 in `docs/SESSION_BRIEF.md`,
    - writes recommended decision (`continue`/`pivot`) and next ticket hint.
  - Updated `docs/SESSION_BRIEF.md` validation commands to include automation helper.
  - Updated `docs/TEAM_OPERATING_RULES.md` batch cadence to require running helper after feedback collection.
- Risk slider impact: none (process/runtime-report automation only).
- Validation evidence: helper script executed against latest local bundle and updated `docs/SESSION_BRIEF.md` successfully.
- Runtime test request:
  - after each run, execute:
    - `./scripts/collect-feedback.sh`
    - `./scripts/update-session-brief.sh`
  - confirm Section 4 is populated before next prioritization decision.
- Follow-up:
  - if needed, extend helper to emit a compact markdown summary for release notes.

## 2026-02-12 17:45 UTC — Session brief prefill for active night run (T-027)
- Scope: pre-populate the mandatory batch contract so overnight validation has explicit acceptance criteria and morning handoff fields.
- BA requirement mapping:
  - User requested practical PM/BA help for prioritization and DoD usage.
  - Reduce ambiguity during long running sessions.
- PM milestone mapping: improve execution discipline for ongoing T-027 night validation.
- Technical changes:
  - Filled `docs/SESSION_BRIEF.md` with:
    - active ticket and night scope,
    - concrete DoD for API/UI/runtime evidence,
    - KPI targets and rollback conditions,
    - deploy/operator checklist and next-session prompt.
- Risk slider impact: none (process/handoff update only).
- Validation evidence: document consistency check completed (session brief aligned with board active ticket `T-027`).
- Runtime test request:
  - complete end-of-batch section in `docs/SESSION_BRIEF.md` after bundle collection,
  - use result to choose next single ticket (`T-007` or remaining `T-027` slice).
- Follow-up:
  - keep this file updated at start/end of every future day/night batch.

## 2026-02-12 17:39 UTC — Process hardening v3 (PM/BA playbook + session brief)
- Scope: convert process guidance into concrete templates so prioritization and DoD are repeatable without prompt iteration.
- BA requirement mapping:
  - User requested PM/BA support for priority decisions and hard Definition of Done.
  - Reduce looping/context-loss by enforcing structured start/end handoff per batch.
- PM milestone mapping: delivery-governance stabilization before next runtime patch cycle.
- Technical changes:
  - Added `docs/PM_BA_PLAYBOOK.md` with:
    - hard priority scoring model,
    - day/night batch selection rubric,
    - strict DoD template,
    - mandatory KPI set.
  - Added `docs/SESSION_BRIEF.md` template:
    - batch contract,
    - DoD section,
    - deploy handoff checklist,
    - end-of-batch decision + next-session prompt block.
  - Updated `docs/TEAM_OPERATING_RULES.md`:
    - made session brief + playbook mandatory in workflow,
    - expanded DoD completion rule to include session brief closure.
  - Updated `docs/DELIVERY_BOARD.md` with explicit PM/BA execution-control references.
- Risk slider impact: none (process/documentation update only).
- Validation evidence: document consistency check completed (`DELIVERY_BOARD`, `TEAM_OPERATING_RULES`, `PM_BA_CHANGELOG`, `PM_BA_PLAYBOOK`, `SESSION_BRIEF` aligned).
- Runtime test request:
  - Use new `SESSION_BRIEF` for next patch batch start/end.
  - Keep single active ticket lane and measure KPI deltas using playbook template.
- Follow-up:
  - For next code patch, require ticket DoD block to be copied from `PM_BA_PLAYBOOK.md` and filled before coding.

## 2026-02-12 17:16 UTC — T-027 spot grid execution v1 (night direct patch)
- Scope: deliver a direct night-build patch to move execution from market-only behavior to real Spot LIMIT/grid lifecycle.
- BA requirement mapping:
  - User must see real open orders on exchange when grid mode is selected.
  - Bot should not depend on market-only fills for all strategies.
- PM milestone mapping: accelerate to meaningful POC behavior under live testnet with single active ticket lane.
- Technical changes:
  - Exchange adapter (`ccxt`) now supports:
    - `placeSpotLimitOrder`,
    - `getOpenOrders`,
    - `getOrder`,
    - `cancelOrder`.
  - Trading service exposes the above APIs to bot engine.
  - Bot engine now syncs open orders from exchange each tick (instead of auto-canceling local active orders in live mode).
  - Added grid execution branch for `SPOT_GRID` mode:
    - places resting LIMIT BUY/SELL ladder orders around anchor price,
    - enforces max grid orders per symbol (risk-scaled),
    - keeps market execution path as fallback for non-grid mode.
  - Updated run-stats note and feedback collection script:
    - active-order note now differentiates SPOT vs SPOT_GRID behavior,
    - support bundle includes `state-summary.txt` and retrospective docs snapshot, plus larger API/UI log tails.
- Risk slider impact:
  - explicit: grid density cap is risk-scaled (`maxGridOrdersPerSymbol`),
  - spacing is volatility/risk-aware (`atrPct14` + risk factor),
  - no change to existing risk guard locks.
- Validation evidence: Docker CI passed (`docker compose -f docker-compose.ci.yml run --rm ci`).
- Runtime test request:
  - Night run in `SPOT_GRID` mode:
    - verify non-zero active LIMIT orders appear on Binance + UI,
    - verify order history contains `LIMIT` entries (`grid-ladder-buy` / `grid-ladder-sell` reasons),
    - verify no market-only flood when grid mode is active.
- Follow-up:
  - Add price-filter-aware ladder placement (`PERCENT_PRICE_BY_SIDE` pre-check) in next T-027 slice.
  - Add limit order reconciliation metrics to run-stats (`openLimitOrders`, `filledLimitOrders`).

## 2026-02-12 18:05 UTC — Process hardening v2 (timebox + AI specialist + single lane)
- Scope: stop cyclical patching and context-switch drift by enforcing a strict execution cadence and role ownership model.
- BA requirement mapping:
  - User requested speed-up and explicit prevention of daily looping.
  - Team must keep time-awareness despite context window limits.
- PM milestone mapping: delivery governance upgrade before next implementation cycle.
- Technical changes:
  - Added retrospective doc `docs/RETROSPECTIVE_2026-02-12.md` with 4-day evidence and bottlenecks.
  - Updated `docs/TEAM_OPERATING_RULES.md`:
    - mandatory role ownership section including `AI Specialist`,
    - mandatory day/night batch timeboxes (`2-4h`, `8-12h`),
    - mandatory hypothesis/KPI/stop-condition per batch,
    - freeze rule after 2 non-improving batches.
  - Updated `docs/DELIVERY_BOARD.md` to enforce one active lane:
    - queued all previous parallel `IN_PROGRESS` tickets,
    - created single active ticket `T-027` (Spot limit/grid execution v1).
- Risk slider impact: none (process/governance update only).
- Validation evidence: document consistency check completed (board + rules + changelog aligned).
- Runtime test request:
  - Next deploy batch must target only `T-027`.
  - Define KPI targets before coding (open-order count stability, entry-vs-conversion ratio, sizing reject ratio).
- Follow-up:
  - Implement `T-027` in one focused patch batch.
  - Record day-batch results and go/no-go decision before any parallel scope starts.

## 2026-02-12 15:44 UTC — T-006/T-023 night-build slice (feasibility filter + KPI visibility)
- Scope: deliver the requested night scope to reduce invalid candidate churn and make execution quality visible in UI KPIs.
- BA requirement mapping:
  - AUTOBOT should avoid repeatedly choosing candidates that cannot pass exchange sizing/cap constraints.
  - Operator needs direct visibility of conversion-vs-entry behavior and sizing reject pressure.
- PM milestone mapping: night build readiness for 2-4h + overnight validation with measurable selection/execution indicators.
- Technical changes:
  - Added live pre-trade candidate feasibility filter in engine:
    - checks lot/minNotional viability through Binance market validation,
    - enforces exposure/cap-aware feasibility before final candidate lock,
    - skips tick with explicit reason when no feasible candidate remains.
  - Extended baseline KPI totals:
    - `entryTrades`,
    - `sizingRejectSkips`,
    - `conversionTradePct`,
    - `entryTradePct`,
    - `sizingRejectSkipPct`.
  - Added dashboard KPI pills in Adaptive panel:
    - `% conversion trades`,
    - `% entry trades`,
    - `% sizing rejects`.
- Risk slider impact:
  - Feasibility stage respects risk-linked sizing inputs indirectly via derived position cap and existing risk-based notional/cooldown policy.
  - No new hardcoded risk constants were added.
- Validation evidence: Docker CI run requested in this patch batch.
- Runtime test request:
  - Run 2-4h on testnet and compare against prior baseline:
    - lower repeated NOTIONAL candidate loops,
    - lower sizing reject ratio,
    - conversion/entry percentages stabilize (not conversion-dominant flood).
- Follow-up:
  - Continue T-004 with conversion source weighting tuned by regime and wallet utilization bands.
  - Continue T-007 with fee-aware PnL reconciliation and realized/unrealized split.

## 2026-02-12 15:35 UTC — T-004/T-006 night-build prep (conversion anti-churn + stable policy correction)
- Scope: stop conversion-driven churn observed in `autobot-feedback-20260212-151348.tgz` and align stable/EEA policy with latest Binance EEA notice.
- BA requirement mapping:
  - Adaptive AUTOBOT should not produce high trade count with flat wallet due to internal conversion loops.
  - Stable/stable behavior and regional filtering must match real exchange behavior better (especially `U` in testnet/mainnet pairset).
- PM milestone mapping: night run readiness with measurable execution-quality improvements before deeper adaptive policy promotion.
- Technical changes:
  - Policy updates:
    - Classified `U` as stable-like for pair policy (`excludeStableStablePairs` now filters `UUSDC`).
    - Expanded EEA blocked quote defaults (`USDT`, `DAI`, `AEUR`, `XUSD`, `PAXG`, `USD1`, `FDUSD`, `FUSD`, `BUSD`, `TUSD`, `USDP`, `USDS`, plus `U`).
  - Entry execution anti-churn:
    - Added affordability downsize before conversion (attempt smaller valid qty first when quote shortfall is small).
    - Added shortfall trigger gate: if quote reserve is healthy and shortfall is too small, skip conversion instead of forcing micro top-up.
  - Conversion routing anti-churn:
    - Source prioritization now prefers non-open-position assets and stable-like sources.
    - Added per-source conversion cooldown to avoid repeated selling of the same asset every global cooldown tick.
    - Avoids selling open managed position assets for non-reserve-recovery top-ups.
- Risk slider impact:
  - Maintained existing risk-link formulas.
  - Shortfall trigger threshold is risk-aware (higher risk permits smaller shortfall conversions; low risk requires larger deficit).
- Validation evidence: Docker CI passed (`docker compose -f docker-compose.ci.yml run --rm ci`).
- Runtime test request (night build):
  - Verify `UUSDC` is no longer used for repetitive entry/conversion ping-pong when stable/stable filtering is enabled.
  - Verify conversion trade share drops materially vs prior run (`62/71` conversion-heavy baseline).
  - Verify NOTIONAL skip bursts are reduced and candidate rotation continues without fallback spam.
- Follow-up:
  - Continue T-006 with pre-trade feasibility filter chain to suppress repeated NOTIONAL candidates earlier.
  - Continue T-007 with fee-aware realized/unrealized PnL visibility improvements.

## 2026-02-12 12:52 UTC — T-020/T-023 supporting patch (config-driven routing + adaptive universe defaults)
- Scope: deliver a 2-4h testable slice that removes hardcoded routing behavior and exposes quote/bridge discovery controls in Advanced UI.
- BA requirement mapping:
  - Autobot must adapt by environment/config instead of fixed symbol assumptions.
  - Operator should tune routing/universe behavior from UI/exported config, not hidden env defaults.
- PM milestone mapping: M1 stabilization speed-up with explicit config controls before next overnight run.
- Technical changes:
  - Added advanced config fields:
    - `routingBridgeAssets`
    - `universeQuoteAssets`
    - `walletQuoteHintLimit`
  - Refactored runtime services to use config-driven routing assets:
    - universe valuation path,
    - conversion router bridge path,
    - wallet valuation path (portfolio + bot).
  - Removed fallback behavior that forced hardcoded candidate symbol (`BTC<home>`); bot now cleanly skips with explicit reason when no eligible universe candidate exists.
  - Replaced hidden env fallbacks for trade cooldown/cap/slippage/rebalance and conversion top-up cooldown with schema-backed config defaults.
  - Exposed all new routing/universe fields in `/config/public`, `/config/advanced`, and Advanced settings UI.
- Risk slider impact: unchanged formulas; routing behavior is now deterministic under exported config, while risk-linked controls continue to govern execution pacing/sizing.
- Validation evidence: Docker CI requested in this patch batch (post-edit validation step).
- Runtime test request (2-4h):
  - Keep `universeQuoteAssets` empty (auto mode) and observe quote-asset set evolution via dashboard universe snapshot.
  - Confirm no `Skip BTC...` fallback noise when candidate pool is empty; expect explicit skip reason without forced symbol.
  - Verify conversions/valuations use configured `routingBridgeAssets` by changing bridge list and comparing decisions/valuations.
- Follow-up:
  - Continue T-020 by moving fee/spread runtime env constants into explicit Advanced config controls.
  - Continue T-023 with filter-chain stage diagnostics in run-stats/UI.

## 2026-02-12 11:50 UTC — T-004/T-006 supporting patch (sizing anti-churn)
- Scope: reduce reject-loop churn observed in `autobot-feedback-20260212-114132.tgz` and tighten autonomous wallet behavior under high risk.
- BA requirement mapping:
  - Autobot should not loop on low-value stable-like rotations that do not improve portfolio quality.
  - Decision stream should stay readable and avoid repeated reject spam on the same symbol.
- PM milestone mapping: M1 stabilization before broader universe/filter-chain rollout.
- Technical changes:
  - Added symbol-level sizing cooldown lock on live `NOTIONAL/LOT_SIZE` rejects:
    - lock type: `COOLDOWN`, scope: `SYMBOL`,
    - cooldown window scales by risk (120s -> 40s),
    - reason/details are visible in protection locks for diagnostics.
  - Added API policy tests for:
    - stable/stable block behavior,
    - EEA quote restriction check.
- Risk slider impact: explicit; sizing cooldown is shorter at higher risk while still preventing reject loops.
- Validation evidence: targeted API tests and full Docker CI run (requested in this patch batch).
- Runtime test request:
  - Run 2-4h on testnet.
  - Verify repeated `Skip <symbol>: Binance sizing filter (...)` bursts are reduced and replaced by temporary protection lock behavior.
- Follow-up:
  - Continue T-004 with wallet dust governance visibility in UI.
  - Continue T-006 with filter-chain stage diagnostics and regime-diverse candidate rotation.

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
