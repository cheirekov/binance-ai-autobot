# Strategy Coverage (Source of Truth)

Last updated: 2026-04-27
Owner: PM/BA + Trader + Architect

Purpose: prevent strategy drift/context loss by keeping one explicit list of:
- what is already implemented,
- what is planned,
- which ticket owns each strategy step.

Hard rule:
- Any patch that changes strategy behavior must update this file and `docs/PM_BA_CHANGELOG.md`.

---

## 1) Current live strategy lanes (implemented)

These are execution behaviors currently active in runtime:

1. `SPOT` market-entry lane
   - market buy/sell entries with exchange filter checks
   - ticket lineage: baseline + stabilization (`T-029` follow-ups)

2. `SPOT_GRID` ladder lane
   - limit ladder buy/sell placement
   - stale order cleanup, cooldown/lock handling, guard-aware gating
   - ticket lineage: baseline + `T-029`, now improving under `T-030`

3. Risk guardrails
   - daily loss state (`NORMAL/CAUTION/HALT`), unwind-only behavior
   - ticket lineage: `T-005`

4. Wallet policy
   - unmanaged exposure controls, selective sweep/cleanup behavior
   - ticket lineage: `T-029`

5. PnL/telemetry reporting
   - fee-aware summary math, bounded drawdown, executed-trade count consistency
   - ticket lineage: `T-007` (DONE)

6. Adaptive regime routing (partial live)
   - risk-linked regime classification and execution-lane selection
   - first strategy-quality slice now active under `T-031`

---

## 2) Strategy sources we track

### A) Binance-native bot families (product parity target)
- Spot grid
- Spot DCA
- Rebalancing
- Spot algo execution (TWAP / volume-based execution where API support allows)

### B) Reference repos in `references/`
- `freqtrade-develop`
- `freqtrade-strategies-main`
- `crypto-trading-open-main`
- `NostalgiaForInfinity-main`
- `Gekko-Strategies-master`
- `CryptoCurrencyTrader-master`
- `Crypto-Signal-master`
- internal historical refs (`binance-ai-bot-24`, `binance-ai-bot-1`)

### C) Online research lane
- Used only for ideas/patterns, then mapped into owned tickets.
- No direct copy of restricted code/licenses.

---

## 3) Ticket ownership map for strategy evolution

## Active now
- `T-031` — Regime engine v2
  - live slices:
    - risk-linked regime thresholds + regime-aware fee floor
    - lane-aware candidate scoring
    - feasible live routing suppression for parked dual-ladder symbols and repeated no-inventory fee-edge dead ends
    - fee-edge bypass for already-open managed symbols when defensive / daily-loss handling needs to stay reachable
    - current April 1 slice: guarded sell-ladder cooldown for paused grid symbols so cross-quote pairs do not churn while only the sell leg is parked
    - current April 2 slice: undersized managed sell legs are treated as non-actionable and cooled down before runtime can retry impossible grid sell ladders
    - current April 2 day slice: home-quote dust residuals in `GRID_SELL_NOT_ACTIONABLE` cooldown are allowed back into selection once they are effectively flat and orderless
    - current April 2 evening slice: the same bounded dust-cooldown exception is now applied at the post-selection execution gate so cooled home-quote candidates are not re-blocked immediately after selection
    - current April 7 slice: the dust-cooldown exception is revoked again after repeated paired `Grid sell leg not actionable yet` + `Grid guard paused BUY leg` loops so one residual symbol cannot consume the whole decision window
    - current April 7 evening slice: the same cooldown is also re-applied after a higher threshold of repeated solo `Grid sell leg not actionable yet` retries on the same home-quote dust residual
    - current April 9 slice: the longer retry cooldown now re-applies for repeated paired residual dead-end loops too, so a small family of home-quote dust symbols stays parked longer after cooldown expiry
    - current April 10 slice: the solo residual-loop lookback is longer, so a steady every-15-minute dust loop can actually trigger the longer retry cooldown instead of repeating forever
    - current April 13 slice: repeated `Grid sell leg not actionable yet` skips now share a family-level storm key, so residual dust churn across multiple home-quote symbols can trigger a longer retry cooldown instead of just rotating
    - current April 14 slice: the family-level dust storm now uses a wider lookback, a lower trigger threshold, and a longer cooldown so slower multi-symbol residual rotation is parked longer instead of re-entering every 15-30 minutes
    - current April 15 slice: the first-pass dust-cooldown bypass now honors active skip-storm locks, so symbols already parked by `Grid sell leg not actionable yet` storm protection are not immediately reselected
    - current April 15 evening slice: global `FEE_EDGE` quarantine now suppresses fresh non-home-quote grid candidates with no actionable sell leg, so cross-quote fee-edge churn cannot rotate around symbol-local history
    - current April 17 slice: near-flat `PROFIT_GIVEBACK` no-feasible recovery attempts that fail only on exchange minimums now trigger a bounded global cooldown when active orders are already gone, so the engine stops hammering the same dust-only recovery loop every tick
    - current April 20 slice: repeated no-feasible loops driven entirely by non-home quote pressure now seed global `GRID_BUY_QUOTE` quarantine when the recovery attempt also fails on exchange minimums, so quote-starved cross-quote families stop re-entering selection through the no-feasible path
    - current April 23 slice: active `GRID_BUY_QUOTE` quarantine now also suppresses fresh non-home quote families with no actionable sell leg even when they do not yet have local quote-insufficient skip history, so the global lock is effective against repeated no-feasible quote-pressure loops
    - current April 27 slice: no-feasible recovery SELL validation now bypasses only soft buy/quote/grid-wait symbol locks, ranks home-stable managed sells first, and parks below-minimum recovery dust under `NO_FEASIBLE_RECOVERY_MIN_ORDER` so recovery does not keep reselecting the same unsellable residual
  - objective: improve candidate quality and rotation under real market regimes without reopening `T-032` or `T-034`

## Support / next strategy core
- `T-032` — Exit manager v2
  - preserved live in runtime:
    - early downside-control / defensive unwind behavior remains live
    - March 30 slice: thaw `CAUTION` new-symbol pause once `ABS_DAILY_LOSS` has already de-risked the book to near-flat exposure/order state
    - March 31 slice: stop-loss-cooled residual positions no longer anchor global `CAUTION` new-symbol pause once active orders are gone
    - April 12 linked-support slice: near-flat residual managed positions no longer keep `ABS_DAILY_LOSS` `CAUTION` frozen once active orders are gone
    - current April 20 linked-support slice: `PROFIT_GIVEBACK` `HALT` now clips managed exposure to base inventory that still exists in balances, so home-quote exposure already spent as quote inventory elsewhere cannot keep downside-control frozen by itself
  - reopen only if downside-control policy becomes the dominant blocker again
- `T-034` — Multi-quote execution policy v1
  - DONE; preserve funding/routing stability while `T-031` evolves strategy quality

## Learning / adaptation lane
- `T-026` — Offline calibration runner
- `T-025` — Adaptive confidence shadow model
- `T-035`/`T-036`/`T-037`/`T-038` — news/event AI action lane with promotion gates

---

## 4) Promotion process (mandatory)

A strategy slice is considered promoted only when all pass:
1. Docker CI pass.
2. 1–3h run evidence (bundle).
3. Night run evidence (bundle).
4. No dominant repeated loop reason across 2 bundles (or triage note + explicit pivot).
5. PM/BA changelog entry with risk-slider impact and KPI delta.

---

## 5) Current non-goals (to avoid scope leak)

- Futures/options execution lanes are not active in current scope.
- AI does not directly execute orders yet (shadow-first rule).
- Strategy tuning is not done by ad-hoc per-symbol hardcoding.

---

## 6) Market-condition handling rule (professional process)

- We do **not** wait for a specific market to implement strategy logic.
- We implement adaptive logic as market-agnostic rules (regime/volatility/exposure aware), then validate with:
  1. short run (1–3h),
  2. night run,
  3. at least one additional bundle from a different regime shape when available.
- Any patch tuned only to “current market mood” is rejected at PM/BA review.
