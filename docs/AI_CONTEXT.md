# AI Context (keep updated)

## Goal

Build a **fully-automated**, dockerized Binance trading bot with a simple onboarding-first UI.

This document exists so future GPT/Codex sessions can patch the codebase without re-reading everything.

## Session memory controls (mandatory)

To prevent focus loss and repeated loops across sessions:

- `docs/TEAM_OPERATING_RULES.md` defines non-negotiable process rules.
- `docs/DELIVERY_BOARD.md` is the single source of truth for active tickets.
- `docs/PM_BA_CHANGELOG.md` records each patch batch with BA/PM/risk mapping.

Any patch is incomplete unless board + changelog are updated.

## Current status (Feb 11, 2026)

Bootstrap scaffolding:

- Monorepo with pnpm workspaces
- `apps/api`: NestJS API (config/state persistence, bot skeleton)
- `apps/ui`: Vite+React UI + a small Node server (HTTP Basic Auth + `/api` proxy)
- `./data` mounted as a Docker volume (gitignored)
- `/config/*` endpoints for safe config reads/updates
- `/integrations/*` endpoints (Binance/OpenAI status)
- `/news/latest` endpoint (RSS aggregation + disk cache)
- Spot **testnet** live execution (minimal): the bot can place Spot `MARKET` orders when `liveTrading=true` and Advanced → Binance environment is `SPOT_TESTNET` (mainnet is blocked by default).
- Live Spot execution uses **CCXT** (Binance demo trading mode) for balances + order placement; market data/limits are still fetched via direct REST (`BinanceClient`) for now.
- Two-track mode:
  - Baseline live execution remains deterministic.
  - Adaptive policy runs in shadow mode (regime/strategy recommendations logged, no execution control yet).
- Baseline KPI and adaptive shadow telemetry are persisted in `data/telemetry/`.

## Local references (for study)

This repo contains third‑party codebases under `references/` to study established patterns (exchange adapters, sizing, risk controls, backtesting).

- Summary + license notes: `docs/REFERENCES_ANALYSIS.md`
- Important: **do not copy** GPLv3 code from `references/freqtrade-stable` into this repo unless we intentionally adopt GPLv3.

## Hard rules (product)

- Full automation capability (bot engine runs continuously once configured)
- Professional-grade logging and debuggability (persisted logs)
- Fees/taxes must be modeled (no “magic profits”)
- “No hallucination”: never claim Binance regulations/availability without a verifiable source

## Persistence

All runtime state lives under `DATA_DIR` (default: `./data` locally, `/data` in Docker):

- `config.json` (settings + secrets; gitignored)
- `state.json` (bot state + decisions + stub orders; gitignored)
- `logs/` (API logs; gitignored)
- `telemetry/baseline-kpis.json` (baseline run metrics; gitignored)
- `telemetry/adaptive-shadow.jsonl` (shadow policy events; gitignored)

## Spot market-order note

- On Spot testnet/mainnet, the current engine uses `MARKET` orders that typically fill immediately.
- Because of this, `activeOrders` can stay at `0` while `orderHistory` increases in UI and Binance history.

## API security model

- Before initialization: only `/setup/*` and `/health` are usable.
- After initialization: API requires `x-api-key` header.
- UI container proxies `/api/*` to the API and injects the API key server-side (browser never sees it).
- UI server enforces HTTP Basic Auth once the UI credentials exist in config.

## What’s intentionally stubbed

- Grid/Futures live execution
- Spot live execution beyond the current minimal `MARKET` order path (order lifecycle polling, cancels, sells, etc.)
- Market data ingestion + indicators (RSI/ADX/etc) and strategy selection
- Tax jurisdiction modeling (region-based rules must be verified)
- OpenAI-driven decision loop (behind `aiEnabled`)
- News → strategy/AI usage (feeds are ingested, but not yet used for trading)

## Confirmed requirements (from user)

- Region profile: **EEA**
- MVP scope: **Spot + Grid**
- Live trading: requires explicit confirmation
- Starting capital: ~**$800** equivalent in mixed assets (including EUR)
- Taxes: out of MVP scope for now
