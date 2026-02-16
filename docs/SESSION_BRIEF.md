# Session Brief

Last updated: 2026-02-16 09:55 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `DAY (2-4h)`
- Active ticket: `T-029` (Wallet policy v2: unmanaged holdings + dust cleanup)
- Goal (single sentence): suppress insufficient-balance reject storms by validating funds right before submit and logging precise stage-level reject context.
- In scope:
  - pre-submit feasibility checks before live submits for:
    - `position-exit-market-sell`,
    - `grid-buy-limit`,
    - `grid-sell-limit`,
    - `entry-market-buy`,
    - conversion-router market legs.
  - stage-aware reject messages and insufficient-balance escalation controls.
- Out of scope:
  - full non-home exposure cap/liquidation policy (`T-029` next slice),
  - adaptive/AI promotion from shadow to execution,
  - PnL reconciliation refactor (`T-007`).
- Hypothesis: most overnight reject bursts are caused by stale/optimistic balance assumptions at submit time; fresh pre-checks plus cooldown escalation will reduce rejects and improve tick quality.
- Target KPI delta:
  - lower count/share of `Order rejected ... insufficient balance`,
  - appearance of `Skip ... pre-check insufficient ...` with stage and required/free details,
  - fewer multi-symbol reject bursts in short windows.
- Stop/rollback condition:
  - if pre-check logic blocks valid orders excessively (trade starvation), or
  - if conversion path regresses (no conversion despite clear reserve shortfall).

## 2) Definition of Done (must be concrete)

- API behavior:
  - Orders are not submitted when fresh balance check shows insufficient funds.
  - Reject summaries include operation stage (`grid-buy-limit`, `grid-sell-limit`, `position-exit-market-sell`, etc.).
  - Repeated insufficient-balance rejects produce longer cooldown/blacklist durations.
- Runtime evidence in decisions/logs:
  - reduced `Order rejected ... insufficient balance` frequency vs previous run,
  - explicit `pre-check insufficient` skip decisions visible.
- Risk slider impact (`none` or explicit low/mid/high behavior):
  - High risk keeps shorter base cooldown, but repeated insufficient-balance rejects still escalate lock durations.
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
  - additional targeted command(s):
    - `docker logs --tail 500 binance-ai-autobot_api_1` (stage reject diagnostics)
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
-  - pending runtime validation (`2-4h` run not collected yet)
- Decision: `pending`
- Next ticket candidate: `T-029` next slice (non-home exposure cap) or `T-007` (if reject storm is resolved)
- Open risks:
  - pre-check guard may reduce valid trade rate if thresholds are too strict.
- Notes for next session:
  - collect next bundle after this patch deploy: `autobot-feedback-YYYYMMDD-HHMMSS.tgz`

## 5) Copy/paste prompt for next session

```text
Ticket: T-029
Batch: DAY (2-4h)
Goal: Reduce insufficient-balance reject storms with pre-submit fund checks and stage-aware diagnostics.
In scope: pre-checks before live submit (`position-exit-market-sell`, `grid-buy-limit`, `grid-sell-limit`, `entry-market-buy`, conversion legs) + cooldown/blacklist escalation for repeated insufficient-balance rejects.
Out of scope: full liquidation exposure-cap policy; adaptive/AI promotion; PnL refactor.
DoD:
- API: no submit when fresh free balance is insufficient; catch-path includes operation stage in reject summary.
- Runtime: fewer `Order rejected ... insufficient balance`; more `pre-check insufficient` skips with stage details.
- Risk slider mapping: base cooldown remains risk-linked; repeated insufficient rejects escalate duration.
- CI/test command: `docker compose -f docker-compose.ci.yml run --rm ci`.
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
