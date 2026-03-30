# Automatic Retrospective

Last updated: 2026-03-30T08:30:12.227Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260330-082950.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `FAIL` — "Skip: No feasible candidates: daily loss caution paused new symbols (58 filtered)" (77 -> 89)
- Negative daily_net_usdt across latest 3 fresh bundles: `FAIL` — -170.99 | -299.30 | -166.45
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-170.99 | -299.30 | -166.45 ; maxDD=5.26 | 4.80 | 2.99

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `CAUTION`
- Daily net: `-170.99`
- Max drawdown: `5.26%`
- Open positions: `3`
- Total alloc pct: `0.11`

## Top skip reasons (latest bundle)

- Skip: No feasible candidates: daily loss caution paused new symbols (58 filtered) (89)
- Skip BTCUSDC: Daily loss caution paused GRID BUY leg (75)
- Skip BTCUSDC: Fee/edge filter (net 0.017% < 0.052%) (8)
- Skip BTCUSDC: Grid waiting for ladder slot or inventory (6)
- Skip BTCUSDC: Fee/edge filter (net 0.001% < 0.052%) (6)

## PM/BA automatic decision

- Decision: `pivot_required`
- Required action: `PM/BA pivot review required before next long run`

## Bundle window

- 1. `autobot-feedback-20260330-082950.tgz` — class=fresh, dailyNet=-170.99, risk=CAUTION, top=Skip: No feasible candidates: daily loss caution paused new symbols (58 filtered) (89)
- 2. `autobot-feedback-20260329-150750.tgz` — class=fresh, dailyNet=-299.30, risk=CAUTION, top=Skip: No feasible candidates: daily loss caution paused new symbols (58 filtered) (77)
- 3. `autobot-feedback-20260329-081616.tgz` — class=fresh, dailyNet=-166.45, risk=HALT, top=Skip TAOUSDC: Grid waiting for ladder slot or inventory (6)
- 4. `autobot-feedback-20260328-202730.tgz` — class=fresh, dailyNet=19.17, risk=NORMAL, top=Skip BTCUSDC: Fee/edge filter (net 0.040% < 0.052%) (15)
- 5. `autobot-feedback-20260328-084345.tgz` — class=baseline, dailyNet=-73.02, risk=CAUTION, top=Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered) (100)

