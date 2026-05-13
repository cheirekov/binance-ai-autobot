# Automatic Retrospective

Last updated: 2026-05-13T08:51:17.595Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260513-085101.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip SUIUSDC: Grid waiting for ladder slot or inventory -> Skip SAGAUSDC: Grid sell leg not actionable yet
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — -33.81 | 3.89 | -49.72
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-33.81 | 3.89 | -49.72 ; maxDD=3.49 | 4.41 | 4.90
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `CAUTION`
- Daily net: `-33.81`
- Max drawdown: `3.49%`
- Open positions: `8`
- Total alloc pct: `0.27`

## Top skip reasons (latest bundle)

- Skip SAGAUSDC: Grid sell leg not actionable yet (47)
- Skip SAGAUSDC: Daily loss caution paused GRID BUY leg (47)
- Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered) (17)
- Skip SOLUSDC: Daily loss caution paused GRID BUY leg (9)
- Skip: No feasible candidates: daily loss caution paused new symbols (58 filtered) (5)

## PM/BA automatic decision

- Decision: `continue`
- Required action: `continue active ticket`

## Bundle window

- 1. `autobot-feedback-20260513-085101.tgz` — class=fresh, dailyNet=-33.81, risk=CAUTION, top=Skip SAGAUSDC: Grid sell leg not actionable yet (47)
- 2. `autobot-feedback-20260512-091818.tgz` — class=fresh, dailyNet=3.89, risk=CAUTION, top=Skip SUIUSDC: Grid waiting for ladder slot or inventory (8)
- 3. `autobot-feedback-20260511-080610.tgz` — class=fresh, dailyNet=-49.72, risk=NORMAL, top=Skip TONUSDC: Daily loss caution paused GRID BUY leg (34)
- 4. `autobot-feedback-20260508-081302.tgz` — class=fresh, dailyNet=-136.89, risk=HALT, top=Skip: No feasible candidates after policy/exposure filters (34)
- 5. `autobot-feedback-20260507-090740.tgz` — class=baseline, dailyNet=-151.90, risk=CAUTION, top=Skip ZECBTC: Max open positions reached (10) (18)

