# Session Brief

Last updated: 2026-02-25 14:50 UTC  
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-007` (PnL correctness + exposure reporting)
- Goal (single sentence): make runtime PnL/exposure outputs commission-aware and restart-stable.
- In scope:
  - normalize commission extraction from exchange fill payloads.
  - convert commission into home quote (`USDC`) when possible.
  - include fees in realized/net PnL telemetry and summaries.
  - keep PnL totals stable across restart/state reload.
- Out of scope:
  - strategy/risk behavior rewrites (`T-030`, `T-031`, `T-032`),
  - AI lane/promotion work (`T-025+`),
  - endpoint/auth/UI redesign.
- Hypothesis: current negative/opaque totals are partially due to fees being fixed to zero in telemetry.
- Target KPI delta:
  - `last_run_summary.pnl.fees_usdt` becomes non-zero when commissions are present.
  - `net_usdt` reflects realized/unrealized minus fees.
  - baseline stats and summary remain deterministic after restart.
- Stop/rollback condition:
  - if computed PnL diverges sharply from previous baseline without fee-related explanation.

## 2) Definition of Done (must be concrete)

- API behavior:
  - commissions are captured per fill/trade event when available.
  - PnL export path computes `fees_usdt`, `realized_usdt`, `net_usdt` consistently.
- Runtime evidence in decisions/logs:
  - no guardrail regression from `T-005` (no managed-symbol CAUTION deadlock loops).
  - PnL summary fields no longer hardcode `fees_usdt=0` when fee data exists.
- Risk slider impact:
  - none (reporting/ledger math only).
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
- Runtime validation plan:
  - run duration: `1-3 hours`
  - expected bundle name pattern: `autobot-feedback-YYYYMMDD-HHMMSS.tgz`

## 3) Deployment handoff

- Commit hash: `<set-after-commit>`
- Deploy target: remote Binance Spot testnet runtime
- Required config changes: none
- Operator checklist:
  - reset state needed? (`no`)
  - keep config.json? (`yes`)
  - start command:
    - Compose v2: `docker compose up -d --build --force-recreate`
    - Compose v1: `docker-compose up -d --build --force-recreate`
  - collect bundle:
    - `./scripts/collect-feedback.sh` (override compose command via `AUTOBOT_COMPOSE_CMD=docker-compose` when needed)

## 4) End-of-batch result (latest reference run)

- Observed KPI delta (`autobot-feedback-20260225-130706.tgz`):
  - fee telemetry is now populated in runtime summary:
    - `pnl.fees_usdt=2.48637116`,
    - `pnl.net_usdt=-82.09507722` (fee-adjusted).
  - baseline KPIs include fee totals and per-symbol fee allocation (`totals.feesHome`, `symbols[].feesHome`).
  - guardrail behavior remains stable (`risk_state=NORMAL` at end, no managed-symbol deadlock pattern).
  - UI patch added PnL scope clarification + visible fees pill to align operator understanding with telemetry semantics.
- Decision: `continue`
- Open risks:
  - fee visibility still depends on exchange `fills` availability (legacy/externally imported orders may have partial fee coverage).

## 5) Copy/paste prompt for next session

```text
Ticket: T-007
Batch: SHORT (1-3h)
Goal: implement commission-aware PnL summary and restart-stable exposure accounting without changing strategy behavior.
In scope: commission extraction, fee normalization to USDC, net PnL math in telemetry, deterministic totals after restart.
Out of scope: strategy rewrites, AI lane, multi-quote policy changes.
DoD:
- fees_usdt populated when exchange fee data exists.
- net_usdt reflects realized/unrealized minus fees.
- T-005 behavior remains stable (no CAUTION deadlock regression).
- docker CI passes: `docker compose -f docker-compose.ci.yml run --rm ci`.
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
