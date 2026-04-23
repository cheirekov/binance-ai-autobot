# Session Brief

Last updated: 2026-04-23 08:45 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-031` (Regime engine v2)
- Linked support ticket: `T-032` (preserved only; not the current blocker)
- Goal (single sentence): make active `GRID_BUY_QUOTE` quarantine suppress fresh non-home quote families during repeated no-feasible quote-pressure loops.
- In scope:
  - keep `T-031` active as the strategy-quality lane.
  - make active `GRID_BUY_QUOTE` quarantine effective on fresh non-home quote families with no actionable sell leg.
  - preserve the April 20 linked-support `T-032` exposure fix.
  - preserve the April 20 quote-pressure quarantine, April 17 no-feasible dust cooldown, April 15 fee-edge quarantine, and active-order behavior.
  - keep the April 13-15 residual storm mitigations in place.
  - preserve April 12 and March 30-31 `T-032` downside-control behavior.
  - preserve `T-034` funding / quote-routing stability.
- Out of scope:
  - quote-routing redesign (`T-034` stays closed unless runtime regresses),
  - reopening `T-032` as the active blocker without fresh evidence,
  - weakening entry filters or fee-edge floors,
  - AI lane/promotion work (`T-025+`),
  - PnL schema/reporting rewrites (`T-007` is closed),
  - endpoint/auth/UI redesign.
- Hypothesis: the April 20 `GRID_BUY_QUOTE` quarantine is being seeded from no-feasible evidence, but fresh non-home quote families still bypass it because quote-asset suppression currently needs local quote-insufficient history. Making the global lock effective for fresh non-home quote families should reduce the repeated no-feasible loop without reopening `T-032`.
- Target KPI delta:
  - reduce repeated `Skip: No feasible candidates after policy/exposure filters` under the same BTC/ETH quote-pressure pattern.
  - preserve the April 20 `T-032` support fix and avoid reopening the old April 17 freeze.
  - preserve reachable home-quote / managed sell paths.
- Stop/rollback condition:
  - if the new suppression weakens downside control, blocks reachable home-quote / managed sell paths, or a fresh bundle reopens the old near-flat `CAUTION` / `HALT` freeze, reopen PM/BA triage immediately.

## 2) Definition of Done (must be concrete)

- API behavior:
  - runtime behavior changes in a bounded way:
    - active `GRID_BUY_QUOTE` quarantine suppresses fresh non-home quote families when no sell leg is actionable, even with zero local quote-insufficient history.
    - home-quote / actionable sell-leg candidates remain outside that suppression path.
    - April 20 linked-support `T-032` exposure fix remains preserved.
    - April 17 no-feasible dust cooldown remains preserved.
    - April 15 global fee-edge quarantine behavior remains preserved.
    - April 13-15 residual storm behavior remains preserved.
    - April 12 `ABS_DAILY_LOSS` `CAUTION` thaw remains preserved.
    - March 30-31 `T-032` caution-unwind / thaw behavior remains preserved.
  - active development lane is `T-031`; `T-032` remains preserved as a support lane in runtime.
- Runtime evidence in decisions/logs:
  - latest fresh bundle runs `git.commit=530fcfa`.
  - latest fresh bundle (`autobot-feedback-20260423-080554.tgz`) shows:
    - `risk_state=NORMAL`
    - `activeOrders=0`
    - `unwind_only=false`
    - `sizingRejectPressure=low`
    - dominant skip `Skip: No feasible candidates after policy/exposure filters` repeated across the last two fresh bundles (`75 -> 65`)
    - latest rejection samples are entirely non-home quote pressure (`BTC`, `ETH`)
    - no-feasible recovery still attempts, but the recovery symbol (`TRXBTC`) fails on `Below minQty 1.00000000`
    - no new fills or orders landed across the repeated-loop pair
  - the next fresh bundle should show lower repeated no-feasible churn and more home-quote / actionable-sell candidate reachability.
- Risk slider impact:
  - no cap or fee-floor changes.
  - this slice only makes the existing global `GRID_BUY_QUOTE` quarantine effective on fresh non-home quote families.
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
- Runtime validation plan:
  - deploy the current `T-031` slice and collect one fresh bundle before any further reprioritization

## 3) Deployment handoff

- Commit hash: `530fcfa`
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
  - bundle interval (hours): `22.005`
  - runtime uptime (hours): `282.058`
  - run end: `Thu Apr 23 2026 11:05:50 GMT+0300 (Eastern European Summer Time)`
  - declared cycle: `MORNING_REVIEW`
  - cycle source: `auto-inferred`
- Definition of Done status:
  - fresh runtime evidence: `met` (class=fresh, staleStreak=0)
  - funding regression absent: `met` (no dominant funding regression in latest top skips)
  - active ticket runtime signal: `observed` (Skip: No feasible candidates after policy/exposure filters (65))
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=0, historyLimitOrders=81, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=59.7%)
  - sizing reject pressure: `low` (sizingRejectSkips=0, decisions=200, ratio=0.0%)
  - fresh runtime evidence: `yes` (class=fresh)
- Decision: `patch_required`
- Next ticket candidate: `T-031` (continue active lane unless PM/BA reprioritizes)
- Required action: `same-ticket mitigation required before next long run`
- Open risks:
  - none critical from automated checks.
- Notes for next session:
  - bundle: `autobot-feedback-20260423-080554.tgz`
  - auto-updated at: `2026-04-23T08:06:04.681Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-031
Decision: patch_required
Required action: same-ticket mitigation required before next long run
Latest bundle: autobot-feedback-20260423-080554.tgz
Fresh runtime evidence: yes (fresh)
Goal: reduce repeated no-feasible quote-pressure loops while preserving the proven April 20 T-032 fix and T-034 funding stability.
In scope: T-031 quote-quarantine effectiveness patch.
Out of scope: quote-routing redesign, candidate-hygiene-only optimization, PnL schema changes, AI lane.
Validation: docker compose -f docker-compose.ci.yml run --rm ci
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
