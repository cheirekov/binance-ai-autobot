# Session Brief

Last updated: 2026-03-18 17:19 UTC
Owner: PM/BA + Codex

Use this file at the start and end of every batch.

## 1) Batch contract (fill before coding)

- Batch type: `SHORT (1-3h)`
- Active ticket: `T-032` (Exit manager v2)
- Goal (single sentence): keep T-032 focused on actionable symbols by reducing dual-ladder wait churn after the quote-starvation fixes.
- In scope:
  - rank HALT unwind candidates by concentration + loss severity and unwind higher-risk inventory first.
  - apply dynamic unwind fraction/cadence under HALT using risk-bounded policy.
  - add concentration-triggered partial exits before hard HALT to reduce oversized single-symbol risk.
  - keep CAUTION path progressing by evaluating managed fallback symbol when candidate selection reports no eligible managed symbols.
  - keep CAUTION managed-symbol routing limited to countable exposure (avoid dust-driven no-feasible loops).
  - de-risk SPOT_GRID execution lane under load: force DEFENSIVE in HALT/active-CAUTION inventory and prefer GRID over MARKET when managed load/exposure is high.
  - quarantine repeated `Insufficient spendable <quote> for grid BUY` skip families to rotate away from temporarily untradeable quote-liquidity conditions.
  - apply rotation cooldown for symbols that are in ladder-wait state (existing grid legs), to reduce repeated wait-loop picks.
  - trigger sizing/quote reason quarantines earlier under high-risk mode and use longer base cooldown for ladder-wait loops.
  - use trigger-aware CAUTION pause threshold (PROFIT_GIVEBACK uses halt exposure floor) in both candidate selection and execution skip paths.
  - parse runtime risk-state trigger/floor codes to keep selection behavior consistent with runtime guard context.
  - suppress re-selection of stalled grid symbols when BUY is paused with no inventory or ladder-wait repeats are already established.
  - preserve tracked open orders when some symbol-scoped live sync calls fail but others succeed.
  - suppress re-selection of managed CAUTION symbols that already have only a resting SELL limit and cannot open a BUY leg.
  - suppress re-selection of non-actionable laddered symbols even when they already have both BUY+SELL limits resting.
  - reclassify grid buy sizing rejects into quote insufficiency when spendable quote cannot fund the minimum order.
  - cover `Below minQty ...` reserve-floor rejects even when Binance omits `requiredQty`.
  - lengthen wait rotation cooldown for symbols that already have both BUY and SELL ladder legs resting.
  - suppress quote-starved candidates during active `GRID_BUY_QUOTE` quarantine when they still have no actionable missing SELL leg.
  - suppress locally repeated quote-starved candidates earlier (risk-scaled) even before global quote-family quarantine is the deciding factor.
  - suppress repeated entry-cooled candidates when they have no actionable missing SELL leg.
  - suppress quote-starved quote-asset families during active buy-quote quarantine when no sell leg is actionable.
  - keep existing daily-loss/Caution/Halt guard thresholds unchanged.
- Out of scope:
  - regime redesign (`T-031`),
  - AI lane/promotion work (`T-025+`),
  - PnL schema/reporting rewrites (`T-007` is closed),
  - multi-quote routing redesign (`T-034`),
  - endpoint/auth/UI redesign.
- Hypothesis: concentrated losers during HALT are not unwound fast enough; prioritizing them should reduce drawdown persistence and profit giveback.
- Target KPI delta:
  - reduce prolonged HALT periods with high concentration exposure.
  - increase HALT unwind effectiveness (larger reduction of highest-exposure losers per unwind cycle).
  - keep guard behavior stable (no threshold regressions).
- Stop/rollback condition:
  - if HALT/Caution transitions regress, or unwind loop causes min-order reject storms.

## 2) Definition of Done (must be concrete)

- API behavior:
  - HALT unwind picks concentrated losing inventory first, not only highest raw cost order.
  - unwind fraction/cooldown are dynamically adjusted but remain risk-bounded.
  - CAUTION mode avoids early return on `Daily loss caution: no eligible managed symbols` and continues with managed fallback symbol evaluation.
  - CAUTION managed-symbol candidate set excludes dust exposure and prefers actionable managed symbols.
  - CAUTION new-symbol pause in PROFIT_GIVEBACK mode releases once managed exposure drops below halt exposure floor (instead of base caution floor).
  - grid candidate fallback no longer repeatedly reselects clearly stalled symbols with no actionable leg.
  - live order sync tolerates partial symbol failure and only enters global backoff on full sync failure.
  - managed symbols with only a resting SELL ladder while BUY is paused are treated as stalled and rotated away.
  - symbols with resting ladder orders but no missing actionable leg are rotated away immediately during candidate selection.
  - reserve-starved BUY attempts show up as quote insufficiency / quote quarantine instead of dominating sizing-reject metrics.
  - reserve-floor `Below minQty ...` BUY rejects also flow into the quote-insufficiency path.
  - dual-ladder wait loops cool down longer than one-sided waiting ladders.
  - managed/no-buy-limit symbols already in quote-starvation quarantine are rotated away unless they still need a sell leg.
  - local repeated quote-starvation loops are reduced before family-level quarantine fully dominates a run.
  - repeated `Entry cooldown active` loops are reduced unless the symbol still needs a sell leg.
  - quote-starvation rotates away at the quote-family level, not only one symbol at a time.
- Runtime evidence in decisions/logs:
  - `daily-loss-halt-unwind` decisions include priority/exposure/loss telemetry and show accelerated handling of top losers.
  - fewer repeats of `No feasible candidates: daily loss caution paused new symbols (...)` when managed exposure sits near halt floor.
  - lower recurrence of `Grid guard paused BUY leg` / `Grid guard active (no inventory to sell)` / same-symbol ladder-wait loops.
  - lower recurrence of `Skip: Live order sync failed` / `Skip: Transient exchange backoff active`.
  - lower recurrence of `Grid waiting for ladder slot or inventory` on managed CAUTION symbols with only one SELL limit.
  - no guardrail regression from `T-005`.
- Risk slider impact:
  - risk still bounds baseline unwind policy; dynamic boosts must not bypass hard caps.
- Validation commands:
  - `docker compose -f docker-compose.ci.yml run --rm ci`
- Runtime validation plan:
  - run duration: `1-3 hours`
  - expected bundle name pattern: `autobot-feedback-YYYYMMDD-HHMMSS.tgz`

## 3) Deployment handoff

- Commit hash: `b1cd1a4`
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
  - run duration (hours): `699.219`
  - run end: `Wed Mar 18 2026 19:17:28 GMT+0200 (Eastern European Standard Time)`
  - declared cycle: `NIGHT_RUN`
  - cycle source: `auto-inferred`
- Observed KPI delta:
  - open LIMIT lifecycle observed: `yes` (openLimitOrders=0, historyLimitOrders=162, activeMarketOrders=0)
  - market-only share reduced: `yes` (historyMarketShare=19.0%)
  - sizing reject pressure: `medium` (sizingRejectSkips=20, decisions=200, ratio=10.0%)
- Decision: `continue`
- Next ticket candidate: `T-032` (continue active lane unless PM/BA reprioritizes)
- Open risks:
  - sizing reject pressure is medium (10.0%).
- Notes for next session:
  - bundle: `autobot-feedback-20260318-171743.tgz`
  - auto-updated at: `2026-03-18T17:19:26.702Z`

## 5) Copy/paste prompt for next session

```text
Ticket: T-032
Batch: SHORT (1-3h)
Goal: improve exit adaptation by prioritizing concentrated losers and reducing giveback persistence.
In scope: HALT unwind prioritization + concentration partial exits + telemetry in decisions.
Out of scope: regime redesign, PnL schema changes, AI lane, multi-quote redesign.
DoD:
- HALT unwind decisions show concentrated loser prioritization.
- T-005/T-007 behavior remains stable.
- no new dominant min-order reject loop from unwind logic.
- docker CI passes: `docker compose -f docker-compose.ci.yml run --rm ci`.
After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md.
```
