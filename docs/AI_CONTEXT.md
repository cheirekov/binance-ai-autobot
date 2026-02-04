# AI Context (keep updated)

## Goal

Build a **fully-automated**, dockerized Binance trading bot with a simple onboarding-first UI.

This document exists so future GPT/Codex sessions can patch the codebase without re-reading everything.

## Current status (Feb 4, 2026)

Bootstrap scaffolding:

- Monorepo with pnpm workspaces
- `apps/api`: NestJS API (config/state persistence, bot skeleton)
- `apps/ui`: Vite+React UI + a small Node server (HTTP Basic Auth + `/api` proxy)
- `./data` mounted as a Docker volume (gitignored)
- `/config/*` endpoints for safe config reads/updates
- `/integrations/*` endpoints (Binance/OpenAI status)
- `/news/latest` endpoint (RSS aggregation + disk cache)

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

## API security model

- Before initialization: only `/setup/*` and `/health` are usable.
- After initialization: API requires `x-api-key` header.
- UI container proxies `/api/*` to the API and injects the API key server-side (browser never sees it).
- UI server enforces HTTP Basic Auth once the UI credentials exist in config.

## What’s intentionally stubbed

- Real Binance order placement (Spot/Grid/Futures)
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
