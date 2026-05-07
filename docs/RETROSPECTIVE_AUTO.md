# Automatic Retrospective

Last updated: 2026-05-07T09:07:53.102Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260507-090740.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip: Transient exchange backoff active -> Skip ZECBTC: Max open positions reached (10)
- Negative daily_net_usdt across latest 3 fresh bundles: `FAIL` — -151.90 | -7.31 | -301.36
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-151.90 | -7.31 | -301.36 ; maxDD=3.85 | 7.26 | 5.05
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `CAUTION`
- Daily net: `-151.90`
- Max drawdown: `3.85%`
- Open positions: `9`
- Total alloc pct: `37.26`

## Top skip reasons (latest bundle)

- Skip ZECBTC: Max open positions reached (10) (18)
- Skip ETHBTC: Max open positions reached (10) (18)
- Skip WBTCBTC: Max open positions reached (10) (17)
- Skip: Daily loss caution: no eligible managed symbols (10)
- Skip IOUSDC: Daily loss caution paused GRID BUY leg (10)

## PM/BA automatic decision

- Decision: `patch_required`
- Required action: `same-ticket mitigation required before next long run`

## Bundle window

- 1. `autobot-feedback-20260507-090740.tgz` — class=fresh, dailyNet=-151.90, risk=CAUTION, top=Skip ZECBTC: Max open positions reached (10) (18)
- 2. `autobot-feedback-20260505-080749.tgz` — class=fresh, dailyNet=-7.31, risk=NORMAL, top=Skip: Transient exchange backoff active (10)
- 3. `autobot-feedback-20260504-084256.tgz` — class=fresh, dailyNet=-301.36, risk=HALT, top=Skip BTCUSDC: Fee/edge filter (net 0.040% < 0.050%) (10)
- 4. `autobot-feedback-20260430-081918.tgz` — class=fresh, dailyNet=-0.26, risk=NORMAL, top=Skip BTCUSDC: Grid sell leg not actionable yet (86)
- 5. `autobot-feedback-20260429-120806.tgz` — class=baseline, dailyNet=0.22, risk=NORMAL, top=Skip BTCUSDC: Grid sell leg not actionable yet (63)

