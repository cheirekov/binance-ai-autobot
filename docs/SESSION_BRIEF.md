# Session Brief

Last updated: 2026-04-20 08:39 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-031` (Regime engine v2)
- Linked support ticket: `T-032` (allowed only when fresh evidence shows downside-control and candidate quality are coupled in the same runtime window)
- Goal (single sentence): stop no-feasible quote-pressure loops from re-entering non-home quote families when the recovery attempt itself is still below exchange minimums.
- In scope:
  - keep `T-031` active as the strategy-quality lane.
  - seed `GRID_BUY_QUOTE` quarantine from repeated no-feasible quote-pressure evidence.
  - preserve the April 17 no-feasible dust cooldown, April 15 fee-edge quarantine, and active-order behavior.
  - preserve the April 12 linked-support `T-032` thaw that reopens candidate evaluation after near-flat `ABS_DAILY_LOSS`.
  - keep the April 13-15 residual storm mitigations in place.
  - preserve March 30-31 `T-032` downside-control behavior.
  - preserve `T-034` funding / quote-routing stability.
- Out of scope:
  - quote-routing redesign (`T-034` stays closed unless runtime regresses),
  - reopening `T-032` as the active blocker without fresh evidence that downside-control is again the immediate blocker,
  - weakening entry filters or fee-edge floors,
  - AI lane/promotion work (`T-025+`),
  - PnL schema/reporting rewrites (`T-007` is closed),
  - endpoint/auth/UI redesign.
- Hypothesis: the April 17 dust cooldown works, but it does not yet activate the existing buy-quote quarantine path. Seeding `GRID_BUY_QUOTE` quarantine from no-feasible quote-pressure evidence should reduce repeated non-home quote loops without reopening `T-032`.
- Target KPI delta:
  - reduce repeated `Skip: No feasible candidates after policy/exposure filters` when the rejection samples are entirely non-home quote pressure.
  - preserve the old April 17 freeze fix and avoid reopening `T-032`.
  - preserve reachable home-quote / managed sell paths.
- Stop/rollback condition:
  - if the new quarantine blocks reachable home-quote / managed sell paths, or a fresh bundle reopens the old near-flat `CAUTION` / `HALT` freeze, reopen linked support `T-032`.

## 2) Definition of Done (must be concrete)

- API behavior:
  - runtime behavior changes in a bounded way:
    - April 17 no-feasible dust cooldown remains preserved.
    - repeated no-feasible loops driven entirely by non-home quote pressure can seed global `GRID_BUY_QUOTE` quarantine when the recovery attempt also fails on exchange minimums.
    - actionable managed sell-leg candidates and active-order cases remain outside the dust-cooldown path.
    - April 15 global fee-edge quarantine behavior remains preserved.
    - April 13-15 residual storm behavior remains preserved.
    - April 12 `ABS_DAILY_LOSS` `CAUTION` thaw remains preserved.
    - March 30-31 `T-032` caution-unwind / thaw behavior remains preserved.
  - active development lane is `T-031`; `T-032` remains preserved as a support lane in runtime.
- Runtime evidence in decisions/logs:
  - latest fresh bundle runs `git.commit=72d6068`.
  - latest fresh bundle (`autobot-feedback-20260420-083837.tgz`) shows:
    - `risk_state=CAUTION`
    - `trigger=PROFIT_GIVEBACK`
    - `activeOrders=0`
    - `sizingRejectPressure=low`
    - active global lock reason includes `No-feasible dust recovery cooldown (20m)`
    - dominant skip `Skip: No feasible candidates after policy/exposure filters` rose from `14` to `42`
    - latest rejection samples are entirely non-home quote pressure (`BTC`, `ETH`, `BNB`)
    - no-feasible recovery still attempts, but the recovery symbol (`TRXBTC`) fails on `Below minQty 1.00000000`
  - the next fresh bundle should show lower no-feasible churn and more buy-quote quarantine behavior on the exhausted non-home quote families.
- Risk slider impact:
  - no cap or fee-floor changes.
  - this slice reuses the existing `GRID_BUY_QUOTE` quarantine cooldown policy; it only activates that path from no-feasible quote-pressure evidence.
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
- Runtime validation plan:
  - deploy the current `T-031` slice and collect one fresh bundle before any further reprioritization

## 3) Deployment handoff

- Commit hash: `72d6068`
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
  - bundle interval (hours): `20.112`
  - runtime uptime (hours): `210.603`
  - run end: `Mon Apr 20 2026 11:38:35 GMT+0300 (Eastern European Summer Time)`
  - declared cycle: `MORNING_REVIEW`
  - cycle source: `auto-inferred`
- Definition of Done status:
  - fresh runtime evidence: `met` (class=fresh, staleStreak=0)
  - funding regression absent: `met` (no dominant funding regression in latest top skips)
  - active ticket runtime signal: `observed` (Skip: No feasible candidates after policy/exposure filters (42))
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=0, historyLimitOrders=81, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=59.7%)
  - sizing reject pressure: `low` (sizingRejectSkips=0, decisions=200, ratio=0.0%)
  - fresh runtime evidence: `yes` (class=fresh)
- Decision: `patch_required`
- Next ticket candidate: `T-031` (keep active lane)
- Required action: `same-ticket mitigation required before next long run`
- Open risks:
  - `pmba-gate.sh end` correctly stays red until the quote-pressure loop is reduced in a fresh post-patch bundle.
- Notes for next session:
  - bundle: `autobot-feedback-20260420-083837.tgz`
  - auto-updated at: `2026-04-20T08:39:14.924Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-031
Decision: patch_required
Required action: same-ticket mitigation required before next long run
Latest bundle: autobot-feedback-20260420-083837.tgz
Fresh runtime evidence: yes (fresh)
Goal: reduce repeated no-feasible quote-pressure loops while preserving the April 17 dust cooldown fix and T-032 downside-control support.
In scope: seed `GRID_BUY_QUOTE` quarantine from no-feasible quote-pressure evidence.
Out of scope: quote-routing redesign, reopening T-032 as active blocker, AI lane, PnL schema changes.
Validation: docker compose -f docker-compose.ci.yml run --rm ci
After patch: update docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md, docs/STRATEGY_COVERAGE.md, and docs/easy_process/*.
```
