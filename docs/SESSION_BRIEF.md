# Session Brief

Last updated: 2026-04-01 15:17 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-031` (Regime engine v2)
- Goal (single sentence): reduce repeated guarded cross-quote sell-ladder churn now that `T-032` downside-control is stable again.
- In scope:
  - reactivate `T-031` as the active lane.
  - treat guarded cross-quote sell ladders as parked inventory that should rotate out after the sell leg is parked.
  - preserve March 30-31 `T-032` downside-control behavior.
  - preserve `T-034` funding / quote-routing stability.
- Out of scope:
  - quote-routing redesign (`T-034` stays closed unless runtime regresses),
  - reopening `T-032` as the active blocker without fresh evidence,
  - AI lane/promotion work (`T-025+`),
  - PnL schema/reporting rewrites (`T-007` is closed),
  - endpoint/auth/UI redesign.
- Hypothesis: fresh April 1 evidence shows `T-032` is no longer the dominant blocker. The engine now wastes candidate budget on guarded cross-quote symbols (`BNBETH`, `SOLETH`, `TRXETH`) after their sell ladder is already parked. Applying a guarded sell-ladder cooldown should rotate the engine away from those parked symbols without weakening downside control.
- Target KPI delta:
  - reduce repeated `Grid guard paused BUY leg` / `Grid waiting for ladder slot or inventory` on guarded cross-quote symbols.
  - lower repeated `Fee/edge filter` retries on no-action cross-quote symbols indirectly by rotating away from parked ladders first.
  - preserve reachable `daily-loss-caution-unwind` behavior for materially exposed books.
- Stop/rollback condition:
  - if the new cooldown suppresses valid high-conviction managed symbols or reopens any `T-032` caution freeze regression, freeze `T-031` and revert to the last stable `T-032` baseline.

## 2) Definition of Done (must be concrete)

- API behavior:
  - runtime behavior changes in a bounded way:
    - guarded sell ladders (`buyPaused && !hasBuyLimit && hasSellLimit`) get a symbol cooldown after placement instead of being reconsidered immediately.
    - non-home-quote inventory is treated as actionable only when it has meaningful home-value, not raw qty alone.
    - March 30-31 `T-032` caution-unwind / thaw behavior remains preserved.
  - active development lane is `T-031`; `T-032` remains preserved as a support lane in runtime.
- Runtime evidence in decisions/logs:
  - latest fresh bundle runs `git.commit=c702bb0`.
  - latest fresh bundle (`autobot-feedback-20260401-150741.tgz`) is dominated by guarded cross-quote churn (`BNBETH`, `SOLETH`, `TRXETH`) and some cross-quote fee-edge retries (`SOLBTC`, `XRPETH`).
  - the next fresh bundle should show lower guarded sell-ladder repeats and fresher decision timestamps on alternative candidates.
- Risk slider impact:
  - risk slider still modulates cooldown duration and lane thresholds; this slice only changes how long parked guarded sell ladders stay out of rotation.
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
- Runtime validation plan:
  - deploy the current `T-031` slice and collect one fresh bundle before any further reprioritization

## 3) Deployment handoff

- Commit hash: `c702bb0`
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
  - window (local): `EVENING (collection) / EVENING (run end)`
  - timezone: `Europe/Sofia`
  - bundle interval (hours): `6.589`
  - runtime uptime (hours): `1033.044`
  - run end: `Wed Apr 01 2026 18:06:57 GMT+0300 (Eastern European Summer Time)`
  - declared cycle: `NIGHT_RUN`
  - cycle source: `auto-inferred`
- Definition of Done status:
  - fresh runtime evidence: `met` (class=fresh, staleStreak=0)
  - `T-032` support stability: `met` (`risk_state=NORMAL`, no dominant caution freeze)
  - active ticket runtime signal: `observed` (Skip BNBETH: Grid guard paused BUY leg (10))
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=10, historyLimitOrders=141, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=29.5%)
  - sizing reject pressure: `low` (sizingRejectSkips=6, decisions=200, ratio=3.0%)
  - fresh runtime evidence: `yes` (class=fresh)
- Decision: `pivot_to_t031_with_patch`
- Next ticket candidate: `T-031`
- Required action: `deploy first real T-031 slice`
- Open risks:
  - `T-032` is no longer the dominant blocker, but cross-quote candidate quality is still weak.
- Notes for next session:
  - bundle: `autobot-feedback-20260401-150741.tgz`
  - auto-updated at: `2026-04-01T15:08:23.549Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-031
Decision: pivot_to_t031_with_patch
Required action: deploy first real T-031 slice
Latest bundle: autobot-feedback-20260401-150741.tgz
Fresh runtime evidence: yes (fresh)
Goal: reduce guarded cross-quote sell-ladder churn while preserving T-032 downside-control and T-034 funding stability.
In scope: strategy-quality / lane-rotation behavior for parked guarded sell ladders.
Out of scope: quote-routing redesign, reopening T-032 without fresh evidence, PnL schema changes, AI lane.
Validation: docker compose -f docker-compose.ci.yml run --rm ci
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
