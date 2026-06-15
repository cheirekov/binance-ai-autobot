# Automatic Retrospective

Last updated: 2026-06-15T07:00:37.656Z
Active ticket: `T-040`
Latest bundle: `autobot-feedback-20260615-065149.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip EPICUSDC: Risk budget market entry cap below exchange minimum -> Skip SOLUSDC: Risk budget market entry cap below exchange minimum
- Negative daily_net_usdt across latest 3 fresh bundles: `FAIL` — -23.60 | -7.00 | -9.09
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-23.60 | -7.00 | -9.09 ; maxDD=0.75 | 0.62 | 0.66
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `-23.60`
- Max drawdown: `0.75%`
- Open positions: `9`
- Total alloc pct: `5.11`

## Top skip reasons (latest bundle)

- Skip SOLUSDC: Risk budget market entry cap below exchange minimum (26)
- Skip NEARUSDC: Risk budget market entry cap below exchange minimum (18)
- Skip OPGUSDC: Risk budget market entry cap below exchange minimum (15)
- Skip ETHUSDC: Risk budget market entry cap below exchange minimum (15)
- Skip ZECUSDC: Risk budget market entry cap below exchange minimum (12)

## PM/BA automatic decision

- Decision: `validation_required`
- Required action: `classify severity and add deterministic validation before any runtime patch; live-market churn alone is not a beta blocker`
- Production readiness mode: `enabled`
- Patch policy: `runtime patches require P0/P1 safety severity plus deterministic reproduction`

## Bundle window

- 1. `autobot-feedback-20260615-065149.tgz` — class=fresh, dailyNet=-23.60, risk=NORMAL, top=Skip SOLUSDC: Risk budget market entry cap below exchange minimum (26)
- 2. `autobot-feedback-20260612-063453.tgz` — class=fresh, dailyNet=-7.00, risk=NORMAL, top=Skip EPICUSDC: Risk budget market entry cap below exchange minimum (27)
- 3. `autobot-feedback-20260611-090617.tgz` — class=fresh, dailyNet=-9.09, risk=NORMAL, top=Skip HMSTRUSDC: Risk budget market entry cap below exchange minimum (32)
- 4. `autobot-feedback-20260610-082902.tgz` — class=fresh, dailyNet=-5.33, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (44)
- 5. `autobot-feedback-20260609-081440.tgz` — class=baseline, dailyNet=-7.13, risk=CAUTION, top=Skip ALLOUSDC: Risk budget market entry cap below exchange minimum (25)
