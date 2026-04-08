# Session Brief

Last updated: 2026-04-08 13:09 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-031` (Regime engine v2)
- Linked support ticket: `T-032` (allowed only when fresh evidence shows downside-control and candidate quality are coupled in the same runtime window)
- Goal (single sentence): stop repeated home-quote dust residuals from resurfacing after the paired dead-end mitigation has already reduced the buy-pause side.
- In scope:
  - keep `T-031` active as the strategy-quality lane.
  - keep undersized sell legs non-actionable before runtime attempts another grid sell ladder.
  - keep the April 2 selection-time and execution-gate dust-cooldown exceptions in place for first-pass recovery.
  - re-apply the existing `GRID_SELL_NOT_ACTIONABLE` cooldown once the same home-quote residual repeatedly hits a higher threshold of solo `Grid sell leg not actionable yet` retries.
  - preserve the April 7 morning paired-loop mitigation while stopping the same residual family from resurfacing through sell-leg-only churn.
  - preserve March 30-31 `T-032` downside-control behavior.
  - preserve `T-034` funding / quote-routing stability.
- Out of scope:
  - quote-routing redesign (`T-034` stays closed unless runtime regresses),
  - reopening `T-032` as the active blocker without fresh evidence,
  - AI lane/promotion work (`T-025+`),
  - PnL schema/reporting rewrites (`T-007` is closed),
  - endpoint/auth/UI redesign.
- Hypothesis: the April 7 morning re-block threshold solved the paired `sell-not-actionable + buy-pause` storm, but fresh April 7 evening evidence shows the same residual family can still resurface through repeated solo `Grid sell leg not actionable yet` retries. Re-applying the cooldown after a higher solo-loop threshold should preserve the earlier recovery while reducing the remaining churn.
- Target KPI delta:
  - reduce repeated solo `Grid sell leg not actionable yet` loops on the same residual symbol family.
  - preserve the absence of the older `No feasible candidates after policy/exposure filters` deadlock.
  - preserve low sizing reject pressure and preserve reachable `daily-loss-caution-unwind` behavior.
- Stop/rollback condition:
  - if the selection exception reopens materially actionable sell inventory too early, or reopens any `T-032` caution freeze regression, freeze `T-031` and revert to the last stable April 2 morning baseline.

## 2) Definition of Done (must be concrete)

- API behavior:
  - runtime behavior changes in a bounded way:
    - sell-leg feasibility remains assessed explicitly before grid sell placement.
    - undersized sell legs remain `Grid sell leg not actionable yet` instead of repeatedly failing on exchange minimums.
    - `GRID_SELL_NOT_ACTIONABLE` cooldown still allows first-pass dust recovery, but it is re-applied after repeated paired dead-end loops and, at a higher threshold, after repeated solo non-actionable sell-leg loops on the same residual symbol.
    - March 30-31 `T-032` caution-unwind / thaw behavior remains preserved.
  - active development lane is `T-031`; `T-032` remains preserved as a support lane in runtime.
- Runtime evidence in decisions/logs:
  - latest fresh bundle runs `git.commit=c809ce4`.
  - latest fresh bundle (`autobot-feedback-20260407-181242.tgz`) shows the morning slice helped, but the same residual family still dominates through solo sell-leg retries:
    - `Skip ETHUSDC: Grid sell leg not actionable yet (31)`
    - paired buy-pause side reduced to `Skip ETHUSDC: Grid guard paused BUY leg (10)`
  - the next fresh bundle should show lower repeated solo sell-leg churn on the same residual family without restoring `No feasible candidates after policy/exposure filters`.
- Risk slider impact:
  - risk slider still modulates cooldown duration and lane thresholds; this slice only changes when dust sell legs are considered actionable enough to keep re-entering grid rotation.
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
- Runtime validation plan:
  - deploy the current `T-031` slice and collect one fresh bundle before any further reprioritization

## 3) Deployment handoff

- Commit hash: `8a5e237`
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
  - bundle interval (hours): `18.946`
  - runtime uptime (hours): `1199.084`
  - run end: `Wed Apr 08 2026 16:09:22 GMT+0300 (Eastern European Summer Time)`
  - declared cycle: `DAY_RUN`
  - cycle source: `auto-inferred`
- Definition of Done status:
  - fresh runtime evidence: `met` (class=fresh, staleStreak=0)
  - funding regression absent: `met` (no dominant funding regression in latest top skips)
  - active ticket runtime signal: `observed` (Skip ETHUSDC: Grid sell leg not actionable yet (28))
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=0, historyLimitOrders=71, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=64.5%)
  - sizing reject pressure: `low` (sizingRejectSkips=0, decisions=200, ratio=0.0%)
  - fresh runtime evidence: `yes` (class=fresh)
- Decision: `patch_required`
- Next ticket candidate: `T-031` (continue active lane unless PM/BA reprioritizes)
- Required action: `same-ticket mitigation required before next long run`
- Open risks:
  - none critical from automated checks.
- Notes for next session:
  - bundle: `autobot-feedback-20260408-130935.tgz`
  - auto-updated at: `2026-04-08T13:09:58.019Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-031
Decision: patch_required
Required action: same-ticket mitigation required before next long run
Latest bundle: autobot-feedback-20260408-130935.tgz
Fresh runtime evidence: yes (fresh)
Goal: reduce profit giveback and improve downside control while preserving T-034 funding stability.
In scope: exit-manager / de-risking behavior under adverse conditions.
Out of scope: quote-routing redesign, candidate-hygiene-only optimization, PnL schema changes, AI lane.
Validation: docker compose -f docker-compose.ci.yml run --rm ci
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
