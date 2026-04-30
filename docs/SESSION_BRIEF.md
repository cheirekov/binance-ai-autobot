# Session Brief

Last updated: 2026-04-30 08:45 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-031` (Regime engine v2)
- Linked support ticket: `T-032` (preserved only; not the current blocker)
- Goal (single sentence): stop dust/zero SELL legs from blocking reachable grid BUY progression in normal-mode T-031 runtime.
- In scope:
  - keep `T-031` active as the strategy-quality lane.
  - treat home-quote dust below risk-linked countable exposure as non-actionable inventory.
  - rotate away from grid-guarded or bear-paused symbols when live inventory cannot place an actionable sell.
  - allow grid BUY placement to proceed when the only missing SELL leg is dust-sized or zero and the BUY leg is otherwise actionable.
  - preserve the April 28 `GRID_SELL_NOT_ACTIONABLE` storm-lock bypass and multi-hour `NO_FEASIBLE_RECOVERY_MIN_ORDER` parking.
  - preserve no-feasible recovery SELL validation lock bypass and home-stable recovery ranking from the April 27 slice.
  - preserve the April 20 linked-support `T-032` exposure fix.
  - preserve the April 23 buy-quote quarantine, April 20 quote-pressure quarantine, April 17 no-feasible dust cooldown, April 15 fee-edge quarantine, and active-order behavior.
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
- Hypothesis: the April 28 slice cleared the generic no-feasible loop, but exposed a concrete T-031 actionability defect: stale managed inventory and dust/zero live balances make the grid executor return on an impossible SELL leg before a reachable BUY leg can be placed. Separating actionable inventory from dust should restore progression without weakening downside-control locks.
- Target KPI delta:
  - reduce repeated `Skip BTCUSDC: Grid sell leg not actionable yet` under dust/zero live inventory.
  - route grid-guarded dust symbols away from feasible-live selection when they cannot buy or sell.
  - increase reachable grid BUY progression when active orders are zero and risk is `NORMAL`.
  - preserve the April 20 `T-032` support fix and avoid reopening the old April 17 freeze.
  - preserve reachable home-quote / managed sell paths.
- Stop/rollback condition:
  - if the dust BUY-progression change weakens downside control, ignores a hard risk lock, buys while `CAUTION/HALT` requires no new risk, or reopens the old no-feasible quote-pressure loop, reopen PM/BA triage immediately.

## 2) Definition of Done (must be concrete)

- API behavior:
  - runtime behavior changes in a bounded way:
    - home-quote dust below the risk-linked countable-exposure floor is not treated as actionable inventory.
    - feasible-live routing skips buy-paused symbols with no actionable live sell inventory.
    - dust/zero SELL legs do not block reachable grid BUY legs.
    - `GRID_SELL_NOT_ACTIONABLE` storm-lock behavior from April 28 remains preserved.
    - below-minimum recovery sell candidates receive a multi-hour symbol-level `NO_FEASIBLE_RECOVERY_MIN_ORDER` cooldown.
    - home-quote / actionable sell-leg candidates remain reachable.
    - April 20 linked-support `T-032` exposure fix remains preserved.
    - April 17 no-feasible dust cooldown remains preserved.
    - April 15 global fee-edge quarantine behavior remains preserved.
    - April 13-15 residual storm behavior remains preserved.
    - April 12 `ABS_DAILY_LOSS` `CAUTION` thaw remains preserved.
    - March 30-31 `T-032` caution-unwind / thaw behavior remains preserved.
  - active development lane is `T-031`; `T-032` remains preserved as a support lane in runtime.
- Runtime evidence in decisions/logs:
  - latest fresh bundle runs `git.commit=1efbdae`.
  - latest fresh bundle (`autobot-feedback-20260430-081918.tgz`) shows:
    - `risk_state=NORMAL`
    - `activeOrders=0`
    - `unwind_only=false`
    - `sizingRejectPressure=low`
    - dominant skip `Skip BTCUSDC: Grid sell leg not actionable yet` (`86`)
    - `BTCUSDC` live base free is below exchange `minQty`
    - `PENGUUSDC` has zero base inventory yet still produced sell-leg-not-actionable skips
  - the next fresh bundle should show lower repeated dust sell-leg churn and either active grid orders or a different first concrete blocker such as fee/edge or quote spendability.
- Risk slider impact:
  - no cap, fee-floor, or daily-loss threshold changes.
  - this slice reuses the existing risk-linked minimum countable exposure (`10 -> 5` home value) to distinguish actionable inventory from dust.
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
- Runtime validation plan:
  - deploy the current `T-031` slice and collect one fresh bundle before any further reprioritization

## 3) Deployment handoff

- Commit hash: `pending local patch after 1efbdae`
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
  - bundle interval (hours): `20.198`
  - runtime uptime (hours): `450.281`
  - run end: `Thu Apr 30 2026 11:19:14 GMT+0300 (Eastern European Summer Time)`
  - declared cycle: `MORNING_REVIEW`
  - cycle source: `auto-inferred`
- Definition of Done status:
  - fresh runtime evidence: `met` (class=fresh, staleStreak=0)
  - funding regression absent: `met` (no dominant funding regression in latest top skips)
  - active ticket runtime signal: `observed` (Skip BTCUSDC: Grid sell leg not actionable yet (86))
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=0, historyLimitOrders=81, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=59.7%)
  - sizing reject pressure: `low` (sizingRejectSkips=0, decisions=200, ratio=0.0%)
  - fresh runtime evidence: `yes` (class=fresh)
- Decision: `patch_ready`
- Next ticket candidate: `T-031` (continue active lane unless PM/BA reprioritizes)
- Required action: `deploy same-ticket T-031 mitigation and collect one 1-3h bundle`
- Open risks:
  - next bundle must prove the dust sell-leg loop no longer dominates and show either active orders or the next concrete blocker.
- Notes for next session:
  - bundle: `autobot-feedback-20260430-081918.tgz`
  - auto-updated at: `2026-04-30T08:21:10.530Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-031
Decision: patch_ready
Required action: deploy same-ticket T-031 mitigation and collect one 1-3h bundle
Latest bundle: autobot-feedback-20260430-081918.tgz
Fresh runtime evidence: yes (fresh)
Goal: stop dust/zero grid SELL legs from blocking reachable BUY progression while preserving T-032/T-034 safety.
In scope: T-031 candidate/actionability logic for dust inventory and grid buy progression.
Out of scope: quote-routing redesign, PnL schema changes, AI lane, fee-floor weakening.
Validation: docker compose -f docker-compose.ci.yml run --rm ci
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
