# Binance AI Autobot (monorepo)

This repository is the starting point for a **dockerized** automated Binance trading bot with:

- **API**: NestJS (`apps/api`)
- **UI**: Vite + React (`apps/ui`) served behind **HTTP Basic Auth** on port **4173**
- **Shared types/schemas**: (`packages/shared`)

> ⚠️ Important: This project is software engineering support — **not financial advice** and not a profit guarantee.

## Quick start (Docker)

1. Copy environment defaults:
   - `cp .env.example .env`
2. Start:
   - `docker compose up --build`
3. Open:
   - UI: `http://localhost:4173`

First run: the UI shows an onboarding wizard to create `./data/config.json`.
After setup: use `Settings` in the UI to adjust Basic/Advanced options.

## Dev (local)

- `pnpm install`
- `pnpm dev`

## Docs

- `docs/AI_CONTEXT.md`
- `docs/ARCHITECTURE.md`
- `docs/CONFIG.md`
- `docs/SECURITY.md`
- `docs/ROADMAP.md`
- `docs/CONVERSION.md`
