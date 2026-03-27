# Session Brief

Last updated: 2026-03-27 14:40 EET
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-032` (Exit manager v2)
- Goal (single sentence): release profit-giveback `CAUTION` from a global new-symbol pause once managed exposure has already de-risked materially, while preserving symbol-level bear-trend buy pauses and hard guards.
- In scope:
  - relax the `daily loss caution paused new symbols` threshold after material de-risking.
  - preserve the existing per-symbol grid-guard / bear-trend BUY pause behavior.
  - keep the prior no-feasible recovery patch intact and observable.
  - preserve `T-034` funding stability and all closed guardrail tickets.
- Out of scope:
  - quote-routing redesign (`T-034` is closed unless runtime regresses),
  - candidate-hygiene-only optimization (`T-031` is frozen unless runtime regresses back there),
  - AI lane/promotion work (`T-025+`),
  - PnL schema/reporting rewrites (`T-007` is closed),
  - endpoint/auth/UI redesign.
- Hypothesis: the previous recovery patch worked, but profit-giveback `CAUTION` is now staying too restrictive after the bot has already sold down to about `18%` managed exposure; allowing new symbols again below a materially higher caution threshold should reduce `59 filtered` loops without removing the existing bear-trend pause on `BTCUSDC`.
- Target KPI delta:
  - remove the dominant `No feasible candidates: daily loss caution paused new symbols` loop once exposure is already low-to-moderate.
  - keep `Skip BTCUSDC: Daily loss caution paused GRID BUY leg` or `Grid guard paused BUY leg` available when the symbol itself still merits a pause.
  - keep `T-034` funding behavior stable and preserve the working no-feasible recovery path.
- Stop/rollback condition:
  - if `T-034` funding loops return, the no-feasible recovery path regresses, or the relaxed caution threshold reintroduces churn after giveback.

## 2) Definition of Done (must be concrete)

- API behavior:
  - profit-giveback `CAUTION` no longer pauses all new symbols once managed exposure has already de-risked below the new trigger-aware threshold.
  - symbol-level bear-trend/grid-guard BUY pauses still work on the risky managed symbol itself.
  - `T-034` funding/routing behavior remains unchanged.
  - `T-005` / `T-007` guard behavior remains unchanged.
- Runtime evidence in decisions/logs:
  - the dominant latest loop is no longer `No feasible candidates: daily loss caution paused new symbols (59 filtered)`.
  - if `BTCUSDC` remains in bearish defensive handling, symbol-level BUY pause evidence still appears there instead of globally blocking all fresh entries.
  - no return of dominant `Insufficient spendable <quote>` loops.
  - no regression of `no-feasible-liquidity-recovery`.
- Risk slider impact:
  - risk still bounds the caution threshold and must not bypass hard caps.
- Validation commands:
  - `./node_modules/.bin/vitest run --no-cache src/modules/bot/bot-engine.service.test.ts`
  - `./scripts/validate-active-ticket.sh`
- Runtime validation plan:
  - run duration: `1-3 hours`
  - expected bundle name pattern: `autobot-feedback-YYYYMMDD-HHMMSS.tgz`

## 3) Deployment handoff

- Commit hash: `aaf532b`
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
  - window (local): `DAY (collection) / DAY (run end)`
  - timezone: `Europe/Sofia`
  - bundle interval (hours): `2.186`
  - runtime uptime (hours): `910.522`
  - run end: `Fri Mar 27 2026 14:35:38 GMT+0200 (Eastern European Standard Time)`
  - declared cycle: `DAY_RUN`
  - cycle source: `auto-inferred`
- Definition of Done status:
  - fresh runtime evidence: `met` (class=fresh, staleStreak=0)
  - funding regression absent: `met` (no dominant funding regression in latest top skips)
  - active ticket runtime signal: `observed` (Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered) (48))
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=0, historyLimitOrders=106, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=47.0%)
  - sizing reject pressure: `low` (sizingRejectSkips=0, decisions=200, ratio=0.0%)
  - fresh runtime evidence: `yes` (class=fresh)
- Decision: `patch_required`
- Next ticket candidate: `T-032` (continue active lane unless PM/BA reprioritizes)
- Required action: `same-ticket mitigation required before next long run`
- Open risks:
  - none critical from automated checks.
- Notes for next session:
  - bundle: `autobot-feedback-20260327-123604.tgz`
  - auto-updated at: `2026-03-27T12:36:20.868Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-032
Decision: patch_required
Required action: same-ticket mitigation required before next long run
Latest bundle: autobot-feedback-20260327-123604.tgz
Fresh runtime evidence: yes (fresh)
Goal: reduce profit giveback and improve downside control while preserving T-034 funding stability.
In scope: exit-manager / de-risking behavior under adverse conditions.
Out of scope: quote-routing redesign, candidate-hygiene-only optimization, PnL schema changes, AI lane.
Validation: docker compose -f docker-compose.ci.yml run --rm ci
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
