# Automatic Retrospective

Last updated: 2026-06-08T07:34:47.074Z
Active ticket: `T-040`
Latest bundle: `autobot-feedback-20260608-073438.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip: No feasible candidates after policy/exposure filters -> Skip ZECUSDC: Risk budget market entry cap below exchange minimum
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — -9.38 | 9.96 | -5.79
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-9.38 | 9.96 | -5.79 ; maxDD=0.54 | 0.20 | 1.70
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `-9.38`
- Max drawdown: `0.54%`
- Open positions: `11`
- Total alloc pct: `3.54`

## Top skip reasons (latest bundle)

- Skip ZECUSDC: Risk budget market entry cap below exchange minimum (47)
- Skip NEARUSDC: Risk budget market entry cap below exchange minimum (8)
- Skip BTCUSDC: Fee/edge filter (net 0.310% < 0.559%) (8)
- Skip ETHUSDC: Fee/edge filter (net 0.404% < 0.559%) (5)
- Skip BTCUSDC: Fee/edge filter (net 0.272% < 0.559%) (5)

## PM/BA automatic decision

- Decision: `continue`
- Required action: `continue active ticket`
- Production readiness mode: `enabled`
- Patch policy: `runtime patches require P0/P1 safety severity plus deterministic reproduction`

## Bundle window

- 1. `autobot-feedback-20260608-073438.tgz` — class=fresh, dailyNet=-9.38, risk=NORMAL, top=Skip ZECUSDC: Risk budget market entry cap below exchange minimum (47)
- 2. `autobot-feedback-20260606-151705.tgz` — class=fresh, dailyNet=9.96, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (48)
- 3. `autobot-feedback-20260605-075150.tgz` — class=fresh, dailyNet=-5.79, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (76)
- 4. `autobot-feedback-20260604-082337.tgz` — class=fresh, dailyNet=-39.12, risk=NORMAL, top=Skip WLDUSDC: Risk budget market entry cap below exchange minimum (34)
- 5. `autobot-feedback-20260603-160659.tgz` — class=baseline, dailyNet=26.35, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (20)
