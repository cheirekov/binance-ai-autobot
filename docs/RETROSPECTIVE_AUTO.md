# Automatic Retrospective

Last updated: 2026-04-27T11:33:34.106Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260427-113318.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip XRPUSDC: Fee/edge filter (net -0.020% < 0.052%) -> Skip: No feasible candidates after policy/exposure filters
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — -0.84 | 0.55 | -0.90
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-0.84 | 0.55 | -0.90 ; maxDD=0.02 | 0.02 | 0.04

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `-0.84`
- Max drawdown: `0.02%`
- Open positions: `8`
- Total alloc pct: `9.23`

## Top skip reasons (latest bundle)

- Skip: No feasible candidates after policy/exposure filters (70)
- Skip XRPUSDC: Fee/edge filter (net 0.032% < 0.060%) (14)
- Skip XRPUSDC: Fee/edge filter (net 0.030% < 0.060%) (7)
- Skip XRPUSDC: Fee/edge filter (net 0.034% < 0.060%) (7)
- Skip BNBUSDC: Grid sell leg not actionable yet (5)

## PM/BA automatic decision

- Decision: `continue`
- Required action: `continue active ticket`

## Bundle window

- 1. `autobot-feedback-20260427-113318.tgz` — class=fresh, dailyNet=-0.84, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (70)
- 2. `autobot-feedback-20260424-082814.tgz` — class=fresh, dailyNet=0.55, risk=NORMAL, top=Skip XRPUSDC: Fee/edge filter (net -0.020% < 0.052%) (15)
- 3. `autobot-feedback-20260423-080554.tgz` — class=fresh, dailyNet=-0.90, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (65)
- 4. `autobot-feedback-20260422-100621.tgz` — class=fresh, dailyNet=-0.59, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (75)
- 5. `autobot-feedback-20260421-083942.tgz` — class=baseline, dailyNet=1.04, risk=NORMAL, top=Skip SOLUSDC: Fee/edge filter (net 0.010% < 0.052%) (15)

