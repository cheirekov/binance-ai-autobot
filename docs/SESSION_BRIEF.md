# Session Brief

Last updated: 2026-04-15 16:55 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-031` (Regime engine v2)
- Linked support ticket: `T-032` (allowed only when fresh evidence shows downside-control and candidate quality are coupled in the same runtime window)
- Goal (single sentence): make active global `FEE_EDGE` quarantine authoritative for fresh non-home-quote grid candidates so cross-quote fee-edge churn stops rotating around symbol-local history.
- In scope:
  - keep `T-031` active as the strategy-quality lane.
  - suppress fresh non-home-quote grid candidates while global `FEE_EDGE` quarantine is active and no sell leg is actionable.
  - preserve home-quote candidates and managed sell-leg candidates.
  - keep undersized sell legs non-actionable before runtime attempts another grid sell ladder.
  - preserve the April 12 linked-support `T-032` thaw that reopens candidate evaluation after near-flat `ABS_DAILY_LOSS`.
  - keep the April 13-15 residual storm mitigations in place.
  - preserve March 30-31 `T-032` downside-control behavior.
  - preserve `T-034` funding / quote-routing stability.
- Out of scope:
  - quote-routing redesign (`T-034` stays closed unless runtime regresses),
  - reopening `T-032` as the active blocker without fresh evidence,
  - weakening the fee-edge floor,
  - AI lane/promotion work (`T-025+`),
  - PnL schema/reporting rewrites (`T-007` is closed),
  - endpoint/auth/UI redesign.
- Hypothesis: the April 15 morning patch moved the blocker away from residual storm-lock bypassing, but latest evidence shows global `FEE_EDGE` quarantine is still too symbol-local. Suppressing fresh non-home-quote candidates under an active global fee-edge quarantine should reduce `XRPETH` / `BNBETH` / `TRXETH` churn without blocking home-quote opportunities or actionable sells.
- Target KPI delta:
  - reduce repeated non-home-quote `Fee/edge filter` skips across fresh symbols while global `FEE_EDGE` quarantine is active.
  - preserve the absence of the older `No feasible candidates after policy/exposure filters` deadlock.
  - preserve low sizing reject pressure and preserve reachable `daily-loss-caution-unwind` / `daily-loss-halt-unwind` behavior.
- Stop/rollback condition:
  - if global fee-edge quarantine suppression restores the old `No feasible candidates after policy/exposure filters` deadlock, blocks actionable managed sell legs, or weakens `daily-loss-halt-unwind` reachability, freeze `T-031` and revisit the candidate-quality rules.

## 2) Definition of Done (must be concrete)

- API behavior:
  - runtime behavior changes in a bounded way:
    - active global `FEE_EDGE` quarantine suppresses fresh non-home-quote grid candidates with no actionable sell leg.
    - home-quote grid candidates remain governed by local fee-edge history rather than the cross-quote family lock alone.
    - sell-leg feasibility is assessed before fee-edge quarantine can suppress managed inventory candidates.
    - undersized sell legs remain `Grid sell leg not actionable yet` instead of repeatedly failing on exchange minimums.
    - April 13-15 residual storm behavior remains preserved.
    - April 12 `ABS_DAILY_LOSS` `CAUTION` thaw remains preserved.
    - March 30-31 `T-032` caution-unwind / thaw behavior remains preserved.
  - active development lane is `T-031`; `T-032` remains preserved as a support lane in runtime.
- Runtime evidence in decisions/logs:
  - latest fresh bundle runs `git.commit=a1ab7c0`.
  - latest fresh bundle (`autobot-feedback-20260415-164608.tgz`) shows:
    - `risk_state=NORMAL`
    - `activeOrders=0`
    - `sizingRejectPressure=low`
    - active global `REASON_QUARANTINE:FEE_EDGE`
    - dominant cross-quote fee-edge skips on `XRPETH`, `BNBETH`, `TRXETH`, `LTCETH`, and related non-home-quote symbols.
  - the next fresh bundle should show lower cross-quote fee-edge rotation without blocking the preserved `T-032` support path.
- Risk slider impact:
  - risk slider still modulates quarantine thresholds/cooldowns and lane thresholds; this slice only makes active global fee-edge quarantine effective across fresh non-home-quote candidates.
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
- Runtime validation plan:
  - deploy the current `T-031` slice and collect one fresh bundle before any further reprioritization

## 3) Deployment handoff

- Commit hash: local patch over `a1ab7c0` (commit after validation)
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
  - bundle interval (hours): `9.276`
  - runtime uptime (hours): `98.722`
  - run end: `Wed Apr 15 2026 19:45:43 GMT+0300 (Eastern European Summer Time)`
  - declared cycle: `NIGHT_RUN`
  - cycle source: `auto-inferred`
- Definition of Done status:
  - fresh runtime evidence: `met` (class=fresh, staleStreak=0)
  - funding regression absent: `met` (no dominant funding regression in latest top skips)
  - active ticket runtime signal: `observed` (Skip XRPETH: Fee/edge filter (net -0.075% < 0.052%) (12))
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=0, historyLimitOrders=93, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=54.0%)
  - sizing reject pressure: `low` (sizingRejectSkips=0, decisions=200, ratio=0.0%)
  - fresh runtime evidence: `yes` (class=fresh)
- Decision: `patch_required`
- Next ticket candidate: `T-031` (continue active lane unless PM/BA reprioritizes)
- Required action: `same-ticket mitigation required before next long run`
- Open risks:
  - none critical from automated checks.
- Notes for next session:
  - bundle: `autobot-feedback-20260415-164608.tgz`
  - auto-updated at: `2026-04-15T16:46:20.952Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-031
Decision: patch_required
Required action: same-ticket mitigation required before next long run
Latest bundle: autobot-feedback-20260415-164608.tgz
Fresh runtime evidence: yes (fresh)
Goal: reduce cross-quote fee-edge churn while preserving T-034 funding stability and T-032 support behavior.
In scope: T-031 candidate-quality routing for active global fee-edge quarantine.
Out of scope: quote-routing redesign, candidate-hygiene-only optimization, PnL schema changes, AI lane.
Validation: docker compose -f docker-compose.ci.yml run --rm ci
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
