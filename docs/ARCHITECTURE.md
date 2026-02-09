# Architecture

## Containers

- **UI container** (`apps/ui`)
  - Serves the built React app.
  - Enforces **HTTP Basic Auth** after first-time setup.
  - Proxies `/api/*` to the API container and injects `x-api-key` server-side.
- **API container** (`apps/api`)
  - NestJS API.
  - Persists configuration + bot state + logs to the Docker volume.

## Data flow (high level)

1. First visit: UI is accessible without auth (no config exists yet).
2. User completes onboarding:
   - UI calls `POST /api/setup/basic`
   - API writes `config.json` to `DATA_DIR`
3. After config exists:
   - UI server starts requiring HTTP Basic Auth.
   - UI server injects `x-api-key` on all proxied requests.
   - API requires `x-api-key` for all endpoints except `/health` and `/setup/status`.

## Persistence (Docker volume)

Mounted path: `./data` on host → `/data` in containers.

- `config.json`: full settings including secrets (Binance/OpenAI).
- `state.json`: bot state + decisions + stub orders.
- `logs/api.log`: request + app logs from the API.

## Bot engine (current)

The bot engine is an early-stage engine to enable UI wiring + safe execution:

- `POST /bot/start` → phase: `EXAMINING` then `TRADING`
- In paper mode: periodically appends decisions and creates stub orders.
- In live mode (Spot testnet only by default): can place real Spot `MARKET` orders using CCXT (demo trading) with safety caps/cooldowns.

This is intentionally replaceable with a real strategy engine later.
