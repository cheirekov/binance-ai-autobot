# Session Brief

Last updated: 2026-04-17 17:15 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-031` (Regime engine v2)
- Linked support ticket: `T-032` (allowed only when fresh evidence shows downside-control and candidate quality are coupled in the same runtime window)
- Goal (single sentence): park the near-flat `PROFIT_GIVEBACK` no-feasible recovery loop when the fallback recovery trade itself is below exchange minimums, without weakening live sell / unwind paths.
- In scope:
  - keep `T-031` active as the strategy-quality lane.
  - add a bounded global cooldown for near-flat `PROFIT_GIVEBACK` `CAUTION` books when no-feasible recovery is firing but only failing on `minNotional` / `minQty`.
  - preserve managed sell-leg candidates, home-quote recovery paths, and active-order behavior.
  - keep undersized sell legs non-actionable before runtime attempts another impossible grid sell ladder.
  - preserve the April 15 global fee-edge quarantine slice.
  - preserve the April 12 linked-support `T-032` thaw that reopens candidate evaluation after near-flat `ABS_DAILY_LOSS`.
  - keep the April 13-15 residual storm mitigations in place.
  - preserve March 30-31 `T-032` downside-control behavior.
  - preserve `T-034` funding / quote-routing stability.
- Out of scope:
  - quote-routing redesign (`T-034` stays closed unless runtime regresses),
  - reopening `T-032` as the active blocker without fresh evidence,
  - weakening entry filters or fee-edge floors,
  - AI lane/promotion work (`T-025+`),
  - PnL schema/reporting rewrites (`T-007` is closed),
  - endpoint/auth/UI redesign.
- Hypothesis: latest evidence shows the engine is near-flat in `PROFIT_GIVEBACK` `CAUTION`, no active orders remain, and the no-feasible recovery path is already firing but failing on exchange minimums. Parking that dust-only recovery loop with a bounded global cooldown should reduce repeated `No feasible candidates after policy/exposure filters` churn without blocking actionable sells or reopening the older `ABS_DAILY_LOSS` freeze.
- Target KPI delta:
  - reduce repeated `No feasible candidates after policy/exposure filters` skips when recovery can only fail on dust exchange minimums.
  - reduce repeated residual `Grid sell leg not actionable yet` churn that follows the same failed dust recovery attempt.
  - preserve low sizing reject pressure and preserve reachable `daily-loss-caution-unwind` / `daily-loss-halt-unwind` behavior.
- Stop/rollback condition:
  - if the new cooldown blocks actionable managed sell legs, hides real recovery opportunities, or weakens `daily-loss-caution-unwind` / `daily-loss-halt-unwind` reachability, freeze `T-031` and revisit recovery ranking instead of cooldown policy.

## 2) Definition of Done (must be concrete)

- API behavior:
  - runtime behavior changes in a bounded way:
    - near-flat `PROFIT_GIVEBACK` `CAUTION` books with `activeOrders=0` can park a no-feasible dust recovery loop behind a bounded global cooldown when the attempted recovery fails only on exchange minimums.
    - actionable managed sell-leg candidates and active-order cases remain outside this cooldown path.
    - undersized sell legs remain `Grid sell leg not actionable yet` instead of repeatedly failing on exchange minimums.
    - April 15 global fee-edge quarantine behavior remains preserved.
    - April 13-15 residual storm behavior remains preserved.
    - April 12 `ABS_DAILY_LOSS` `CAUTION` thaw remains preserved.
    - March 30-31 `T-032` caution-unwind / thaw behavior remains preserved.
  - active development lane is `T-031`; `T-032` remains preserved as a support lane in runtime.
- Runtime evidence in decisions/logs:
  - latest fresh bundle runs `git.commit=1a6f4cb`.
  - latest fresh bundle (`autobot-feedback-20260417-164018.tgz`) shows:
    - `risk_state=CAUTION`
    - `trigger=PROFIT_GIVEBACK`
    - `activeOrders=0`
    - `sizingRejectPressure=low`
    - dominant skip `Skip: No feasible candidates after policy/exposure filters` (`61`)
    - no-feasible rejection samples dominated by non-home-quote reserve exhaustion (`BTC` / `ETH` / `BNB`)
    - recovery attempt already fires, but the attempted fallback symbol (`BIOUSDC`) fails on `Below minNotional 5.00000000 ...`
  - the next fresh bundle should show lower no-feasible churn and either a visible `NO_FEASIBLE_DUST_RECOVERY` cooldown or resumed candidate rotation without blocking the preserved `T-032` support path.
- Risk slider impact:
  - risk slider still modulates quarantine thresholds/cooldowns and lane thresholds; this slice adds only a bounded no-feasible dust cooldown (`45m -> 20m`) for the near-flat `PROFIT_GIVEBACK` recovery case.
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
- Runtime validation plan:
  - deploy the current `T-031` slice and collect one fresh bundle before any further reprioritization

## 3) Deployment handoff

- Commit hash: `working tree after 1a6f4cb` (commit required before deploy)
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
  - bundle interval (hours): `9.005`
  - runtime uptime (hours): `146.628`
  - run end: `Fri Apr 17 2026 19:40:05 GMT+0300 (Eastern European Summer Time)`
  - declared cycle: `NIGHT_RUN`
  - cycle source: `auto-inferred`
- Definition of Done status:
  - fresh runtime evidence: `met` (class=fresh, staleStreak=0)
  - funding regression absent: `met` (no dominant funding regression in latest top skips)
  - active ticket runtime signal: `observed` (near-flat `PROFIT_GIVEBACK` no-feasible loop with recovery failing on exchange minimums)
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=0, historyLimitOrders=116, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=42.0%)
  - sizing reject pressure: `low` (sizingRejectSkips=0, decisions=200, ratio=0.0%)
  - fresh runtime evidence: `yes` (class=fresh)
  - dominant loop shift confirmed: `yes` (April 15 fee-edge churn is gone; new blocker is no-feasible dust recovery)
- Decision: `patch_required`
- Next ticket candidate: `T-031` (continue active lane unless PM/BA reprioritizes)
- Required action: `same-ticket mitigation landed; commit/deploy before next long run`
- Open risks:
  - `./scripts/pmba-gate.sh end` still reflects the two repeated pre-deploy bundles, so the end gate stays red until one fresh post-deploy bundle replaces that evidence.
  - if the near-flat book still has no feasible home-quote recovery after the new cooldown expires, the next slice should improve recovery ranking rather than lengthening cooldown again.
- Notes for next session:
  - bundle: `autobot-feedback-20260417-164018.tgz`
  - auto-updated at: `2026-04-17T16:40:30.017Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-031
Decision: patch_required
Required action: same-ticket mitigation landed; commit/deploy before next long run
Latest bundle: autobot-feedback-20260417-164018.tgz
Fresh runtime evidence: yes (fresh)
Goal: reduce near-flat `PROFIT_GIVEBACK` no-feasible churn while preserving T-032 downside-control support and T-034 funding stability.
In scope: bounded no-feasible dust recovery cooldown behavior under near-flat `PROFIT_GIVEBACK` `CAUTION`.
Out of scope: quote-routing redesign, fee-floor weakening, AI lane, PnL schema changes.
Validation: docker compose -f docker-compose.ci.yml run --rm ci
After patch: update docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md, docs/STRATEGY_COVERAGE.md, and docs/easy_process/*.
```
