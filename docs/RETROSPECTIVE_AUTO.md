# Automatic Retrospective

Last updated: 2026-06-05T07:55:39.259Z
Active ticket: `T-040`
Latest bundle: `autobot-feedback-20260605-075150.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip WLDUSDC: Risk budget market entry cap below exchange minimum -> Skip: No feasible candidates after policy/exposure filters
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — -5.79 | -39.12 | 26.35
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-5.79 | -39.12 | 26.35 ; maxDD=1.70 | 1.90 | 1.98
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `-5.79`
- Max drawdown: `1.70%`
- Open positions: `11`
- Total alloc pct: `3.85`

## Top skip reasons (latest bundle)

- Skip: No feasible candidates after policy/exposure filters (76)
- Skip BNBUSDC: Fee/edge filter (net 0.295% < 0.559%) (6)
- Skip XRPUSDC: Risk budget paused GRID BUY leg (5)
- Skip BNBUSDC: Fee/edge filter (net 0.264% < 0.559%) (4)
- Skip BNBUSDC: Fee/edge filter (net 0.292% < 0.559%) (3)

## PM/BA automatic decision

- Decision: `continue`
- Required action: `continue active ticket`
- Production readiness mode: `enabled`
- Patch policy: `runtime patches require P0/P1 safety severity plus deterministic reproduction`

## Bundle window

- 1. `autobot-feedback-20260605-075150.tgz` — class=fresh, dailyNet=-5.79, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (76)
- 2. `autobot-feedback-20260604-082337.tgz` — class=fresh, dailyNet=-39.12, risk=NORMAL, top=Skip WLDUSDC: Risk budget market entry cap below exchange minimum (34)
- 3. `autobot-feedback-20260603-160659.tgz` — class=fresh, dailyNet=26.35, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (20)
- 4. `autobot-feedback-20260602-082850.tgz` — class=fresh, dailyNet=-36.55, risk=NORMAL, top=Skip TONUSDC: Risk budget market entry cap below exchange minimum (22)
- 5. `autobot-feedback-20260601-083624.tgz` — class=baseline, dailyNet=-38.71, risk=NORMAL, top=Skip XLMUSDC: Risk budget market entry cap below exchange minimum (37)
