# Session Brief

Last updated: 2026-02-21 15:09 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `DAY (1-3h)`
- Active ticket: `T-005` (Daily guardrails + unwind-only behavior)
- Goal (single sentence): validate daily-loss HALT de-risking behavior and trigger-aware guard telemetry without relaxing guardrails.
- In scope:
  - compute rolling 24h realized PnL guard threshold from risk slider.
  - block new entry/grid placement when guard is active.
  - keep position-exit and wallet-sweep paths available before guard return.
  - add post-stop-loss symbol re-entry cooldown (risk-linked) to reduce churn.
  - persist canonical runtime risk state (`NORMAL/CAUTION/HALT`) into bot state and show it in UI.
  - detect and guard against large realized-profit giveback within the same rolling window.
  - tighten high-risk absolute-loss + giveback thresholds to reduce late guard activation.
  - ensure active global locks are reflected in runtime `riskState` (no `NORMAL` while lock is active).
  - execute controlled partial unwinds while `STOPLOSS_GUARD`/`MAX_DRAWDOWN` is active.
  - execute controlled partial unwinds during daily-loss `HALT` (`daily-loss-halt-unwind`) to reduce exposure during prolonged guard windows.
  - emit trigger-aware daily-loss skip summary text (`PROFIT_GIVEBACK` vs `ABS_DAILY_LOSS`).
  - normalize adaptive telemetry labels so UI does not show `UNKNOWN` for regime/decision kind.
- Out of scope:
  - full ledger/commission reconciliation (`T-007`),
  - regime strategy rewrite (`T-031/T-032`),
  - PnL reconciliation refactor (`T-007`).
- Hypothesis: most current losses are entry churn after stop-loss and weak trend continuation; daily guard + post-stop-loss cooldown reduces that bleed without freezing exits.
- Target KPI delta:
  - when rolling realized loss breaches guard, decisions show `Daily loss guard active` and no new entries are placed.
  - stop-loss -> immediate re-entry loops per symbol drop.
  - dashboard status shows runtime risk state + reason codes directly from engine state.
  - reduce repeated `Grid guard active (no inventory to sell)` skips for the same symbol.
  - guard reason includes `trigger=PROFIT_GIVEBACK` when profits are materially given back.
  - high-risk profile reaches `CAUTION/HALT` earlier on renewed drawdown/giveback.
  - runtime risk state mirrors active global lock state in UI/telemetry.
  - under active global lock, inventory begins reducing (`global-lock-unwind`) instead of full freeze.
- Stop/rollback condition:
  - if guard blocks all trading actions including exits/sweeps.

## 2) Definition of Done (must be concrete)

- API behavior:
  - Daily-loss guard computes rolling 24h realized loss vs risk-linked threshold.
  - When triggered, bot skips new exposure actions and records guard details in decision telemetry.
  - Entry guard applies additional post-stop-loss symbol cooldown.
- Runtime evidence in decisions/logs:
  - `Skip: Daily loss guard active (...)` appears with threshold details when tripped.
  - fewer same-symbol BUY entries immediately after `stop-loss-exit`.
  - `state.riskState` updates to `CAUTION/HALT` in runtime snapshots when guard thresholds are crossed.
  - guard details include `trigger` (`ABS_DAILY_LOSS` vs `PROFIT_GIVEBACK`) and giveback metrics.
  - with active `STOPLOSS_GUARD` or `MAX_DRAWDOWN` global lock, `state.riskState.state` is not `NORMAL`.
  - lock window contains `global-lock-unwind` trade decisions for eligible managed positions.
- Risk slider impact (`none` or explicit low/mid/high behavior):
  - max daily loss threshold scales from strict (low risk) to loose (high risk).
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
- Runtime validation plan:
  - run duration: `1-3 hours`
  - expected bundle name pattern: `autobot-feedback-YYYYMMDD-HHMMSS.tgz`

## 3) Deployment handoff

- Commit hash: `<set-after-commit>`
- Deploy target: remote Binance Spot testnet runtime
- Required config changes:
  - `tradeMode=SPOT_GRID`
  - `liveTrading=true`
  - testnet endpoint and keys configured
- Operator checklist:
  - reset state needed? (`no` — keep rolling `data/state.json` so daily-loss guard windows remain valid)
  - keep config.json? (`yes`)
  - start command:
    - Compose v2: `docker compose up -d --build --force-recreate`
    - Compose v1: `docker-compose up -d --build --force-recreate`
  - collect bundle:
    - `./scripts/collect-feedback.sh` (auto-detects compose; override via `AUTOBOT_COMPOSE_CMD=docker-compose`)

## 4) End-of-batch result (fill after run)

- Observed KPI delta:
  - runtime remained active with realized PnL positive in bundle (`+6.42 USDC`) and risk state returned to `NORMAL`.
  - caution gating was visible (`new symbols paused` / `paused MARKET entry`) instead of uncontrolled re-entry.
  - adaptive tail still had legacy `UNKNOWN` labels; display/API normalization added in this patch.
- Decision: `continue`
- Next ticket candidate: `T-005` (continue active lane unless PM/BA reprioritizes)
- Open risks:
  - exposure concentration remains high on top 2 symbols; de-concentration policy remains the next tuning lane.
- Notes for next session:
  - bundle: `autobot-feedback-20260221-145317.tgz`
  - auto-updated at: `2026-02-21T15:09:00.000Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-005
Batch: DAY (1-3h)
Goal: validate daily-loss HALT de-risking and clean telemetry labels (no UNKNOWN in UI).
In scope: rolling daily-loss guard check, trigger-aware guard skip telemetry, post-stop-loss symbol re-entry cooldown, CAUTION entry pauses, no-inventory grid cooldown tuning, tightened giveback thresholds, lock-state consistency, global-lock unwind-only execution, daily-loss-halt unwind execution, adaptive telemetry label normalization.
Out of scope: strategy rewrite, multi-quote routing, commission ledger refactor.
DoD:
- API: daily-loss guard computes and enforces risk-linked max daily loss.
- Runtime: CAUTION state pauses new exposure (`new symbols paused`, `paused GRID BUY leg`, `paused MARKET entry`) and records clear skip details.
- Runtime: symbol post-stop-loss re-entry cooldown is observed.
- Runtime: repeated `Grid guard active (no inventory to sell)` for the same symbol drops versus prior run.
- Runtime: guard switches to `trigger=PROFIT_GIVEBACK` earlier on profit retrace events.
- Runtime: active global `STOPLOSS_GUARD`/`MAX_DRAWDOWN` lock maps to non-`NORMAL` risk state.
- Runtime: active global lock performs controlled `global-lock-unwind` sells when inventory is available.
- Runtime: daily-loss HALT performs controlled `daily-loss-halt-unwind` sells when inventory is available.
- Risk slider mapping: max daily loss threshold widens at high risk and tightens at low risk.
- CI/test command: `docker compose -f docker-compose.ci.yml run --rm ci`.
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
