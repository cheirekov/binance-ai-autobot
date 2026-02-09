# Reference Codebase Analysis (local `references/`)

This repo now contains several third‑party codebases under `references/` for **local study only**. The goal is to extract proven design patterns (exchange connectivity, market rules, backtesting/paper vs live separation, risk controls) without blindly copying code.

> Note: This document is engineering analysis, not financial advice.

## What’s in `references/`

| Folder | What it is | Language | License (as found locally) | Can we copy code into this repo? |
|---|---|---:|---|---|
| `references/freqtrade-stable` | Freqtrade trading bot framework | Python | **GPLv3** (`LICENSE`) | **No** (unless this repo becomes GPLv3‑compatible) |
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
