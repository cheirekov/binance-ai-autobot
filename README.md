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

## Support bundle (safe to share)

If you run the bot on a remote server and want to share debug info **without secrets**:

- `bash scripts/collect-feedback.sh`

This writes `autobot-feedback-*.tgz` containing state/universe/news/logs plus a redacted config (it does **not** include `data/config.json`).

## Docs

- `docs/AI_CONTEXT.md`
- `docs/ARCHITECTURE.md`
- `docs/CONFIG.md`
- `docs/SECURITY.md`
- `docs/ROADMAP.md`
- `docs/CONVERSION.md`
- `docs/TEAM_OPERATING_RULES.md`
- `docs/DELIVERY_BOARD.md`
- `docs/PM_BA_CHANGELOG.md`
