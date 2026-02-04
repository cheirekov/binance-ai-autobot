# Security notes (early stage)

## Secrets storage

`config.json` contains secrets (Binance/OpenAI keys). It is:

- stored in `./data` (gitignored)
- mounted as a Docker volume

If you deploy beyond localhost, you must introduce encryption-at-rest and a proper secrets manager.

## UI authentication

The UI container enforces **HTTP Basic Auth** after onboarding is completed.

## API authentication

After onboarding, the API requires `x-api-key` for most endpoints.

The browser does **not** receive the API key:

- The UI server proxies `/api/*` and injects the API key server-side.

## Safe defaults

- Live trading is **off by default**.
- Any future “Live trading ON” toggle should include a confirmation step and a clear “paper vs live” banner in UI.
