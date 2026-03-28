# Session Brief

Last updated: 2026-03-28 08:44 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-032` (Exit manager v2)
- Goal (single sentence): review the fresh March 28 bundle and decide whether `T-032` should pivot, because the previous same-ticket patch deployed and the remaining repeat now looks like an `ABS_DAILY_LOSS` caution policy question rather than another safe runtime micro-fix.
- In scope:
  - confirm the deployed `5927bd9` build closed the previous defensive cancel-churn hypothesis.
  - classify the remaining `ABS_DAILY_LOSS` caution global new-symbol pause at low exposure.
  - add the required triage note and explicit next-lane recommendation.
  - preserve `T-034` funding stability and all closed guardrail tickets.
- Out of scope:
  - another blind runtime patch on `T-032`,
  - quote-routing redesign (`T-034` is closed unless runtime regresses),
  - AI lane/promotion work (`T-025+`),
  - PnL schema/reporting rewrites (`T-007` is closed),
  - endpoint/auth/UI redesign.
- Hypothesis: the latest bundle proves the previous `T-032` patch deployed and removed the old churn signature. The remaining repeat is likely a PM/BA scope question about daily-loss caution re-entry / healthy-idle policy, so the correct next move is pivot review, not another same-ticket patch.
- Target KPI delta:
  - produce an explicit next-lane decision before more code lands.
  - preserve `T-034` funding behavior and all closed-ticket guardrails.
  - avoid another drift cycle on `T-032` without a new bounded hypothesis.
- Stop/rollback condition:
  - if fresh evidence proves a current `P0/P1` runtime incident, stop the pivot review and open the correct incident batch instead.

## 2) Definition of Done (must be concrete)

- API behavior:
  - no runtime behavior change is made in this batch.
  - the output of this batch is a PM/BA pivot decision and next-lane recommendation.
- Runtime evidence in decisions/logs:
  - latest bundle runs `git.commit=5927bd9`.
  - latest bundle no longer shows the old defensive cancel/recreate signature.
  - dominant remaining repeat is `daily loss caution paused new symbols` under `ABS_DAILY_LOSS` with `BTCUSDC` fee/edge filter as the managed-symbol path.
- Risk slider impact:
  - none in this `NO_CODE` pivot batch.
- Validation commands:
  - raw bundle review only (`last_run_summary.json`, `state.json`, `adaptive-shadow.tail.jsonl`)
- Runtime validation plan:
  - no new runtime validation until PM/BA chooses the next lane

## 3) Deployment handoff

- Commit hash: `5927bd9`
- Deploy target: remote Binance Spot testnet runtime
- Required config changes: none
- Operator checklist:
  - reset state needed? (`no`)
  - keep config.json? (`yes`)
  - start command:
    - Compose v2: `docker compose up -d --build --force-recreate`
    - Compose v1: `docker-compose up -d --build --force-recreate`
  - collect bundle:
    - `AUTOBOT_COMPOSE_CMD=docker-compose ./scripts/collect-feedback.sh`
    - cycle label is auto-inferred (manual override optional via `AUTOBOT_RUN_PHASE=...`)
  - local ingest:
    - preferred: `./scripts/pull-and-ingest-feedback.sh <remote-host> [remote-repo-dir]`
    - fallback: `./scripts/ingest-feedback.sh autobot-feedback-YYYYMMDD-HHMMSS.tgz`
  - canonical procedure reference:
    - `docs/RUN_LOGGING_P0.md`

## 4) End-of-batch result (fill after run)

- Run context:
  - window (local): `MORNING (collection) / MORNING (run end)`
  - timezone: `Europe/Sofia`
  - bundle interval (hours): `16.838`
  - runtime uptime (hours): `930.656`
  - run end: `Sat Mar 28 2026 10:43:41 GMT+0200 (Eastern European Standard Time)`
  - declared cycle: `MORNING_REVIEW`
  - cycle source: `auto-inferred`
- Definition of Done status:
  - fresh runtime evidence: `met` (class=fresh, staleStreak=0)
  - funding regression absent: `met` (no dominant funding regression in latest top skips)
  - active ticket runtime signal: `observed` (Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered) (100))
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=0, historyLimitOrders=137, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=33.5%)
  - sizing reject pressure: `low` (sizingRejectSkips=0, decisions=200, ratio=0.0%)
  - fresh runtime evidence: `yes` (class=fresh)
- Decision: `pivot_required`
- Next ticket candidate: `PM/BA-TRIAGE` (triage required before lane change)
- Required action: `PM/BA pivot review required before next long run`
- Open risks:
  - none critical from automated checks.
- Notes for next session:
  - bundle: `autobot-feedback-20260328-084345.tgz`
  - auto-updated at: `2026-03-28T08:44:12.719Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-032
Decision: pivot_required
Required action: PM/BA pivot review required before next long run
Latest bundle: autobot-feedback-20260328-084345.tgz
Fresh runtime evidence: yes (fresh)
Goal: decide whether T-032 should pivot after the deployed fix removed the old churn signature and the remaining repeat moved into ABS_DAILY_LOSS caution policy.
In scope: PM/BA lane review, triage note, and next-ticket recommendation.
Out of scope: quote-routing redesign, candidate-hygiene-only optimization, PnL schema changes, AI lane.
Validation: raw bundle review only in this NO_CODE batch
After decision: if switching lanes, update docs/DELIVERY_BOARD.md, docs/TICKET_SWITCH_RETRO.md, and docs/SESSION_BRIEF.md.
```
