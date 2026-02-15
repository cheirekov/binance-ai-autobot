# Session Brief

Last updated: 2026-02-15 18:21 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `NIGHT (8-12h)`
- Active ticket: `T-029` (Wallet policy v2: unmanaged holdings + dust cleanup)
- Goal (single sentence): in bear-ish conditions, avoid accumulating an unmanaged “bag” by sweeping small non-strategy holdings back to home stable and by not over-protecting assets the bot isn’t actually trading.
- In scope:
  - wallet sweep improvements:
    - cap sweep minimum for large wallets (keep 10–20 USDC “dust band” sweepable),
    - protect only assets referenced by open orders/managed positions (avoid “protect top universe assets” behavior),
    - emit `wallet-sweep` trades with `details.category=dust|stale`.
- Out of scope:
  - “sell everything to USDC” liquidation mode (needs an explicit exposure-cap policy),
  - adaptive/AI policy promotion from shadow to execution,
  - PnL reconciliation refactor (`T-007`).
- Hypothesis: cleaning the 10–20 USDC dust band and avoiding over-protecting non-traded assets will reduce long-lived wallet clutter and reduce unmanaged bear-market downside.
- Target KPI delta:
  - fewer non-strategy “dust band” holdings remaining after the run,
  - occasional `wallet-sweep` trades with `details.category=dust`,
  - no conversion flood (must remain rate-limited by existing cooldowns).
- Stop/rollback condition:
  - repeated wallet-sweep attempts on the same asset (conversion churn), or
  - sweeping interferes with assets used by open orders/managed positions.

## 2) Definition of Done (must be concrete)

- API behavior:
  - Wallet sweep can convert medium dust (≈10–20 USDC value) on large wallets (sweep min is capped).
  - Wallet sweep protects only assets referenced by current open orders and managed positions (not “top universe” assets by default).
- Runtime evidence in decisions/logs:
  - `TRADE ... wallet-sweep ... details.category=dust|stale` appears (rate-limited).
- Risk slider impact (`none` or explicit low/mid/high behavior):
  - High risk uses a lower sweep-cap multiplier → more aggressive dust cleanup.
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
  - additional targeted command(s):
    - `docker logs --tail 500 binance-ai-autobot_api_1` (wallet sweep behavior)
- Runtime validation plan:
  - run duration: `8-12 hours`
  - expected bundle name pattern: `autobot-feedback-YYYYMMDD-HHMMSS.tgz`

## 3) Deployment handoff

- Commit hash: `<set-after-commit>`
- Deploy target: remote Binance Spot testnet runtime
- Required config changes:
  - `tradeMode=SPOT_GRID`
  - `liveTrading=true`
  - testnet endpoint and keys configured
- Operator checklist:
  - reset state needed? (`optional` — recommended to reset `data/state.json` for clean overnight evidence)
  - keep config.json? (`yes`)
  - start command:
    - Compose v2: `docker compose up -d --build --force-recreate`
    - Compose v1: `docker-compose up -d --build --force-recreate`
  - collect bundle:
    - `./scripts/collect-feedback.sh` (auto-detects compose; override via `AUTOBOT_COMPOSE_CMD=docker-compose`)

## 4) End-of-batch result (fill after run)

- Observed KPI delta: `<fill after night run>`
- Decision: `<continue|pivot>`
- Next ticket candidate: `<T-005|T-007|T-023>`
- Open risks: `<fill>`
- Notes for next session:
  - bundle: `<fill>`
  - manual notes: `<fill>`

## 5) Copy/paste prompt for next session

```text
Ticket: T-029
Batch: NIGHT (8-12h)
Goal: Reduce unmanaged “bag holding” by sweeping dust/medium-dust back to home stable and by not protecting non-traded assets by default.
In scope: wallet sweep dust band + capped sweep minimum + protect only open-order/managed assets; include `details.category=dust|stale` in sweep trades.
Out of scope: full liquidation exposure-cap policy; adaptive/AI promotion; PnL refactor.
DoD:
- API: wallet sweep converts 10–20 USDC “dust band” occasionally (rate-limited) and avoids sweeping assets referenced by open orders/managed positions.
- Runtime: see `wallet-sweep` trades with `details.category=dust|stale`; fewer lingering 10–20 USDC holdings after the run.
- Risk slider mapping: high risk is more aggressive (lower sweep cap).
- CI/test command: `docker compose -f docker-compose.ci.yml run --rm ci`.
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
