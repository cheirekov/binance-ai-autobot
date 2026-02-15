# Session Brief

Last updated: 2026-02-15 07:52 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `DAY (2-4h)`
- Active ticket: `T-027` (Spot limit/grid execution v1)
- Goal (single sentence): after a bot “brain reset”, open exchange orders must appear quickly in UI without global open-order fetch.
- In scope:
  - order discovery speed when `state.activeOrders` is empty but exchange has open orders,
  - symbol-scoped order-sync behavior and decision evidence,
  - UI visibility of open orders after restart/reset.
- Out of scope:
  - adaptive policy promotion from shadow to execution,
  - new wallet-policy features (`T-004`),
  - PnL reconciliation refactor (`T-007`).
- Hypothesis: scanning a small batch of hint symbols per tick will surface exchange open orders within ~20s of restart/reset (instead of ~100s worst-case).
- Target KPI delta:
  - time-to-first-discovered open order after restart: `<= 20s` when an order exists on a top-universe symbol.
- Stop/rollback condition:
  - order-sync causes transient exchange backoff repeatedly, or
  - no discovery event after `2 minutes` while a known open order exists on a scanned symbol.

## 2) Definition of Done (must be concrete)

- API behavior:
  - after deleting `data/state.json` and restarting, engine resyncs exchange open orders without needing a global open-order fetch.
- UI behavior:
  - Dashboard `Orders (active)` becomes non-empty shortly after start when there are exchange open orders.
- Runtime evidence in decisions/logs:
  - decision stream includes an `ENGINE` event like `Synced <n> existing open order(s) (discovery scan: <k> symbol(s))`.
- Risk slider impact (`none` or explicit low/mid/high behavior):
  - Risk impact: none (order discovery mechanics only).
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
  - additional targeted command(s):
    - `docker logs --tail 500 binance-ai-autobot_api_1` (confirm discovery event + no backoff spam)
- Runtime validation plan:
  - run duration: `30-60 minutes` (plus quick restart/reset checks)
  - expected bundle name pattern: `autobot-feedback-YYYYMMDD-HHMMSS.tgz`

## 3) Deployment handoff

- Commit hash: `<set-after-commit>`
- Deploy target: remote Binance Spot testnet runtime
- Required config changes:
  - `tradeMode=SPOT_GRID`
  - `liveTrading=true`
  - testnet endpoint and keys configured
- Operator checklist:
  - reset state needed? (`no` for this active night run unless explicitly testing cold start)
  - keep config.json? (`yes`)
  - start command: `docker compose up -d --build --force-recreate`

## 4) End-of-batch result (fill after run)

- Observed KPI delta:
- Decision: `<continue|rollback|pivot>`
- Next ticket candidate: `<pick after run>`
- Open risks:
  - `<fill>`
- Notes for next session:
  - bundle: `<bundle-id>`
  - auto-updated at: `<timestamp>`

## 5) Copy/paste prompt for next session

```text
Ticket: T-027
Batch: DAY (2-4h)
Goal: After a brain reset, discover exchange open orders quickly (symbol-scoped; no global fetch).
In scope: order-sync discovery scan, UI visibility of active orders after restart/reset.
Out of scope: adaptive policy promotion, wallet policy expansion, PnL refactor.
DoD:
- API: engine resyncs exchange open orders after `data/state.json` reset without global open-order fetch.
- UI: active orders appear shortly after start when exchange has open orders.
- Runtime evidence: decisions include `Synced <n> existing open order(s) (discovery scan: <k> symbol(s))`.
- Risk slider mapping: Risk impact: none.
- CI/test command: `docker compose -f docker-compose.ci.yml run --rm ci`.
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
