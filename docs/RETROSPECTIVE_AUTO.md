# Automatic Retrospective

Last updated: 2026-06-10T08:35:35.617Z
Active ticket: `T-040`
Latest bundle: `autobot-feedback-20260610-082902.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip ALLOUSDC: Risk budget market entry cap below exchange minimum -> Skip: No feasible candidates after policy/exposure filters
- Negative daily_net_usdt across latest 3 fresh bundles: `FAIL` — -5.33 | -7.13 | -9.38
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-5.33 | -7.13 | -9.38 ; maxDD=0.60 | 0.76 | 0.54
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `-5.33`
- Max drawdown: `0.60%`
- Open positions: `8`
- Total alloc pct: `3.09`

## Top skip reasons (latest bundle)

- Skip: No feasible candidates after policy/exposure filters (44)
- Skip WLDUSDC: Grid sell sizing rejected (Below minQty 0.10000000) (7)
- Skip SOLUSDC: Risk budget blocked new exposure (7)
- Skip OPGUSDC: Grid waiting for ladder slot or inventory (6)
- Skip SUIUSDC: Fee/edge filter (net 0.232% < 0.559%) (5)

## PM/BA automatic decision

- Decision: `validation_required`
- Required action: `classify severity and add deterministic validation before any runtime patch; live-market churn alone is not a beta blocker`
- Production readiness mode: `enabled`
- Patch policy: `runtime patches require P0/P1 safety severity plus deterministic reproduction`

## Bundle window

- 1. `autobot-feedback-20260610-082902.tgz` — class=fresh, dailyNet=-5.33, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (44)
- 2. `autobot-feedback-20260609-081440.tgz` — class=fresh, dailyNet=-7.13, risk=CAUTION, top=Skip ALLOUSDC: Risk budget market entry cap below exchange minimum (25)
- 3. `autobot-feedback-20260608-073438.tgz` — class=fresh, dailyNet=-9.38, risk=NORMAL, top=Skip ZECUSDC: Risk budget market entry cap below exchange minimum (47)
- 4. `autobot-feedback-20260606-151705.tgz` — class=fresh, dailyNet=9.96, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (48)
- 5. `autobot-feedback-20260605-075150.tgz` — class=baseline, dailyNet=-5.79, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (76)
