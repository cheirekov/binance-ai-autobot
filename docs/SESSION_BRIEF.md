# Session Brief

Last updated: 2026-04-15 07:45 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-031` (Regime engine v2)
- Linked support ticket: `T-032` (allowed only when fresh evidence shows downside-control and candidate quality are coupled in the same runtime window)
- Goal (single sentence): make residual dust storm locks authoritative so the dust-cooldown bypass cannot reselect symbols already parked by `Grid sell leg not actionable yet` storm protection.
- In scope:
  - keep `T-031` active as the strategy-quality lane.
  - keep undersized sell legs non-actionable before runtime attempts another grid sell ladder.
  - keep the April 2 and April 7-10 `T-031` dust-loop mitigations in place.
  - preserve the April 12 linked-support `T-032` thaw that reopens candidate evaluation after near-flat `ABS_DAILY_LOSS`.
  - keep the April 13 family-level storm key in place for `Grid sell leg not actionable yet`.
  - keep the April 14 widened residual-family storm window/threshold/cooldown.
  - add one bounded `T-031` correction so active skip-storm locks are not bypassed by the first-pass dust-cooldown exception.
  - preserve March 30-31 `T-032` downside-control behavior.
  - preserve `T-034` funding / quote-routing stability.
- Out of scope:
  - quote-routing redesign (`T-034` stays closed unless runtime regresses),
  - reopening `T-032` as the active blocker without fresh evidence,
  - AI lane/promotion work (`T-025+`),
  - PnL schema/reporting rewrites (`T-007` is closed),
  - endpoint/auth/UI redesign.
- Hypothesis: the April 14 storm logic is firing in fresh April 15 evidence, but selection still re-enters symbols whose active `GRID_SELL_NOT_ACTIONABLE` lock reason is a skip storm. Keeping the dust bypass for first-pass tiny residual recovery while honoring storm locks should stop reselecting already-parked residual symbols without reopening the earlier no-feasible deadlock.
- Target KPI delta:
  - reduce repeated steady-state `Grid sell leg not actionable yet` and `Protection lock COOLDOWN: Skip storm (...)` loops across the residual symbol family.
  - preserve the absence of the older `No feasible candidates after policy/exposure filters` deadlock.
  - preserve low sizing reject pressure and preserve reachable `daily-loss-caution-unwind` behavior.
- Stop/rollback condition:
  - if honoring storm locks restores the old `No feasible candidates after policy/exposure filters` deadlock, or weakens `daily-loss-halt-unwind` reachability, freeze `T-031` and revisit the dust-bypass rules.

## 2) Definition of Done (must be concrete)

- API behavior:
  - runtime behavior changes in a bounded way:
    - sell-leg feasibility remains assessed explicitly before grid sell placement.
    - undersized sell legs remain `Grid sell leg not actionable yet` instead of repeatedly failing on exchange minimums.
    - `GRID_SELL_NOT_ACTIONABLE` cooldown still allows first-pass dust recovery, and existing longer retry cooldown behavior remains preserved.
    - repeated `Grid sell leg not actionable yet` skips across a residual family now share a storm key, so family-level cluster pressure can trigger a longer retry cooldown.
    - active skip-storm locks remain blocking during candidate selection, even for dust home-quote residuals.
    - April 12 `ABS_DAILY_LOSS` `CAUTION` thaw remains preserved.
    - March 30-31 `T-032` caution-unwind / thaw behavior remains preserved.
  - active development lane is `T-031`; `T-032` remains preserved as a support lane in runtime.
- Runtime evidence in decisions/logs:
  - latest fresh bundle runs `git.commit=9bf1316`.
  - latest fresh bundle (`autobot-feedback-20260415-072942.tgz`) shows:
    - `risk_state=HALT` with `trigger=PROFIT_GIVEBACK`
    - `daily-loss-halt-unwind` fired on `DOGEUSDC`
    - active residual storm locks exist for multiple symbols
    - dominant residual cluster still includes:
      - `Skip ETHUSDC: Grid sell leg not actionable yet`
      - `Skip 币安人生USDC: Grid sell leg not actionable yet`
      - `Skip GIGGLEUSDC: Protection lock COOLDOWN: Skip storm (...)`
      - `Skip ZAMAUSDC: Grid sell leg not actionable yet`
  - the next fresh bundle should show lower storm-lock re-selection without blocking the `T-032` halt unwind path.
- Risk slider impact:
  - risk slider still modulates cooldown duration and lane thresholds; this slice only changes when dust sell legs are considered actionable enough to keep re-entering grid rotation.
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
- Runtime validation plan:
  - deploy the current `T-031` slice and collect one fresh bundle before any further reprioritization

## 3) Deployment handoff

- Commit hash: `9bf1316`
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
  - bundle interval (hours): `22.359`
  - runtime uptime (hours): `89.446`
  - run end: `Wed Apr 15 2026 10:29:11 GMT+0300 (Eastern European Summer Time)`
  - declared cycle: `MORNING_REVIEW`
  - cycle source: `auto-inferred`
- Definition of Done status:
  - fresh runtime evidence: `met` (class=fresh, staleStreak=0)
  - funding regression absent: `met` (no dominant funding regression in latest top skips)
  - active ticket runtime signal: `observed` (Skip ETHUSDC: Grid sell leg not actionable yet (15))
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=0, historyLimitOrders=70, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=60.0%)
  - sizing reject pressure: `low` (sizingRejectSkips=0, decisions=200, ratio=0.0%)
  - fresh runtime evidence: `yes` (class=fresh)
- Decision: `patch_required`
- Next ticket candidate: `T-031` (continue active lane unless PM/BA reprioritizes)
- Required action: `same-ticket mitigation required before next long run`
- Open risks:
  - none critical from automated checks.
- Notes for next session:
  - bundle: `autobot-feedback-20260415-072942.tgz`
  - auto-updated at: `2026-04-15T07:29:53.683Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-031
Decision: patch_required
Required action: same-ticket mitigation required before next long run
Latest bundle: autobot-feedback-20260415-072942.tgz
Fresh runtime evidence: yes (fresh)
Goal: reduce profit giveback and improve downside control while preserving T-034 funding stability.
In scope: exit-manager / de-risking behavior under adverse conditions.
Out of scope: quote-routing redesign, candidate-hygiene-only optimization, PnL schema changes, AI lane.
Validation: docker compose -f docker-compose.ci.yml run --rm ci
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
