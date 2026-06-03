# Automatic Retrospective

Last updated: 2026-06-03T16:10:40.696Z
Active ticket: `T-040`
Latest bundle: `autobot-feedback-20260603-160659.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip TONUSDC: Risk budget market entry cap below exchange minimum -> Skip: No feasible candidates after policy/exposure filters
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — 26.35 | -36.55 | -38.71
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=26.35 | -36.55 | -38.71 ; maxDD=1.98 | 1.98 | 1.51
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `26.35`
- Max drawdown: `1.98%`
- Open positions: `10`
- Total alloc pct: `0.17`

## Top skip reasons (latest bundle)

- Skip: No feasible candidates after policy/exposure filters (20)
- Skip ONDOUSDC: Risk budget market entry cap below exchange minimum (19)
- Skip ADAUSDC: Risk budget market entry cap below exchange minimum (10)
- Skip ZECUSDC: Risk budget market entry cap below exchange minimum (9)
- Skip NEARUSDC: Risk budget market entry cap below exchange minimum (8)

## PM/BA automatic decision

- Decision: `continue`
- Required action: `continue active ticket`
- Production readiness mode: `enabled`
- Patch policy: `runtime patches require P0/P1 safety severity plus deterministic reproduction`

## Bundle window

- 1. `autobot-feedback-20260603-160659.tgz` — class=fresh, dailyNet=26.35, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (20)
- 2. `autobot-feedback-20260602-082850.tgz` — class=fresh, dailyNet=-36.55, risk=NORMAL, top=Skip TONUSDC: Risk budget market entry cap below exchange minimum (22)
- 3. `autobot-feedback-20260601-083624.tgz` — class=fresh, dailyNet=-38.71, risk=NORMAL, top=Skip XLMUSDC: Risk budget market entry cap below exchange minimum (37)
- 4. `autobot-feedback-20260531-120353.tgz` — class=fresh, dailyNet=-8.81, risk=NORMAL, top=Skip BNBUSDC: Risk budget market entry cap below exchange minimum (78)
- 5. `autobot-feedback-20260529-081216.tgz` — class=baseline, dailyNet=31.00, risk=NORMAL, top=Skip XLMUSDC: Risk budget market entry cap below exchange minimum (20)
