# Automatic Retrospective

Last updated: 2026-05-11T08:06:22.278Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260511-080610.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip: No feasible candidates after policy/exposure filters -> Skip TONUSDC: Daily loss caution paused GRID BUY leg
- Negative daily_net_usdt across latest 3 fresh bundles: `FAIL` — -49.72 | -136.89 | -151.90
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-49.72 | -136.89 | -151.90 ; maxDD=4.90 | 5.60 | 3.85
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `-49.72`
- Max drawdown: `4.90%`
- Open positions: `12`
- Total alloc pct: `30.80`

## Top skip reasons (latest bundle)

- Skip TONUSDC: Daily loss caution paused GRID BUY leg (34)
- Skip TAOUSDC: Daily loss caution paused GRID BUY leg (15)
- Skip TONUSDC: Grid waiting for ladder slot or inventory (9)
- Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered) (9)
- Skip SOLUSDC: Daily loss caution paused GRID BUY leg (9)

## PM/BA automatic decision

- Decision: `patch_required`
- Required action: `same-ticket mitigation required before next long run`

## Bundle window

- 1. `autobot-feedback-20260511-080610.tgz` — class=fresh, dailyNet=-49.72, risk=NORMAL, top=Skip TONUSDC: Daily loss caution paused GRID BUY leg (34)
- 2. `autobot-feedback-20260508-081302.tgz` — class=fresh, dailyNet=-136.89, risk=HALT, top=Skip: No feasible candidates after policy/exposure filters (34)
- 3. `autobot-feedback-20260507-090740.tgz` — class=fresh, dailyNet=-151.90, risk=CAUTION, top=Skip ZECBTC: Max open positions reached (10) (18)
- 4. `autobot-feedback-20260505-080749.tgz` — class=fresh, dailyNet=-7.31, risk=NORMAL, top=Skip: Transient exchange backoff active (10)
- 5. `autobot-feedback-20260504-084256.tgz` — class=baseline, dailyNet=-301.36, risk=HALT, top=Skip BTCUSDC: Fee/edge filter (net 0.040% < 0.050%) (10)

