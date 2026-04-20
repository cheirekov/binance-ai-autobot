# Session Brief

Last updated: 2026-04-20 15:30 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-031` (Regime engine v2)
- Linked support ticket: `T-032` (allowed now because fresh evidence shows downside-control and candidate quality are coupled in the same runtime window)
- Goal (single sentence): stop `PROFIT_GIVEBACK` `HALT` from counting already-spent base inventory as still unwindable managed exposure.
- In scope:
  - keep `T-031` active as the strategy-quality lane.
  - take one bounded linked-support `T-032` slice inside the same batch.
  - clip daily-loss managed exposure to the portion of managed base inventory that still exists in balances.
  - preserve the April 20 quote-pressure quarantine, April 17 no-feasible dust cooldown, April 15 fee-edge quarantine, and active-order behavior.
  - preserve the April 12 linked-support `T-032` thaw that reopens candidate evaluation after near-flat `ABS_DAILY_LOSS`.
  - keep the April 13-15 residual storm mitigations in place.
  - preserve March 30-31 `T-032` downside-control behavior.
  - preserve `T-034` funding / quote-routing stability.
- Out of scope:
  - quote-routing redesign (`T-034` stays closed unless runtime regresses),
  - reopening `T-032` as the active blocker without fresh evidence beyond this bounded support slice,
  - weakening entry filters or fee-edge floors,
  - AI lane/promotion work (`T-025+`),
  - PnL schema/reporting rewrites (`T-007` is closed),
  - endpoint/auth/UI redesign.
- Hypothesis: the April 20 `T-031` quote-pressure quarantine is deployed, but the latest bundle is still trapped in `PROFIT_GIVEBACK` `HALT` because managed exposure is counted from historical managed positions rather than the base inventory still present in balances. Clipping exposure to unwindable balances should clear the false `HALT` without reopening the old quote-pressure loop.
- Target KPI delta:
  - reduce false `Skip: Daily loss HALT (profit giveback ...)` persistence when no unwindable managed base remains above the halt floor.
  - preserve the April 20 quote-pressure mitigation and avoid reopening the old April 17 freeze.
  - preserve reachable home-quote / managed sell paths.
- Stop/rollback condition:
  - if the linked-support slice weakens downside control, blocks reachable home-quote / managed sell paths, or a fresh bundle reopens the old near-flat `CAUTION` / `HALT` freeze, reopen PM/BA triage immediately.

## 2) Definition of Done (must be concrete)

- API behavior:
  - runtime behavior changes in a bounded way:
    - April 20 quote-pressure quarantine remains preserved.
    - `PROFIT_GIVEBACK` managed exposure only counts managed base inventory that still exists in balances.
    - home-quote base already spent as quote inventory elsewhere cannot keep `HALT` active by itself.
    - actionable managed sell-leg candidates and active-order cases remain outside the dust-cooldown path.
    - April 17 no-feasible dust cooldown remains preserved.
    - April 15 global fee-edge quarantine behavior remains preserved.
    - April 13-15 residual storm behavior remains preserved.
    - April 12 `ABS_DAILY_LOSS` `CAUTION` thaw remains preserved.
    - March 30-31 `T-032` caution-unwind / thaw behavior remains preserved.
  - active development lane is `T-031`; `T-032` remains preserved as a support lane in runtime.
- Runtime evidence in decisions/logs:
  - latest fresh bundle runs `git.commit=47693bb`.
  - latest fresh bundle (`autobot-feedback-20260420-145411.tgz`) shows:
    - `risk_state=HALT`
    - `trigger=PROFIT_GIVEBACK`
    - `activeOrders=0`
    - `unwind_only=true`
    - `sizingRejectPressure=low`
    - `managedExposure=9.2%`
    - `haltExposureFloor=8.0%`
    - dominant skip `Skip: No feasible candidates after policy/exposure filters` only fell from `42` to `38`
    - latest rejection samples are entirely non-home quote pressure (`BTC`, `ETH`, `BNB`)
    - no-feasible recovery still attempts, but the recovery symbol (`TRXBTC`) fails on `Below minQty 1.00000000`
    - repeated daily-loss `HALT` skips appear, but no fresh unwind trade fires
  - the next fresh bundle should show either real unwind activity or a downgrade out of false `PROFIT_GIVEBACK` `HALT` if the managed base inventory is already mostly gone.
- Risk slider impact:
  - no cap or fee-floor changes.
  - this slice does not change the daily-loss thresholds; it only corrects what counts as still unwindable managed exposure.
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
- Runtime validation plan:
  - deploy the current linked-support `T-032` slice and collect one fresh bundle before any further reprioritization

## 3) Deployment handoff

- Commit hash: `47693bb`
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
  - bundle interval (hours): `6.247`
  - runtime uptime (hours): `216.85`
  - run end: `Mon Apr 20 2026 17:53:24 GMT+0300 (Eastern European Summer Time)`
  - declared cycle: `DAY_RUN`
  - cycle source: `auto-inferred`
- Definition of Done status:
  - fresh runtime evidence: `met` (class=fresh, staleStreak=0)
  - funding regression absent: `met` (no dominant funding regression in latest top skips)
  - active ticket runtime signal: `observed` (`PROFIT_GIVEBACK` `HALT` with `Skip: No feasible candidates after policy/exposure filters` (38))
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=0, historyLimitOrders=81, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=59.7%)
  - sizing reject pressure: `low` (sizingRejectSkips=0, decisions=200, ratio=0.0%)
  - fresh runtime evidence: `yes` (class=fresh)
- Decision: `patch_required`
- Next ticket candidate: `T-031` (with linked-support `T-032` slice)
- Required action: `linked-support T-032 mitigation required before next long run`
- Open risks:
  - none critical from automated checks.
- Notes for next session:
  - bundle: `autobot-feedback-20260420-145411.tgz`
  - auto-updated at: `2026-04-20T14:57:11.863Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-031
Decision: patch_required
Required action: linked-support T-032 mitigation required before next long run
Latest bundle: autobot-feedback-20260420-145411.tgz
Fresh runtime evidence: yes (fresh)
Goal: clear false PROFIT_GIVEBACK HALT persistence while preserving the April 20 T-031 quote-pressure mitigation and T-034 funding stability.
In scope: bounded linked-support T-032 daily-loss exposure accounting fix.
Out of scope: quote-routing redesign, candidate-hygiene-only optimization, PnL schema changes, AI lane.
Validation: docker compose -f docker-compose.ci.yml run --rm ci
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
