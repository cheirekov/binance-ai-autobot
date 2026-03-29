# Strategy Coverage (Source of Truth)

Last updated: 2026-03-28
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
  - current slices:
    - risk-linked regime thresholds + regime-aware fee floor
    - lane-aware candidate scoring so `SPOT_GRID` candidates are ranked by the execution lane the engine would actually use (`MARKET` / `GRID` / `DEFENSIVE`)
    - feasible live routing suppression for parked dual-ladder symbols and repeated no-inventory fee-edge dead ends
  - objective: reduce fee/edge false idling and parked-ladder churn in strong trends without weakening bear-side protection

## Support / next strategy core
- `T-032` — Exit manager v2
  - remains live in runtime, but active development is paused unless downside-control evidence becomes dominant again
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
