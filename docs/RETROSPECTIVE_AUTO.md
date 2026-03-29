# Automatic Retrospective

Last updated: 2026-03-29T08:16:46.141Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260329-081616.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip BTCUSDC: Fee/edge filter (net 0.040% < 0.052%) -> Skip TAOUSDC: Grid waiting for ladder slot or inventory
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — -166.45 | 19.17 | -73.02
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-166.45 | 19.17 | -73.02 ; maxDD=2.99 | 0.97 | 3.17

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `HALT`
- Daily net: `-166.45`
- Max drawdown: `2.99%`
- Open positions: `5`
- Total alloc pct: `18.48`

## Top skip reasons (latest bundle)

- Skip TAOUSDC: Grid waiting for ladder slot or inventory (6)
- Skip ETHUSDC: Grid waiting for ladder slot or inventory (6)
- Skip BTCUSDC: Grid waiting for ladder slot or inventory (6)
- Skip NOMUSDC: Grid sell sizing rejected (Below minQty 1.00000000) (5)
- Skip SOLUSDC: Fee/edge filter (net 0.006% < 0.052%) (5)

## PM/BA automatic decision

- Decision: `continue`
- Required action: `continue active ticket`

## Bundle window

- 1. `autobot-feedback-20260329-081616.tgz` — class=fresh, dailyNet=-166.45, risk=HALT, top=Skip TAOUSDC: Grid waiting for ladder slot or inventory (6)
- 2. `autobot-feedback-20260328-202730.tgz` — class=fresh, dailyNet=19.17, risk=NORMAL, top=Skip BTCUSDC: Fee/edge filter (net 0.040% < 0.052%) (15)
- 3. `autobot-feedback-20260328-084345.tgz` — class=fresh, dailyNet=-73.02, risk=CAUTION, top=Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered) (100)
- 4. `autobot-feedback-20260327-155408.tgz` — class=fresh, dailyNet=-82.40, risk=CAUTION, top=Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered) (20)
- 5. `autobot-feedback-20260327-123604.tgz` — class=baseline, dailyNet=-103.86, risk=CAUTION, top=Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered) (48)

