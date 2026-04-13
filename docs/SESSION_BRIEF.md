# Session Brief

Last updated: 2026-04-13 08:45 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-031` (Regime engine v2)
- Linked support ticket: `T-032` (allowed only when fresh evidence shows downside-control and candidate quality are coupled in the same runtime window)
- Goal (single sentence): park the post-thaw residual dust family at cluster level so fresh `T-031` validation does not fall back into multi-symbol `Grid sell leg not actionable yet` churn.
- In scope:
  - keep `T-031` active as the strategy-quality lane.
  - keep undersized sell legs non-actionable before runtime attempts another grid sell ladder.
  - keep the April 2 and April 7-10 `T-031` dust-loop mitigations in place.
  - preserve the April 12 linked-support `T-032` thaw that reopens candidate evaluation after near-flat `ABS_DAILY_LOSS`.
  - add one bounded `T-031` family-level storm control for repeated `Grid sell leg not actionable yet` residual loops across home-quote symbols.
  - preserve March 30-31 `T-032` downside-control behavior.
  - preserve `T-034` funding / quote-routing stability.
- Out of scope:
  - quote-routing redesign (`T-034` stays closed unless runtime regresses),
  - reopening `T-032` as the active blocker without fresh evidence,
  - AI lane/promotion work (`T-025+`),
  - PnL schema/reporting rewrites (`T-007` is closed),
  - endpoint/auth/UI redesign.
- Hypothesis: the April 12 linked-support thaw worked later in the run, but fresh April 13 evidence shows the bot then rotates across a family of tiny home-quote residuals (`0GUSDC`, `GIGGLEUSDC`, `币安人生USDC`, `BTCUSDC`, `ETHUSDC`) that all hit non-actionable sell-leg skips. A family-level skip storm key for `Grid sell leg not actionable yet` should extend cooldowns across that cluster without reopening the earlier no-feasible deadlock.
- Target KPI delta:
  - reduce repeated steady-state `Grid sell leg not actionable yet` loops on the same residual symbol family.
  - preserve the absence of the older `No feasible candidates after policy/exposure filters` deadlock.
  - preserve low sizing reject pressure and preserve reachable `daily-loss-caution-unwind` behavior.
- Stop/rollback condition:
  - if the selection exception reopens materially actionable sell inventory too early, or reopens any `T-032` caution freeze regression, freeze `T-031` and revert to the last stable April 2 morning baseline.

## 2) Definition of Done (must be concrete)

- API behavior:
  - runtime behavior changes in a bounded way:
    - sell-leg feasibility remains assessed explicitly before grid sell placement.
    - undersized sell legs remain `Grid sell leg not actionable yet` instead of repeatedly failing on exchange minimums.
    - `GRID_SELL_NOT_ACTIONABLE` cooldown still allows first-pass dust recovery, and existing longer retry cooldown behavior remains preserved.
    - repeated `Grid sell leg not actionable yet` skips across a residual family now share a storm key, so family-level cluster pressure can trigger a longer retry cooldown.
    - April 12 `ABS_DAILY_LOSS` `CAUTION` thaw remains preserved.
    - March 30-31 `T-032` caution-unwind / thaw behavior remains preserved.
  - active development lane is `T-031`; `T-032` remains preserved as a support lane in runtime.
- Runtime evidence in decisions/logs:
  - latest fresh bundle runs `git.commit=527fc7b`.
  - latest fresh bundle (`autobot-feedback-20260413-082204.tgz`) shows:
    - `risk_state=CAUTION` with `trigger=ABS_DAILY_LOSS`
    - no active orders
    - later runtime decisions resumed after the near-flat thaw
    - dominant residual cluster:
      - `Skip GIGGLEUSDC: Grid sell leg not actionable yet`
      - `Skip 0GUSDC: Grid sell leg not actionable yet`
      - `Skip 币安人生USDC: Grid sell leg not actionable yet`
  - the next fresh bundle should show lower repeated residual-family churn without restoring `daily loss caution paused new symbols` as the end-state blocker.
- Risk slider impact:
  - risk slider still modulates cooldown duration and lane thresholds; this slice only changes when dust sell legs are considered actionable enough to keep re-entering grid rotation.
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
- Runtime validation plan:
  - deploy the current `T-031` slice and collect one fresh bundle before any further reprioritization

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
  - window (local): `MORNING (collection) / MORNING (run end)`
  - timezone: `Europe/Sofia`
  - bundle interval (hours): `14.335`
  - runtime uptime (hours): `42.32`
  - run end: `Mon Apr 13 2026 11:21:35 GMT+0300 (Eastern European Summer Time)`
  - declared cycle: `MORNING_REVIEW`
  - cycle source: `auto-inferred`
- Definition of Done status:
  - fresh runtime evidence: `met` (class=fresh, staleStreak=0)
  - funding regression absent: `met` (no dominant funding regression in latest top skips)
  - active ticket runtime signal: `observed` (Skip GIGGLEUSDC: Grid sell leg not actionable yet (12))
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=0, historyLimitOrders=32, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=65.2%)
  - sizing reject pressure: `low` (sizingRejectSkips=0, decisions=200, ratio=0.0%)
  - fresh runtime evidence: `yes` (class=fresh)
- Decision: `patch_required`
- Next ticket candidate: `T-031` (continue active lane unless PM/BA reprioritizes)
- Required action: `same-ticket mitigation required before next long run`
- Open risks:
  - none critical from automated checks.
- Notes for next session:
  - bundle: `autobot-feedback-20260413-082204.tgz`
  - auto-updated at: `2026-04-13T08:22:16.016Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-031
Decision: patch_required
Required action: same-ticket mitigation required before next long run
Latest bundle: autobot-feedback-20260413-082204.tgz
Fresh runtime evidence: yes (fresh)
Goal: reduce post-thaw residual-family dust churn without reopening the earlier CAUTION freeze.
In scope: one bounded T-031 slice for family-level `Grid sell leg not actionable yet` storm parking, preserving April 12 linked-support T-032 thaw and existing residual mitigations.
Out of scope: quote-routing redesign, broad candidate-hygiene rewrites, PnL schema changes, AI lane.
Validation: docker compose -f docker-compose.ci.yml run --rm ci
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
