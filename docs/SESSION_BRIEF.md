# Session Brief

Last updated: 2026-04-02 08:29 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-031` (Regime engine v2)
- Goal (single sentence): reduce repeated home-quote dust sell-ladder churn so the engine stops retrying impossible residual sells on managed symbols.
- In scope:
  - keep `T-031` active as the strategy-quality lane.
  - treat undersized sell legs as non-actionable before runtime attempts another grid sell ladder.
  - demote dust-residual symbols with impossible sell legs out of repeated grid churn.
  - preserve March 30-31 `T-032` downside-control behavior.
  - preserve `T-034` funding / quote-routing stability.
- Out of scope:
  - quote-routing redesign (`T-034` stays closed unless runtime regresses),
  - reopening `T-032` as the active blocker without fresh evidence,
  - AI lane/promotion work (`T-025+`),
  - PnL schema/reporting rewrites (`T-007` is closed),
  - endpoint/auth/UI redesign.
- Hypothesis: fresh April 2 evidence shows the April 1 cross-quote slice held, but the live blocker moved to repeated `Grid sell sizing rejected (...)` churn on tiny residual home-quote inventory (`ETHUSDC`, `BTCUSDC`, `STOUSDC`, `TAOUSDC`, `XRPUSDC`). Treating those residual sell legs as non-actionable before order placement should rotate the engine away from dust sell retries without weakening downside control.
- Target KPI delta:
  - reduce repeated `Grid sell sizing rejected (...)` on managed home-quote symbols with dust residual inventory.
  - reduce paired `Grid guard paused BUY leg` loops that are only anchored by non-actionable sell legs.
  - preserve reachable `daily-loss-caution-unwind` behavior for materially exposed books and keep `T-034` funding stability intact.
- Stop/rollback condition:
  - if dust sell-leg suppression hides materially actionable sell inventory or reopens any `T-032` caution freeze regression, freeze `T-031` and revert to the last stable April 1 baseline.

## 2) Definition of Done (must be concrete)

- API behavior:
  - runtime behavior changes in a bounded way:
    - sell-leg feasibility is assessed explicitly before grid sell placement.
    - undersized sell legs are treated as `Grid sell leg not actionable yet` instead of repeatedly failing on exchange minimums.
    - sell-leg non-actionability can cool the symbol down before the next rotation.
    - March 30-31 `T-032` caution-unwind / thaw behavior remains preserved.
  - active development lane is `T-031`; `T-032` remains preserved as a support lane in runtime.
- Runtime evidence in decisions/logs:
  - latest fresh bundle runs `git.commit=8e6711d`.
  - latest fresh bundle (`autobot-feedback-20260402-081314.tgz`) is dominated by home-quote sell-ladder sizing churn (`ETHUSDC`, `BTCUSDC`, `STOUSDC`, `TAOUSDC`, `XRPUSDC`) plus paired `Grid guard paused BUY leg`.
  - the next fresh bundle should show lower repeated `Grid sell sizing rejected (...)` and more `Grid sell leg not actionable yet` / cooldown rotation instead of exchange-minimum retries.
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
  - bundle interval (hours): `17.096`
  - runtime uptime (hours): `1050.14`
  - run end: `Thu Apr 02 2026 11:12:43 GMT+0300 (Eastern European Summer Time)`
  - declared cycle: `MORNING_REVIEW`
  - cycle source: `auto-inferred`
- Definition of Done status:
  - fresh runtime evidence: `met` (class=fresh, staleStreak=0)
  - funding regression absent: `met` (no dominant funding regression in latest top skips)
  - active ticket runtime signal: `observed` (Skip: No feasible candidates after policy/exposure filters (9))
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=4, historyLimitOrders=99, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=50.5%)
  - sizing reject pressure: `high` (sizingRejectSkips=63, decisions=200, ratio=31.5%)
  - fresh runtime evidence: `yes` (class=fresh)
- Decision: `patch_required`
- Next ticket candidate: `T-031` (continue active lane unless PM/BA reprioritizes)
- Required action: `same-ticket mitigation required before next long run`
- Open risks:
  - sizing reject pressure is high (31.5%).
- Notes for next session:
  - bundle: `autobot-feedback-20260402-081314.tgz`
  - auto-updated at: `2026-04-02T08:13:25.803Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-031
Decision: patch_required
Required action: same-ticket mitigation required before next long run
Latest bundle: autobot-feedback-20260402-081314.tgz
Fresh runtime evidence: yes (fresh)
Goal: reduce repeated dust sell-ladder churn on managed symbols while preserving T-032 downside control and T-034 funding stability.
In scope: grid sell-leg actionability and rotation for managed home-quote symbols.
Out of scope: quote-routing redesign, reopening T-032 as the active blocker without fresh evidence, PnL schema changes, AI lane.
Validation: docker compose -f docker-compose.ci.yml run --rm ci
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
