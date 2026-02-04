# Security notes (early stage)

## Secrets storage

`config.json` contains secrets (Binance/OpenAI keys). It is:

- stored in `./data` (gitignored)
- mounted as a Docker volume

If you deploy beyond localhost, you must introduce encryption-at-rest and a proper secrets manager.

### Binance key hygiene

- Create **separate API keys** for mainnet and testnet.
- Restrict permissions (start with read-only; enable trading only when you explicitly turn Live trading on).
- Restrict allowed IPs if possible (your server’s public IP).
- Rotate keys by generating a new key in Binance and updating it in UI → Settings → Advanced, then revoking the old key in Binance.

## UI authentication

The UI container enforces **HTTP Basic Auth** after onboarding is completed.

## API authentication

After onboarding, the API requires `x-api-key` for all endpoints (including `/health` by default).

The browser does **not** receive the API key:

- The UI server proxies `/api/*` and injects the API key server-side.

### Docker exposure

By default, `docker-compose.yml` binds the API port to `127.0.0.1` only (not public). To expose it publicly, set:

- `API_HOST_BIND=0.0.0.0`
- Optionally `API_PUBLIC_HEALTH=true` to allow unauthenticated `/health`

## Safe defaults

- Live trading is **off by default**.
- Any future “Live trading ON” toggle should include a confirmation step and a clear “paper vs live” banner in UI.
