# Configuration

## Where config is stored

Config is persisted to the Docker volume under `DATA_DIR`:

- `DATA_DIR/config.json`

Default:

- local (non-Docker): `./data/config.json`
- Docker: `/data/config.json`

## Basic onboarding inputs (current)

- Binance API key + secret
- OpenAI API key (required only if `aiEnabled=true`)
- UI Basic Auth username + password
- Trader region profile (`EEA` / `NON_EEA`) — **defaults only**
- Home stable coin (defaulted from region if omitted)
- Trading mode (`SPOT` / `SPOT_GRID`)
- Risk slider (0–100) → affects derived defaults
- Live trading (on/off)
- AI engine (on/off)
- AI min trade confidence (default: `65%`)

## Advanced inputs (current)

- Never-trade symbols list (hard block)
- Auto-blacklist toggle + TTL minutes (temporary cooldown blacklist)
- API base URL override (optional; used by UI proxy when set)
- API key rotation (auto-generated on setup; can be rotated from UI)
- API/UI host + port (informational today; container ports are still controlled by Docker/env)
- Binance environment (Mainnet / Spot testnet) + optional base URL override

## Derived defaults

Derived defaults are computed from the risk level to keep Basic onboarding minimal.
These values are **placeholders** and will be replaced with an audited strategy policy.

Current derived fields include:

- `maxOpenPositions`
- `maxPositionPct`
- `allowSpot`, `allowGrid`, `allowFutures`
