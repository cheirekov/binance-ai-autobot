# Session Brief

Last updated: 2026-03-28 23:45 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-031` (Regime engine v2)
- Goal (single sentence): move active development from prolonged `T-032` proof work to the first real `T-031` strategy slice so the bot adapts entries to regime quality instead of waiting on more downside-control-only evidence.
- Goal (single sentence): continue `T-031` with a second bounded slice so `SPOT_GRID` candidate ranking follows the actual resolved execution lane (`MARKET` / `GRID` / `DEFENSIVE`) instead of mostly favoring grid-style candidates.
- In scope:
  - freeze `T-032` as a support lane, not the active development lane.
  - implement `T-031` first slice: risk-linked regime thresholds and regime-aware fee floor.
  - implement the next `T-031` slice: lane-aware candidate scoring.
  - preserve existing `T-032` downside controls and `T-034` funding stability.
  - record the ticket switch cleanly in PM/BA artifacts.
- Out of scope:
  - quote-routing redesign (`T-034` is closed unless runtime regresses),
  - exit-manager rewrite in this batch,
  - AI lane/promotion work (`T-025+`),
  - PnL schema/reporting rewrites (`T-007` is closed),
  - endpoint/auth/UI redesign.
- Hypothesis: current fresh evidence says `T-032` is no longer the highest-leverage lane. The dominant repeats are now strategy-quality signals (`Fee/edge filter`, parked-ladder waiting), and the selector still scores `SPOT_GRID` candidates too much through the grid lens. The next meaningful improvement is to align candidate ranking with the resolved execution lane.
- Target KPI delta:
  - reduce fee-edge idle churn in strong trend conditions.
  - keep downside-control runtime intact while improving entry selection quality.
  - stop spending more cycles on unproven `T-032`-only live-market waiting.
- Stop/rollback condition:
  - if the strategy slice weakens bear-side protection or reopens quote-funding regressions, freeze `T-031` and revert to the last `T-032`/`T-034`-stable baseline.

## 2) Definition of Done (must be concrete)

- API behavior:
  - runtime behavior changes in a bounded way:
    - regime classification becomes risk-linked,
    - fee-edge floor becomes regime-aware.
    - `SPOT_GRID` candidate scoring becomes lane-aware.
  - active development lane becomes `T-031`; `T-032` remains paused/support only.
- Runtime evidence in decisions/logs:
  - latest bundle runs `git.commit=5927bd9`.
  - latest fresh bundle is dominated by `Fee/edge filter` and parked-ladder waiting, not quote-funding starvation.
  - the next fresh bundle should show changed fee-edge behavior or changed candidate mix under strong bull-trend candidates without reopening funding regressions.
- Risk slider impact:
  - risk slider now influences regime thresholds directly inside `T-031`.
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
- Runtime validation plan:
  - deploy the current `T-031` slices and collect one fresh bundle before any further strategy reprioritization

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
    - `AUTOBOT_COMPOSE_CMD=docker-compose ./scripts/collect-feedback.sh`
    - cycle label is auto-inferred (manual override optional via `AUTOBOT_RUN_PHASE=...`)
  - local ingest:
    - preferred: `./scripts/pull-and-ingest-feedback.sh <remote-host> [remote-repo-dir]`
    - fallback: `./scripts/ingest-feedback.sh autobot-feedback-YYYYMMDD-HHMMSS.tgz`
  - canonical procedure reference:
    - `docs/RUN_LOGGING_P0.md`

## 4) End-of-batch result (fill after run)

- Run context:
  - window (local): `NIGHT (collection) / NIGHT (run end)`
  - timezone: `Europe/Sofia`
  - bundle interval (hours): `11.725`
  - runtime uptime (hours): `942.381`
  - run end: `Sat Mar 28 2026 22:27:10 GMT+0200 (Eastern European Standard Time)`
  - declared cycle: `NIGHT_RUN`
  - cycle source: `auto-inferred`
- Definition of Done status:
  - fresh runtime evidence: `met` (class=fresh, staleStreak=0)
  - funding regression absent: `met` (no dominant funding regression in latest top skips)
  - active ticket runtime signal: `observed` (Skip BTCUSDC: Fee/edge filter (net 0.040% < 0.052%) (15))
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=9, historyLimitOrders=156, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=22.0%)
  - sizing reject pressure: `low` (sizingRejectSkips=1, decisions=200, ratio=0.5%)
  - fresh runtime evidence: `yes` (class=fresh)
- Decision: `manual reprioritize`
- Next ticket candidate: `T-031`
- Required action: `deploy current T-031 slices`
- Open risks:
  - none critical from automated checks.
- Notes for next session:
  - bundle: `autobot-feedback-20260328-202730.tgz`
  - auto-updated at: `2026-03-28T20:28:11.919Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-031
Decision: pivot_to_T-031
Required action: deploy first regime-engine slice
Latest bundle: autobot-feedback-20260328-202730.tgz
Fresh runtime evidence: yes (fresh)
Goal: improve strategy adaptation with risk-linked regime thresholds, regime-aware fee floor, and lane-aware candidate scoring while preserving T-032/T-034 protections.
In scope: T-031 regime engine v2 bounded slices.
Out of scope: quote-routing redesign, exit-manager rewrite, PnL schema changes, AI lane.
Validation: docker compose -f docker-compose.ci.yml run --rm ci
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
