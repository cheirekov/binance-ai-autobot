# Automatic Retrospective

Last updated: 2026-05-05T08:13:53.382Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260505-080749.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip BTCUSDC: Fee/edge filter (net 0.040% < 0.050%) -> Skip: Transient exchange backoff active
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — -7.31 | -301.36 | -0.26 (historical carryover suppressed: latest improved by 294.05 from prior fresh bundle)
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-7.31 | -301.36 | -0.26 ; maxDD=7.26 | 5.05 | 0.02
- External exchange/order-sync backoff in latest bundle: `WARN` — latest top reasons include external exchange/order-sync backoff (Skip: Transient exchange backoff active)

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `-7.31`
- Max drawdown: `7.26%`
- Open positions: `9`
- Total alloc pct: `51.46`

## Top skip reasons (latest bundle)

- Skip: Transient exchange backoff active (10)
- Skip: Live order sync failed (10)
- Skip ETHBTC: Grid guard paused BUY leg (9)
- Skip: No feasible candidates after policy/exposure filters (9)
- Skip WBTCBTC: Fee/edge filter (net -0.243% < 0.052%) (7)

## PM/BA automatic decision

- Decision: `continue`
- Required action: `continue active ticket; collect next bundle after exchange/order-sync backoff clears`

## Bundle window

- 1. `autobot-feedback-20260505-080749.tgz` — class=fresh, dailyNet=-7.31, risk=NORMAL, top=Skip: Transient exchange backoff active (10)
- 2. `autobot-feedback-20260504-084256.tgz` — class=fresh, dailyNet=-301.36, risk=HALT, top=Skip BTCUSDC: Fee/edge filter (net 0.040% < 0.050%) (10)
- 3. `autobot-feedback-20260430-081918.tgz` — class=fresh, dailyNet=-0.26, risk=NORMAL, top=Skip BTCUSDC: Grid sell leg not actionable yet (86)
- 4. `autobot-feedback-20260429-120806.tgz` — class=fresh, dailyNet=0.22, risk=NORMAL, top=Skip BTCUSDC: Grid sell leg not actionable yet (63)
- 5. `autobot-feedback-20260428-102858.tgz` — class=baseline, dailyNet=0.26, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (59)

