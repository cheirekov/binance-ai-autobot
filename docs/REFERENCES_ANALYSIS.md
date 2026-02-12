# Reference Codebase Analysis (local `references/`)

This repo now contains several third‑party codebases under `references/` for **local study only**. The goal is to extract proven design patterns (exchange connectivity, market rules, backtesting/paper vs live separation, risk controls) without blindly copying code.

> Note: This document is engineering analysis, not financial advice.

## What’s in `references/`

| Folder | What it is | Language | License (as found locally) | Can we copy code into this repo? |
|---|---|---:|---|---|
| `references/freqtrade-stable` | Freqtrade trading bot framework | Python | **GPLv3** (`LICENSE`) | **No** (unless this repo becomes GPLv3‑compatible) |
| `references/freqtrade-develop` | Freqtrade trading bot framework (develop branch) | Python | **GPLv3** (`LICENSE`) | **No** (unless this repo becomes GPLv3‑compatible) |
| `references/jesse-master` | Jesse algo trading framework | Python | **MIT** (`LICENSE`) | Yes (with attribution) |
| `references/ccxt-master` | CCXT multi‑exchange trading API | JS/TS/Python/etc | **MIT** (`LICENSE.txt`) | Prefer using the published `ccxt` package; copying is allowed with attribution |
| `references/crypto-trading-open-main` | Multi‑exchange trading system (grid/arbitrage/etc) | Python | **No license file found** (author permission required) | Only if the author explicitly grants permission; recommended to add a license file before redistribution |

### Notes on `crypto-trading-open-main` (friend project)

If this codebase is authored by your friend and you have explicit permission to use it:

- Best practice is still to add a `LICENSE` file (e.g., MIT/Apache-2.0/proprietary) plus a short permission statement, so the status is unambiguous for future contributors and CI/CD.
- If you intend to keep this repo private only, a clear internal permission note is usually sufficient.
- If you intend to publish/distribute this repo, you should make sure all included dependencies/assets are compatible with the chosen license.

## Key findings (relevant to our Binance Spot+Grid MVP)

### 0) Freqtrade “ML optimization” vs FreqAI (what the README means)

Freqtrade contains **two different “AI/ML” concepts**:

- **Hyperopt (strategy optimization)**: uses an optimizer to search a parameter space (thresholds, periods, etc.) against backtest results. This is “machine learning” in the sense of automated optimization, not market prediction.
- **FreqAI (adaptive prediction)**: trains predictive models on features/labels, then uses predictions as strategy inputs. It can periodically retrain in dry/live and can simulate retraining in backtests.

For our project:

- Hyperopt-like optimization is valuable but **not MVP** (we need deterministic paper trading + realistic fills/fees first).
- FreqAI-like prediction is also valuable, but it’s a **big subsystem** (data pipeline + model lifecycle).

> Note: `references/freqtrade-develop` also contains a `LICENSE.txt` that looks like CCXT’s MIT license. That does **not** change Freqtrade’s project license (GPLv3 via `LICENSE`). Treat Freqtrade as GPLv3 and do not copy code into this repo.

### 1) Exchange connectivity & reliability patterns

Common patterns across reference projects:

- **Retry/backoff for transient errors** (5xx/timeout/network); do not “spam retry” tight loops.
- **Time sync / recvWindow handling** for signed endpoints.
- **Rate limit awareness** (request weight + order limits).
- **Explicit environment routing** (mainnet vs testnet) rather than ad‑hoc base URLs.
- **Better error messaging** for “legal restrictions” cases (e.g., HTTP 451 in Jesse’s candle importer).

Where to look:

- Jesse candle importer retries + HTTP 451 messaging:
  - `references/jesse-master/jesse/modes/import_candles_mode/drivers/Binance/BinanceMain.py`
- CCXT’s canonical Binance sandbox/testnet URL map (spot + futures):
  - `references/ccxt-master/ts/src/binance.ts`
- “Adapter” style abstraction (REST + WS modules + health checks):
  - `references/crypto-trading-open-main/core/adapters/exchanges/adapters/binance.py`
  - `references/crypto-trading-open-main/core/adapters/exchanges/adapters/binance_rest.py`

### 2) Market rules (minNotional, stepSize, minQty) and sizing

Why this matters:

- Many “why did it skip?” issues are actually **market filters** (minNotional / LOT_SIZE / stepSize).
- Robust bots calculate the **minimum stake/qty** from market metadata and size positions accordingly.

Notable approach (Freqtrade):

- Calculates min/max stake using CCXT market `limits` (cost + amount) and additional safety reserves.
  - `references/freqtrade-stable/freqtrade/exchange/exchange.py` (`get_min_pair_stake_amount`, `_get_stake_amount_limit`)

Implication for our repo:

- If we adopt CCXT in Node, we can use its normalized market metadata to drive sizing and reduce exchange‑specific edge cases.
- Even without CCXT, we should model the same concept: compute **min required qty** (and show it in UI/logs).

### 3) Strategy framework patterns (grid/DCA/rebalancing)

What’s reusable as “patterns” (not copy‑paste):

- **Strategy interface** with clear lifecycle:
  - decide → size → place → monitor → adjust → exit
- **Paper vs live**: same logic; only the execution layer changes.
- **Risk policy is a hard gate**: AI may recommend but cannot override constraints.

Reference hints:

- Freqtrade: strategy plugins + risk constraints + backtesting/hyperopt (GPL; read only).
- Jesse: very simple strategy authoring and risk helpers (MIT; patterns are useful).
- crypto-trading-open-main: operational safety controllers (cooldowns, “error avoidance”, re-tries, WS batching) — good ideas, but no license file found.

### 4) Backtesting and “learning from history”

Reality check:

- Backtesting frameworks (Freqtrade/Jesse) are substantial products; rebuilding them from scratch inside a NestJS API is non‑trivial.
- For our MVP, we can still get value from a “minimum viable research loop”:
  - persist candles/trades,
  - replay decisions deterministically,
  - measure drawdown/PnL in paper mode,
  - then iterate.

## Recommendation: how to proceed (POC options)

### What to learn specifically from FreqAI (patterns only; Freqtrade is GPL)

FreqAI’s docs explain an architecture we can borrow conceptually:

- **Feature/label split**:
  - Strategy provides *features* (indicators and transforms) and *labels* (future-looking targets).
  - ML model predicts labels; strategy then gates entries/exits using thresholds.
- **Sliding training window**:
  - `train_period_days` + `backtest_period_days` for backtest; `live_retrain_hours` / expiration controls for live.
- **Per-pair model lifecycle**:
  - Train per symbol, keep newest model in RAM for inference, retrain in background threads.
- **Crash resilience**:
  - Persist models and historic predictions to disk keyed by an `identifier`.
- **Explicit restriction**:
  - Hyperopt is meant to tune *entry/exit thresholds*, not the feature generation / targets (to avoid invalid reuse and look-ahead pitfalls).

Relevant files for study:

- Overview and constraints:
  - `references/freqtrade-stable/docs/freqai.md`
  - `references/freqtrade-stable/docs/freqai-running.md`
  - `references/freqtrade-stable/docs/freqai-configuration.md`
- Core interfaces/pipeline:
  - `references/freqtrade-stable/freqtrade/freqai/freqai_interface.py`
  - `references/freqtrade-stable/freqtrade/freqai/data_kitchen.py`

### Option A (recommended): Keep NestJS core, add an adapter layer + CCXT (Node)

- Use `ccxt` as a dependency (not the vendored source) for:
  - market metadata (limits/precision),
  - balance/account reads,
  - order placement (spot first).
- Keep our current UI + config format.
- Implement a real execution layer (paper/live) behind a single interface.

Status: **in progress** — the API now uses `ccxt` for Binance Spot balances + market order placement (demo trading for Spot testnet). Market-data/limits are still fetched via direct REST and will be unified next.

Pros: single language/runtime; easiest to dockerize; fastest iteration.  
Cons: CCXT adds weight; still need to implement strategy logic ourselves.

### Option B: Sidecar strategy engine (Python) + NestJS orchestrator

- Run a Python engine container (e.g., Jesse) for backtesting/paper/live logic.
- NestJS becomes the “control plane” (auth, config, UI API), talking to the engine via HTTP/gRPC.

Pros: leverage mature backtesting + strategy tooling.  
Cons: bigger architecture shift (extra container, cross-language integration).

### Option C: Build directly on Freqtrade

Not recommended unless we explicitly accept GPLv3 implications for the whole project.

## Proposed next tasks (pick a path)

1) Decide POC direction (A vs B).  
2) Define the “execution interface” we won’t break again:
   - `MarketData` (prices, exchangeInfo, klines)
   - `Portfolio` (balances, valuation)
   - `OrderExecutor` (paper/live)
3) Update roadmap + architecture docs for the chosen POC.

## Delivery decision (PM/BA, Feb 11, 2026)

To keep progress measurable while reducing integration risk, we run two tracks in parallel:

1. **Baseline execution track**: production path used for Spot testnet trading and KPI evaluation.
2. **Adaptive shadow track**: regime + strategy scoring logged on each decision without controlling execution.

Promotion rule:

- Adaptive logic is allowed to influence live execution only after it consistently improves baseline KPIs (drawdown, churn, and trade quality) over multiple testnet windows.

## PM/BA tracking guardrails (to avoid drift)

This project now follows an explicit “reference -> requirement -> implementation” checkpoint before each milestone:

1) **Reference extraction** (what pattern we are borrowing, with file path in `references/`).
2) **BA requirement mapping** (which user requirement this pattern addresses).
3) **Implementation ticket** (which module/file is changed in this repo).
4) **Validation artifact** (which log/snapshot proves behavior on testnet).

Current applied mappings:

- **Market filter enforcement (minQty/minNotional/stepSize)**
  - Reference pattern: Freqtrade market-limit handling (`references/freqtrade-stable/freqtrade/exchange/exchange.py`)
  - Requirement: no invalid small orders / clear skip reasons
  - Implemented: `apps/api/src/modules/integrations/binance-market-data.service.ts`

- **Conversion routing before skip**
  - Reference pattern: multi-step exchange routing/adapters (`references/crypto-trading-open-main/core/adapters/exchanges/adapters/binance.py`)
  - Requirement: top up home stable before skipping trades
  - Implemented: `apps/api/src/modules/integrations/conversion-router.service.ts`, `apps/api/src/modules/bot/bot-engine.service.ts`

- **Risk policy as hard guard with AI as gated input**
  - Reference pattern: strategy/risk separation (Freqtrade/Jesse conceptual)
  - Requirement: AI and engine should not “fight”; risk remains authoritative
  - Implemented: `apps/api/src/modules/bot/bot-engine.service.ts`, `packages/shared/src/schemas/app-config.ts`

- **Capital-aware sizing + fee/edge gating**
  - Reference pattern: stake-limit and reserve discipline from mature engines (Freqtrade exchange-limit concepts)
  - Requirement: protect small accounts from over-sizing and low-edge entries after fees/slippage
  - Implemented: `apps/api/src/modules/bot/bot-engine.service.ts`

- **Universe diversification + quote normalization**
  - Reference pattern: multi-market universe ranking should normalize liquidity across quote currencies.
  - Requirement: autobot should discover viable non-home-quote opportunities without manual trader tuning.
  - Implemented: `apps/api/src/modules/universe/universe.service.ts`

- **Transient exchange fault handling**
  - Reference pattern: network/timeout/rate-limit errors treated as recoverable, not strategy failures.
  - Requirement: avoid noisy temporary blacklists and confusing error strings in UI/state.
  - Implemented: `apps/api/src/modules/bot/bot-engine.service.ts`

- **Transient error exponential backoff (new)**
  - Reference pattern: exchange fault backoff controller with escalating pause windows and auto-recovery.
    - `references/crypto-trading-open-main/core/services/arbitrage_monitor_v2/risk_control/error_backoff_controller.py`
    - `references/crypto-trading-open-main/core/services/arbitrage_monitor_v2/risk_control/network_state.py`
  - Requirement: during network/rate-limit turbulence, bot should pause retries briefly instead of hammering exchange APIs.
  - Implemented: `apps/api/src/modules/bot/bot-engine.service.ts`

## Deep review update: `references/freqtrade-develop` (Feb 11, 2026)

This section records concrete, reusable patterns from `freqtrade-develop` without copying GPL code.

### A) FreqAI lifecycle patterns (adaptive model behavior)

Reference files:

- `references/freqtrade-develop/freqtrade/freqai/freqai_interface.py`
- `references/freqtrade-develop/freqtrade/freqai/data_kitchen.py`

Patterns extracted:

- Sliding train/backtest windows (`train_period_days` + `backtest/live retrain cadence`).
- Background retraining queue ordered by oldest model timestamp (prevents stale per-symbol models).
- Model expiration guard (`expired_hours`) with explicit “prediction not trustworthy” signaling.
- Confidence/outlier gating via DI/SVM/DBSCAN pipeline, separated from trading decision logic.
- Rolling live-prediction statistics (`label mean/std`) used to adapt thresholds over time.

Mapping to our architecture:

- Add an **adaptive shadow model service** that computes confidence and regime, but does not place orders directly.
- Keep risk policy authoritative: adaptive score can propose, policy decides.
- Persist model health metadata (model age, confidence quality) in telemetry for promotion gates.

### B) Universe discovery pipeline patterns

Reference files:

- `references/freqtrade-develop/freqtrade/plugins/pairlistmanager.py`
- `references/freqtrade-develop/freqtrade/plugins/pairlist/VolumePairList.py`
- `references/freqtrade-develop/freqtrade/plugins/pairlist/VolatilityFilter.py`
- `references/freqtrade-develop/freqtrade/plugins/pairlist/rangestabilityfilter.py`
- `references/freqtrade-develop/freqtrade/plugins/pairlist/PerformanceFilter.py`
- `references/freqtrade-develop/freqtrade/plugins/pairlist/PriceFilter.py`

Patterns extracted:

- Generator + filter chain architecture (single pipeline pass).
- Explicit cache TTL per filter to avoid exchange thrash.
- Filters split by purpose: liquidity, volatility, range stability, price granularity, recent performance.
- Backtest/live compatibility checks per filter.

Mapping to our architecture:

- Convert `UniverseService` to a staged filter chain with per-stage diagnostics.
- Tie filter thresholds to risk slider defaults, while keeping Advanced override controls.
- Keep a “candidate rejected by stage” trace for UI explainability.

### C) Risk protection plugins (global and per-symbol)

Reference files:

- `references/freqtrade-develop/freqtrade/plugins/protectionmanager.py`
- `references/freqtrade-develop/freqtrade/plugins/protections/cooldown_period.py`
- `references/freqtrade-develop/freqtrade/plugins/protections/stoploss_guard.py`
- `references/freqtrade-develop/freqtrade/plugins/protections/max_drawdown_protection.py`
- `references/freqtrade-develop/freqtrade/plugins/protections/low_profit_pairs.py`

Patterns extracted:

- Two-level locks: global lock and per-pair lock.
- Triggered safeguards based on recent realized outcomes (stoploss streak, drawdown, low pair profit).
- Lock reason + unlock horizon are first-class telemetry fields.

Mapping to our architecture:

- Add `ProtectionManager` equivalent in bot engine with runtime lock table.
- Connect to risk slider policy for default thresholds and cooldown durations.
- Surface active protections in UI status (not only generic blacklist entries).

### D) Exchange precision and min-trade handling (CCXT discipline)

Reference files:

- `references/freqtrade-develop/freqtrade/exchange/exchange.py`

Patterns extracted:

- Min/max stake derived from both `limits.cost` and `limits.amount`.
- Reserve-aware minimum stake math to avoid post-fee/stoploss edge-case rejects.
- Precision normalization (`amount_to_precision`, `price_to_precision`) before order submit.
- Exception taxonomy split into insufficient funds, invalid order, transient exchange, operational.

Mapping to our architecture:

- Keep our existing minNotional/step-size work, but extend to a stake-limit function that combines cost+amount constraints.
- Use uniform exception classes in execution layer to drive consistent skip/backoff decisions.

### E) Hyperopt and objective design patterns

Reference files:

- `references/freqtrade-develop/freqtrade/optimize/hyperopt/hyperopt.py`
- `references/freqtrade-develop/freqtrade/optimize/hyperopt/hyperopt_optimizer.py`
- `references/freqtrade-develop/freqtrade/optimize/hyperopt_loss/hyperopt_loss_multi_metric.py`
- `references/freqtrade-develop/freqtrade/optimize/hyperopt_loss/hyperopt_loss_profit_drawdown.py`

Patterns extracted:

- Offline optimizer run (not in live loop), with reproducible random state and parallel workers.
- Multi-metric loss design combining profit + drawdown + winrate + expectancy + trade-count penalty.
- Strict separation: optimize entry/exit thresholds, do not mutate feature definitions mid-run.

Mapping to our architecture:

- Add an offline “strategy calibration” job for shadow/backtest datasets.
- Promote only parameter sets that improve drawdown-adjusted metrics, not raw PnL only.

## Deep review update: `references/jesse-master` (Feb 12, 2026)

This section records reusable execution/risk patterns from `jesse-master` (MIT).

### A) Reduce-only exit discipline

Reference files:

- `references/jesse-master/jesse/services/broker.py`
- `references/jesse-master/tests/test_broker.py`
- `references/jesse-master/tests/test_spot_mode.py`

Patterns extracted:

- Exit orders are explicitly treated as `reduce_only` and validated against current open position state.
- Direction and order type are selected by current price relation (market/limit/stop) for position reduction.
- Invalid reductions are rejected early (no open position, invalid side/price context).

Mapping to our architecture:

- Keep conversion/sell paths from consuming fresh entry legs in the same short window.
- In `T-003`, add explicit reduce-only exit semantics for managed positions (instead of generic opposite-side market exits).

### B) Fee-aware balance/position accounting

Reference files:

- `references/jesse-master/tests/test_spot_mode.py`
- `references/jesse-master/jesse/strategies/TestBalanceAndFeeReductionWorksCorrectlyInSpotModeInBothBuyAndSellOrders/__init__.py`

Patterns extracted:

- Spot accounting tests validate base/quote balance updates after each partial fill.
- Fee impact is asserted directly in position quantity and quote balance evolution.
- Test coverage includes increase/reduce/close transitions and cancellation handling.

Mapping to our architecture:

- `T-007` should move from notional-only PnL to fee-aware realized/unrealized accounting.
- Add deterministic order-ledger tests for partial close flows and quantity rounding with fees.

### C) Position lifecycle hooks as anti-churn control points

Reference files:

- `references/jesse-master/tests/test_parent_strategy.py`
- `references/jesse-master/jesse/strategies/Test30/__init__.py`

Patterns extracted:

- Strategies separate entry signals from ongoing position management (`update_position` lifecycle).
- Exit adjustment can happen after entry, but is guarded by position state and executed quantities.

Mapping to our architecture:

- Use post-entry management windows (cooldown/hold-time) to avoid rapid buy/sell flip loops.
- This directly supports `T-003` adaptive exits and `T-004` wallet conversion policy.

## Recommended delivery order from this review

1. Implement risk protections (`T-024`) before deeper adaptive behavior changes.
2. Finish adaptive exits (`T-003`) with protection-manager signals integrated.
3. Implement universe filter chain (`T-023`) for broader, explainable candidate selection.
4. Implement adaptive confidence/model-health shadow layer (`T-025`).
5. Add offline calibration runner (`T-026`) after telemetry corpus is sufficient.
