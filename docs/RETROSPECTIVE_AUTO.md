# Automatic Retrospective

Last updated: 2026-06-09T08:14:50.009Z
Active ticket: `T-040`
Latest bundle: `autobot-feedback-20260609-081440.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip ZECUSDC: Risk budget market entry cap below exchange minimum -> Skip ALLOUSDC: Risk budget market entry cap below exchange minimum
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — -7.13 | -9.38 | 9.96
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-7.13 | -9.38 | 9.96 ; maxDD=0.76 | 0.54 | 0.20
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `CAUTION`
- Daily net: `-7.13`
- Max drawdown: `0.76%`
- Open positions: `7`
- Total alloc pct: `0.12`

## Top skip reasons (latest bundle)

- Skip ALLOUSDC: Risk budget market entry cap below exchange minimum (25)
- Skip MOVEUSDC: Risk budget market entry cap below exchange minimum (5)
- Skip BTCUSDC: Fee/edge filter (net 0.078% < 0.559%) (4)
- Skip SOLUSDC: Risk budget blocked new exposure (4)
- Skip BTCUSDC: Fee/edge filter (net 0.129% < 0.559%) (4)

## PM/BA automatic decision

- Decision: `continue`
- Required action: `continue active ticket`
- Production readiness mode: `enabled`
- Patch policy: `runtime patches require P0/P1 safety severity plus deterministic reproduction`

## Bundle window

- 1. `autobot-feedback-20260609-081440.tgz` — class=fresh, dailyNet=-7.13, risk=CAUTION, top=Skip ALLOUSDC: Risk budget market entry cap below exchange minimum (25)
- 2. `autobot-feedback-20260608-073438.tgz` — class=fresh, dailyNet=-9.38, risk=NORMAL, top=Skip ZECUSDC: Risk budget market entry cap below exchange minimum (47)
- 3. `autobot-feedback-20260606-151705.tgz` — class=fresh, dailyNet=9.96, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (48)
- 4. `autobot-feedback-20260605-075150.tgz` — class=fresh, dailyNet=-5.79, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (76)
- 5. `autobot-feedback-20260604-082337.tgz` — class=baseline, dailyNet=-39.12, risk=NORMAL, top=Skip WLDUSDC: Risk budget market entry cap below exchange minimum (34)
