# Session Brief

Last updated: 2026-02-16 10:02 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `HOTFIX`
- Active ticket: `T-027` (open-order sync reliability)
- Goal (single sentence): ensure exchange open orders are discovered even when bot already has active tracked orders, so UI/state does not miss “yesterday” orders.
- In scope:
  - periodic supplemental open-order discovery (hinted symbols) while active orders exist.
  - decision visibility for newly discovered open orders.
  - regression test for missing external order scenario.
- Out of scope:
  - full non-home exposure cap/liquidation policy (`T-029` next slice),
  - adaptive/AI promotion from shadow to execution,
  - PnL reconciliation refactor (`T-007`).
- Hypothesis: current sync logic misses older open orders because discovery-only mode runs when `activeOrders` is empty; periodic supplemental discovery closes this gap.
- Target KPI delta:
  - fewer operator reports of “order visible on Binance but missing in bot UI”,
  - appearance of `Discovered N additional open order(s) during periodic scan` decisions,
  - active-order parity after reset/restart within 1–3 minutes.
- Stop/rollback condition:
  - if periodic discovery introduces order-sync instability/timeouts.

## 2) Definition of Done (must be concrete)

- API behavior:
  - Sync scans active symbols every tick and hinted symbols periodically even when active orders are non-empty.
  - Newly discovered open orders are merged into `state.activeOrders`.
  - A discovery decision is logged when periodic scan finds additional orders.
- Runtime evidence in decisions/logs:
  - at least one periodic discovery decision for delayed/open external order scenarios.
- Risk slider impact (`none` or explicit low/mid/high behavior):
  - none.
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
  - additional targeted command(s): none.
- Runtime validation plan:
  - run duration: `2-4 hours`
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

- Observed KPI delta:
  - CI status: `green`
  - supplemental discovery path: `implemented + tested`
- Decision: `continue`
- Next ticket candidate: `T-029` (non-home exposure cap + unmanaged holdings visibility)
- Open risks:
  - symbols outside hint set can still be delayed until hinted/scanned.
- Notes for next session:
  - bundle: `autobot-feedback-20260216-094713.tgz`
  - user-reported issue: one prior open order visible on exchange but not in UI, despite `manageExternalOpenOrders=true`.

## 5) Copy/paste prompt for next session

```text
Ticket: T-027
Batch: HOTFIX
Goal: Keep open-order sync accurate when active orders already exist.
In scope: periodic supplemental hint-symbol discovery in `syncLiveOrders`; decision visibility; regression test.
Out of scope: wallet liquidation policy, adaptive/AI promotion, PnL refactor.
DoD:
- API: previously missing open orders become discoverable without clearing `state.activeOrders`.
- Runtime: periodic discovery decision appears when additional open orders are found.
- Risk slider mapping: none.
- CI/test command: `docker compose -f docker-compose.ci.yml run --rm ci`.
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
