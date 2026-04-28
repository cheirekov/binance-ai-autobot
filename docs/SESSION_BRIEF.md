# Session Brief

Last updated: 2026-04-28 10:29 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-031` (Regime engine v2)
- Linked support ticket: `T-032` (preserved only; not the current blocker)
- Goal (single sentence): unblock normal-mode home-quote candidates from stale dust sell-storm locks and stop retrying recovery dust on a minutes cadence.
- In scope:
  - keep `T-031` active as the strategy-quality lane.
  - let normal-mode, zero-active-order, dust-sized home-quote candidates bypass `GRID_SELL_NOT_ACTIONABLE` storm locks.
  - extend `NO_FEASIBLE_RECOVERY_MIN_ORDER` parking from minutes to hours.
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
- Hypothesis: the April 27 patch proved the blocker is not `T-032`, but it left two `T-031` gaps: dust min-order parking expires too quickly, and home-quote candidates can remain blocked by stale sell-storm locks even when live base exposure is below actionable minimums. Allowing that dust-storm bypass only in `NORMAL` with zero active orders should restore candidate actionability without weakening downside-control locks.
- Target KPI delta:
  - reduce repeated `Skip: No feasible candidates after policy/exposure filters` under the same BTC/ETH quote-pressure pattern.
  - stop repeated `TRXBTC` no-feasible recovery attempts on a 20-minute cadence.
  - increase reachable home-quote candidate progression when active orders are zero and risk is `NORMAL`.
  - preserve the April 20 `T-032` support fix and avoid reopening the old April 17 freeze.
  - preserve reachable home-quote / managed sell paths.
- Stop/rollback condition:
  - if the new dust-storm bypass weakens downside control, applies outside `NORMAL`, bypasses hard risk locks, or a fresh bundle reopens the old near-flat `CAUTION` / `HALT` freeze, reopen PM/BA triage immediately.

## 2) Definition of Done (must be concrete)

- API behavior:
  - runtime behavior changes in a bounded way:
    - `GRID_SELL_NOT_ACTIONABLE` storm locks do not block dust-sized home-quote candidates in `NORMAL` mode with no active orders.
    - `GRID_SELL_NOT_ACTIONABLE` storm locks still block outside that bounded case.
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
  - latest fresh bundle runs `git.commit=dde35f4`.
  - latest fresh bundle (`autobot-feedback-20260428-102858.tgz`) shows:
    - `risk_state=NORMAL`
    - `activeOrders=0`
    - `unwind_only=false`
    - `sizingRejectPressure=low`
    - dominant skip `Skip: No feasible candidates after policy/exposure filters` (`59`)
    - latest rejection samples are entirely non-home quote pressure (`BTC`, `ETH`)
    - no-feasible recovery alternates between `TRXBTC` below minQty and no eligible recovery positions
    - active home-quote sell-storm locks exist while live base balances are dust-sized
  - the next fresh bundle should show lower repeated no-feasible churn, no 20-minute `TRXBTC` dust retry loop, and at least one home-quote candidate progressing beyond stale dust sell-storm locks while risk is `NORMAL`.
- Risk slider impact:
  - no cap, fee-floor, or daily-loss threshold changes.
  - this slice extends risk-linked min-order recovery parking (`12h` at risk `0`, `6h` at risk `100`) and adds a bounded normal-mode dust-storm bypass.
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
- Runtime validation plan:
  - deploy the current `T-031` slice and collect one fresh bundle before any further reprioritization

## 3) Deployment handoff

- Commit hash: `dde35f4`
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
  - bundle interval (hours): `22.936`
  - runtime uptime (hours): `404.439`
  - run end: `Tue Apr 28 2026 13:28:43 GMT+0300 (Eastern European Summer Time)`
  - declared cycle: `DAY_RUN`
  - cycle source: `auto-inferred`
- Definition of Done status:
  - fresh runtime evidence: `met` (class=fresh, staleStreak=0)
  - funding regression absent: `met` (no dominant funding regression in latest top skips)
  - active ticket runtime signal: `observed` (Skip: No feasible candidates after policy/exposure filters (59))
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
  - bundle: `autobot-feedback-20260428-102858.tgz`
  - auto-updated at: `2026-04-28T10:29:15.243Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-031
Decision: patch_required
Required action: same-ticket mitigation required before next long run
Latest bundle: autobot-feedback-20260428-102858.tgz
Fresh runtime evidence: yes (fresh)
Goal: unblock normal-mode home-quote candidates from stale dust sell-storm locks and extend recovery min-order dust parking.
In scope: T-031 actionability under no-feasible quote-pressure loops; preserve T-032 downside-control behavior.
Out of scope: quote-routing redesign, candidate-hygiene-only optimization, PnL schema changes, AI lane.
Validation: docker compose -f docker-compose.ci.yml run --rm ci
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
