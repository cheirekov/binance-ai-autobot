# Session Brief

Last updated: 2026-03-31 08:46 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-032` (Exit manager v2)
- Goal (single sentence): keep `T-032` active and stop post-stop-loss cooldown residues from anchoring global `CAUTION` once active orders are already gone.
- In scope:
  - reactivate `T-032` as the active lane.
  - keep the March 30 caution-unwind slice intact for materially exposed `ABS_DAILY_LOSS` books.
  - stop stop-loss-cooled residual positions from anchoring global `CAUTION` when active orders are already gone.
  - preserve stricter `PROFIT_GIVEBACK` caution behavior while exposure is still material.
  - preserve the earlier flat-book thaw behavior once exposure/order state is already near zero.
  - preserve March 28-29 `T-031` strategy-quality slices and `T-034` funding stability.
- Out of scope:
  - quote-routing redesign (`T-034` is closed unless runtime regresses),
  - broader regime-engine rewrite (`T-031` is frozen, not discarded),
  - AI lane/promotion work (`T-025+`),
  - PnL schema/reporting rewrites (`T-007` is closed),
  - endpoint/auth/UI redesign.
- Hypothesis: fresh March 31 evidence shows the March 30 caution-unwind slice reached the market (`daily-loss-caution-unwind` trades happened), but after those sells the engine is left almost flat (`total_alloc_pct=0.25`, `activeOrders=0`) while a stop-loss-cooled residual symbol (`NOMUSDC`) still keeps global `CAUTION` paused. Excluding stop-loss-cooled residuals from the caution anchor count should let new symbols reopen once the book is effectively de-risked.
- Target KPI delta:
  - reduce repeated `Post stop-loss cooldown active` / `Daily loss caution paused GRID BUY leg` on the same cooled symbol.
  - lower repeated `No feasible candidates: daily loss caution paused new symbols (...)` once active orders are gone and only cooled residuals remain.
  - preserve reachable `daily-loss-caution-unwind` behavior for materially exposed books.
- Stop/rollback condition:
  - if the thaw logic reopens new-symbol risk while exposure/orders are still material, freeze `T-032` and restore the stricter caution-pause baseline.

## 2) Definition of Done (must be concrete)

- API behavior:
  - runtime behavior changes in a bounded way:
    - `ABS_DAILY_LOSS` CAUTION still thaws once the book is effectively flat.
    - stop-loss-cooled residual positions no longer keep global `CAUTION` paused once active orders are gone.
    - `ABS_DAILY_LOSS` CAUTION can still run best-effort unwind while managed exposure is still material.
    - `PROFIT_GIVEBACK` CAUTION still requires materially higher exposure before new-symbol pause releases.
  - active development lane is `T-032`; March 28-29 `T-031` slices remain preserved in runtime.
- Runtime evidence in decisions/logs:
  - latest bundle runs `git.commit=e1383fd`.
  - latest fresh bundle is dominated by `Post stop-loss cooldown active` plus residual `daily loss caution paused new symbols` while total allocation is already only `0.25%`.
  - the next fresh bundle should show lower cooled-symbol pause churn and fresher decision timestamps after the engine reopens beyond the cooled residual.
- Risk slider impact:
  - risk slider still modulates the pause floor and caution-unwind activation threshold; this slice only changes which residual positions are allowed to anchor global `CAUTION`.
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
- Runtime validation plan:
  - deploy the current `T-032` slice and collect one fresh bundle before any further strategy reprioritization

## 3) Deployment handoff

- Commit hash: `e1383fd-dirty`
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
  - bundle interval (hours): `18.773`
  - runtime uptime (hours): `1002.69`
  - run end: `Tue Mar 31 2026 11:45:41 GMT+0300 (Eastern European Summer Time)`
  - declared cycle: `MORNING_REVIEW`
  - cycle source: `auto-inferred`
- Definition of Done status:
  - fresh runtime evidence: `met` (class=fresh, staleStreak=0)
  - funding regression absent: `met` (no dominant funding regression in latest top skips)
  - active ticket runtime signal: `observed` (Skip NOMUSDC: Post stop-loss cooldown active (45))
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=0, historyLimitOrders=112, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=44.0%)
  - sizing reject pressure: `low` (sizingRejectSkips=6, decisions=200, ratio=3.0%)
  - fresh runtime evidence: `yes` (class=fresh)
- Decision: `patch_required`
- Next ticket candidate: `T-032` (continue active lane unless PM/BA reprioritizes)
- Required action: `same-ticket mitigation required before next long run`
- Open risks:
  - none critical from automated checks.
- Notes for next session:
  - bundle: `autobot-feedback-20260331-084549.tgz`
  - auto-updated at: `2026-03-31T08:46:11.567Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-032
Decision: patch_required
Required action: same-ticket mitigation required before next long run
Latest bundle: autobot-feedback-20260331-084549.tgz
Fresh runtime evidence: yes (fresh)
Goal: stop stop-loss-cooled residual positions from anchoring global CAUTION once active orders are already gone.
In scope: exit-manager / downside-control behavior under adverse conditions.
Out of scope: quote-routing redesign, regime-engine rewrite, PnL schema changes, AI lane.
Validation: docker compose -f docker-compose.ci.yml run --rm ci
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
