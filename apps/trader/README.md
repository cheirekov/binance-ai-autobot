# Autobot V2 — executable dry-run prototype

Independent of the existing NestJS engine and its data. Freqtrade 2026.8 (digest pinned)
owns order execution and the trade database. Both versions use the same 1h breakout
strategy and deterministic exits. This is an unoptimized hypothesis, not a proven
profitable strategy. Constructor-level checks prohibit live trading.

- `AutobotBaseline`: EMA trend + prior 20-candle high breakout, fixed stake, stop-loss,
  trailing exit and cooldown protections.
- `AutobotAstra`: same entry signals, with real `gpt-6-astra` approval, reduced stake
  sizing and optional exits. Model I/O runs in a background worker; expired, missing
  or invalid plans deny new entries and never veto normal exits.
- Advisor calls are reserved in SQLite before sending, at most once per six hours,
  including across restarts. Default daily estimated API budget: $0.50. Failed calls
  with unknown usage retain their reservation. API rates are dated in the source;
  this is an application budget, not a provider-side billing cap.
- Data is public Binance **mainnet** market data; funds and orders are simulated
  locally. This prototype does not submit Binance testnet or real-money orders.
- Three fixed pairs: BTC/USDC, ETH/USDC, SOL/USDC; virtual wallet 1000 USDC,
  100 USDC per entry, maximum three positions. These are experiment settings.
  Both use an explicit 0.1% simulated fee per side, not a claim about your Binance tier.
- Context: trailing 48 hours in 4h blocks, trailing seven days in 24h blocks,
  current indicators, simulated wallet and positions, and up to 20 most recent
  closed trades (both wins and losses, shortened chronologically if input budget
  requires it). This is supplied memory, **not model training**. News/world events
  are explicitly unavailable. Missing, zero-volume, invalid, incomplete or stale
  hourly candles block new entries; exits remain independent. AI exits are tied
  to the specific position ID seen by the advisor.

From repository root:

```sh
mkdir -p data/trader-v2/baseline data/trader-v2/astra
export TRADER_API_PASSWORD='<generate a private value>'
export TRADER_API_JWT_SECRET='<generate a different value of at least 32 characters>'
export COMPOSE_PROJECT_NAME='autobot-v2'
export TRADER_UI_USER='<operator username>'
export TRADER_UI_PASSWORD_HASH='<bcrypt hash; never the plain password>'
docker compose -f apps/trader/compose.yml up -d baseline
# Set OPENAI_API_KEY securely in the shell before the paired experiment.
docker compose -f apps/trader/compose.yml --profile ai up -d
docker compose -f apps/trader/compose.yml logs --tail 40
docker compose -f apps/trader/compose.yml --profile ai down
```

Set `TRADER_UID` / `TRADER_GID` if the host user is not 1000:1000. The strategy
mount is read-only; each service has its own `data/trader-v2/*/trades.sqlite`.
The advisor stores input snapshots, validated plans, response IDs and costs in
`data/trader-v2/astra/advisor.sqlite`. No API credentials are stored there.
The V2 UI is then available on port `4174` by default. It talks to a small dashboard
adapter and Freqtrade's authenticated internal APIs; it does not start the legacy
NestJS engine. Baseline and Astra APIs have no host ports. UI controls can start,
pause entries, or stop each dry-run account, but cannot force trades or enable live
money. Set `TRADER_UI_PORT` to change the host port.
The port binds to `127.0.0.1` by default; use an SSH tunnel or a reviewed HTTPS
reverse proxy. Do not expose Basic authentication over plain public HTTP.

For a separate i2 worktree, reuse the existing OpenAI key and bcrypt UI login
without printing either value:

```sh
python apps/trader/install_env.py \
  --legacy-config /root/work/binance-ai-autobot/data/config.json \
  --output apps/trader/.env
cd apps/trader
docker-compose --profile ai up -d --build
```

The installer refuses to overwrite an existing file and creates it with mode 0600.

Tests (offline):

```sh
docker run --rm --network none -v "$PWD:/repo:ro" \
  -e PYTHONPATH=/repo/apps/trader/strategies --entrypoint python \
  freqtradeorg/freqtrade:2026.8 -m unittest discover -s /repo/apps/trader/tests -v
```

Download and test the baseline with the same strategy used in dry-run:

```sh
docker compose -f apps/trader/compose.yml run --rm baseline download-data \
  --config /freqtrade/config.json --timerange 20260101-20260912 --timeframes 1h
docker compose -f apps/trader/compose.yml run --rm baseline backtesting \
  --config /freqtrade/config.json --strategy AutobotBaseline \
  --timerange 20260118-20260912 --fee 0.001 --enable-protections --cache none
```

The initial 17 days provide indicator warmup. Backtests retain Freqtrade's OHLCV
fill assumptions; test higher costs and finer execution data before promotion.
Astra is deliberately prospective only: historical LLM calls can know subsequent
events. Its added value must be measured against the simultaneously running baseline,
including API charges, open-position PnL and drawdown, not just closed-trade profit.

## Historical handoff, 2026-09-12

Branch: `codex/trader-v2`. The remote legacy bot was only inspected, not changed.
For this desktop session the working SSH agent is:
`SSH_AUTH_SOCK=/run/user/1000/gnupg/S.gpg-agent.ssh ssh i2`.
Remote checkout: `/root/work/binance-ai-autobot`, commit `c207a95`, AI off,
SPOT_TESTNET, services up 12 days. Remote uses older Docker/Compose tooling.

A real one-shot Astra smoke test on public BTC candles succeeded; recorded API
cost $0.00739. It chose HOLD. Database: `data/trader-v2/astra/smoke/advisor.sqlite`.
This proves integration only. The smoke script has a separate $0.20 daily budget.

## Verified update, 2026-09-14

- Baseline backtest, Jan 18–Sep 12, unchanged strategy, 0.1% fee each side:
  111 trades, **−4.170 USDC / −0.42%**, profit factor 0.96, final 995.83 USDC.
  This does not establish a profitable edge. The seen period must not be treated
  as an untouched holdout when considering later changes.
- Freqtrade lookahead-analysis: no bias detected in 20 sampled signals. This is
  a scoped diagnostic, not proof of unbiased behavior in every circumstance.
- Public-data context smoke passed for BTC/USDC, ETH/USDC, SOL/USDC. One real
  Astra request using that context succeeded, cost **$0.04472**, all entries denied.
  No positions existed; this did not test profitable trading or position exits.
- Actual Freqtrade dry-run startup and restart passed against a separate
  `context-check.sqlite`; its advisor reached `budget_exhausted` with budget zero,
  without a paid request. Temporary check container stopped afterwards.
- Offline regression tests cover history/freshness, position-bound exits, invalid
  cached plans, API budgets, and closed/open accounting including fees once.
- The new dashboard adapter and React V2 page were exercised end-to-end against
  two running Freqtrade instances. Pause/start controls worked, the dashboard and
  baseline were restarted, and the UI recovered. No trade was created and the
  zero-budget Astra integration made no API request.
- Before retirement, the i2 legacy engine was rechecked: zero active orders and
  eleven testnet inventory positions (about 142 USDC FIL and 61 USDC NEAR were the
  material items; the rest was small residual inventory). Its trading engine was
  stopped through its API and verified `STOPPED`; no forced sales or state deletion.
  The legacy API/UI containers remain available temporarily as a rollback surface.

Context-only smoke (no paid requests, no orders):

```sh
docker run --rm -v "$PWD:/repo:ro" \
  -e PYTHONPATH=/repo/apps/trader/strategies --entrypoint python \
  freqtradeorg/freqtrade:2026.8 /repo/apps/trader/smoke.py
```

Read-only economic report for the two prospective accounts:

```sh
docker run --rm -v "$PWD:/repo:ro" --entrypoint python \
  freqtradeorg/freqtrade:2026.8 /repo/apps/trader/report.py \
  --data-dir /repo/data/trader-v2
```

It includes closed trades and open-position P&L marked at public Binance bids,
estimated exit fees, and API costs/reservations. `--usdc-usd 1` explicitly assumes
parity to combine USDC trading P&L with USD costs; without it they remain separate.
Pending orders withhold the combined net. Missing databases are `not_started`,
never a fabricated zero return. This is a CLI snapshot, not a dashboard or
drawdown series; marks are not guaranteed fills. Development, server and tax costs
are not included. The isolated smoke-call costs are not mixed into the prospective
account. The local prospective accounts were started only for integration testing
and stopped afterwards with zero trades. Remote V2 rollout remains a separate,
reviewed cutover.
