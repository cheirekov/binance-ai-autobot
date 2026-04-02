# Session Brief

Last updated: 2026-04-02 13:36 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-031` (Regime engine v2)
- Linked support ticket: `T-032` (allowed only when fresh evidence shows downside-control and candidate quality are coupled in the same runtime window)
- Goal (single sentence): carry the home-quote dust-cooldown exception through the execution gate so cooled residuals are not re-blocked immediately after selection.
- In scope:
  - keep `T-031` active as the strategy-quality lane.
  - keep undersized sell legs non-actionable before runtime attempts another grid sell ladder.
  - keep the April 2 day selection-time dust-cooldown exception in place.
  - apply the same bounded exception at the post-selection execution gate for `SPOT_GRID`.
  - stop cooled home-quote dust residuals from being re-blocked immediately after selection by the raw protection-lock check.
  - preserve March 30-31 `T-032` downside-control behavior.
  - preserve `T-034` funding / quote-routing stability.
- Out of scope:
  - quote-routing redesign (`T-034` stays closed unless runtime regresses),
  - reopening `T-032` as the active blocker without fresh evidence,
  - AI lane/promotion work (`T-025+`),
  - PnL schema/reporting rewrites (`T-007` is closed),
  - endpoint/auth/UI redesign.
- Hypothesis: fresh April 2 evening evidence shows the April 2 day selection-time bypass landed, but the same cooled home-quote dust symbols were still hard-blocked again by the raw post-selection `isSymbolBlocked(...)` gate. Applying the bounded dust exception there as well should reduce both `No feasible candidates after policy/exposure filters` and immediate `Protection lock COOLDOWN` skips without weakening downside control.
- Target KPI delta:
  - reduce repeated `No feasible candidates after policy/exposure filters`.
  - reduce stalled windows where all home-quote symbols are dust residuals cooled by `GRID_SELL_NOT_ACTIONABLE`.
  - reduce immediate `Protection lock COOLDOWN: Cooldown after non-actionable sell leg` skips right after selection.
  - preserve low sizing reject pressure and preserve reachable `daily-loss-caution-unwind` behavior.
- Stop/rollback condition:
  - if the selection exception reopens materially actionable sell inventory too early, or reopens any `T-032` caution freeze regression, freeze `T-031` and revert to the last stable April 2 morning baseline.

## 2) Definition of Done (must be concrete)

- API behavior:
  - runtime behavior changes in a bounded way:
    - sell-leg feasibility remains assessed explicitly before grid sell placement.
    - undersized sell legs remain `Grid sell leg not actionable yet` instead of repeatedly failing on exchange minimums.
    - `GRID_SELL_NOT_ACTIONABLE` cooldown no longer blocks home-quote dust residuals from candidate selection once they have no active orders and no countable exposure.
    - the same bounded exception is applied at the post-selection execution gate for `SPOT_GRID`.
    - March 30-31 `T-032` caution-unwind / thaw behavior remains preserved.
  - active development lane is `T-031`; `T-032` remains preserved as a support lane in runtime.
- Runtime evidence in decisions/logs:
  - latest fresh bundle runs `git.commit=35694e0`.
  - latest fresh bundle (`autobot-feedback-20260402-162840.tgz`) still carries `Skip: No feasible candidates after policy/exposure filters (31)`, but the latest live decisions have already shifted to per-symbol `Grid sell leg not actionable yet` and `Protection lock COOLDOWN: Cooldown after non-actionable sell leg` on `STOUSDC` / `XPLUSDC`.
  - the next fresh bundle should show lower repeated `No feasible candidates after policy/exposure filters` and fewer immediate post-selection cooldown skips on the cooled home-quote family.
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
  - window (local): `EVENING (collection) / EVENING (run end)`
  - timezone: `Europe/Sofia`
  - bundle interval (hours): `4.917`
  - runtime uptime (hours): `1058.405`
  - run end: `Thu Apr 02 2026 19:28:37 GMT+0300 (Eastern European Summer Time)`
  - declared cycle: `NIGHT_RUN`
  - cycle source: `auto-inferred`
- Definition of Done status:
  - fresh runtime evidence: `met` (class=fresh, staleStreak=0)
  - funding regression absent: `met` (no dominant funding regression in latest top skips)
  - active ticket runtime signal: `observed` (Skip: No feasible candidates after policy/exposure filters (31))
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=0, historyLimitOrders=84, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=58.0%)
  - sizing reject pressure: `low` (sizingRejectSkips=0, decisions=200, ratio=0.0%)
  - fresh runtime evidence: `yes` (class=fresh)
- Decision: `patch_required`
- Next ticket candidate: `T-031` (continue active lane unless PM/BA reprioritizes)
- Required action: `same-ticket mitigation required before next long run`
- Open risks:
  - none critical from automated checks.
- Notes for next session:
  - bundle: `autobot-feedback-20260402-162840.tgz`
  - auto-updated at: `2026-04-02T16:29:01.948Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-031
Decision: patch_required
Required action: same-ticket mitigation required before next long run
Latest bundle: autobot-feedback-20260402-162840.tgz
Fresh runtime evidence: yes (fresh)
Goal: carry the home-quote dust-cooldown exception through the execution gate so cooled residuals are not re-blocked immediately after selection.
In scope: T-031 candidate/actionability logic for cooled home-quote dust residuals, while preserving T-032 downside control and T-034 routing stability.
Out of scope: quote-routing redesign, reopening T-032 as the active blocker without fresh evidence, PnL schema changes, AI lane.
Validation: docker compose -f docker-compose.ci.yml run --rm ci
After patch: update docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md, docs/STRATEGY_COVERAGE.md, docs/easy_process/*.
```
