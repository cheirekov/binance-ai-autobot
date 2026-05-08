# Automatic Retrospective

Last updated: 2026-05-08T08:13:14.867Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260508-081302.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip ZECBTC: Max open positions reached (10) -> Skip: No feasible candidates after policy/exposure filters
- Negative daily_net_usdt across latest 3 fresh bundles: `FAIL` — -136.89 | -151.90 | -7.31
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-136.89 | -151.90 | -7.31 ; maxDD=5.60 | 3.85 | 7.26
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `HALT`
- Daily net: `-136.89`
- Max drawdown: `5.60%`
- Open positions: `11`
- Total alloc pct: `13.82`

## Top skip reasons (latest bundle)

- Skip: No feasible candidates after policy/exposure filters (34)
- Skip SOLUSDC: Grid sell leg not actionable yet (9)
- Skip SOLUSDC: Daily loss caution paused GRID BUY leg (8)
- Skip CHIPUSDC: Grid waiting for ladder slot or inventory (6)
- Skip ONDOUSDC: Grid sell sizing rejected (Below minNotional 5.00000000 at LIMIT price (need qty ≥ 13.8)) (6)

## PM/BA automatic decision

- Decision: `patch_required`
- Required action: `same-ticket mitigation required before next long run`

## Bundle window

- 1. `autobot-feedback-20260508-081302.tgz` — class=fresh, dailyNet=-136.89, risk=HALT, top=Skip: No feasible candidates after policy/exposure filters (34)
- 2. `autobot-feedback-20260507-090740.tgz` — class=fresh, dailyNet=-151.90, risk=CAUTION, top=Skip ZECBTC: Max open positions reached (10) (18)
- 3. `autobot-feedback-20260505-080749.tgz` — class=fresh, dailyNet=-7.31, risk=NORMAL, top=Skip: Transient exchange backoff active (10)
- 4. `autobot-feedback-20260504-084256.tgz` — class=fresh, dailyNet=-301.36, risk=HALT, top=Skip BTCUSDC: Fee/edge filter (net 0.040% < 0.050%) (10)
- 5. `autobot-feedback-20260430-081918.tgz` — class=baseline, dailyNet=-0.26, risk=NORMAL, top=Skip BTCUSDC: Grid sell leg not actionable yet (86)

