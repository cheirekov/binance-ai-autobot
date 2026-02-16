# Session Brief

Last updated: 2026-02-16 11:15 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `DAY (2-4h)`
- Active ticket: `T-029` (Wallet policy v2: unmanaged exposure control)
- Goal (single sentence): reduce idle bag-holding by forcing wallet-sweep rebalance when unmanaged non-home exposure exceeds a risk-linked cap.
- In scope:
  - unmanaged non-home exposure valuation during wallet policy path.
  - risk-linked unmanaged exposure cap and rebalance trigger.
  - telemetry details in wallet-sweep trade events.
- Out of scope:
  - full liquidation of protected assets used by active orders/managed positions.
  - adaptive/AI promotion from shadow to execution,
  - PnL reconciliation refactor (`T-007`).
- Hypothesis: weak-trend-only sweep gating leaves too many unmanaged holdings untouched; exposure-cap trigger will make cleanup adaptive and less passive.
- Target KPI delta:
  - appearance of `wallet-sweep ... category=rebalance` trades when unmanaged exposure is high.
  - gradual reduction of unmanaged non-home holdings value over runtime.
- Stop/rollback condition:
  - if sweep becomes over-aggressive and starves normal grid inventory behavior.

## 2) Definition of Done (must be concrete)

- API behavior:
  - Wallet policy computes unmanaged non-home exposure and compares it to a risk-linked cap.
  - If over cap, sweep can rebalance unmanaged assets even without weak-trend signal.
  - Sweep telemetry includes unmanaged exposure metrics.
- Runtime evidence in decisions/logs:
  - observe at least one `wallet-sweep` trade with `category=rebalance` when exposure is over cap.
- Risk slider impact (`none` or explicit low/mid/high behavior):
  - unmanaged exposure cap scales from strict (low risk) to loose (high risk).
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
  - unmanaged exposure rebalance trigger: `implemented`
- Decision: `continue`
- Next ticket candidate: `T-029` (UI visibility for unmanaged exposure cap)
- Open risks:
  - rebalance mode depends on tradable conversion routes for unmanaged assets.
- Notes for next session:
  - request 2–4h bundle after deploy with mixed holdings.
  - imported/manual policy: synced and treated as ladder when enabled; not auto-canceled by current policy.
  - ownership continuity hardening added: legacy/default prefix and signature-based bot order recognition after reset.

## 5) Copy/paste prompt for next session

```text
Ticket: T-029
Batch: DAY (2-4h)
Goal: Trigger adaptive wallet rebalance when unmanaged non-home exposure exceeds a risk-linked cap.
In scope: unmanaged exposure valuation + cap trigger + sweep telemetry details.
Out of scope: forced liquidation of protected/in-strategy assets; adaptive/AI promotion; PnL refactor.
DoD:
- API: wallet policy can select `category=rebalance` sweep sources when over cap.
- Runtime: `wallet-sweep` trade details include unmanaged exposure values.
- Risk slider mapping: cap widens at high risk and tightens at low risk.
- CI/test command: `docker compose -f docker-compose.ci.yml run --rm ci`.
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
