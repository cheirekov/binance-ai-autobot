# Automatic Retrospective

Last updated: 2026-06-16T15:29:19.798Z
Active ticket: `T-040`
Latest bundle: `autobot-feedback-20260616-152318.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip SOLUSDC: Risk budget market entry cap below exchange minimum -> Skip BTCUSDC: Risk budget blocked new exposure
- Negative daily_net_usdt across latest 3 fresh bundles: `FAIL` — -12.74 | -23.60 | -7.00
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-12.74 | -23.60 | -7.00 ; maxDD=0.46 | 0.75 | 0.62
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `-12.74`
- Max drawdown: `0.46%`
- Open positions: `13`
- Total alloc pct: `5.11`

## Top skip reasons (latest bundle)

- Skip BTCUSDC: Risk budget blocked new exposure (58)
- Skip JTOUSDC: Risk budget market entry cap below exchange minimum (18)
- Skip XLMUSDC: Risk budget market entry cap below exchange minimum (14)
- Skip XRPUSDC: Risk budget blocked new exposure (10)
- Skip WLDUSDC: Risk budget market entry cap below exchange minimum (8)

## PM/BA automatic decision

- Decision: `validation_required`
- Required action: `classify severity and add deterministic validation before any runtime patch; live-market churn alone is not a beta blocker`
- Production readiness mode: `enabled`
- Patch policy: `runtime patches require P0/P1 safety severity plus deterministic reproduction`

## Bundle window

- 1. `autobot-feedback-20260616-152318.tgz` — class=fresh, dailyNet=-12.74, risk=NORMAL, top=Skip BTCUSDC: Risk budget blocked new exposure (58)
- 2. `autobot-feedback-20260615-065149.tgz` — class=fresh, dailyNet=-23.60, risk=NORMAL, top=Skip SOLUSDC: Risk budget market entry cap below exchange minimum (26)
- 3. `autobot-feedback-20260612-063453.tgz` — class=fresh, dailyNet=-7.00, risk=NORMAL, top=Skip EPICUSDC: Risk budget market entry cap below exchange minimum (27)
- 4. `autobot-feedback-20260611-090617.tgz` — class=fresh, dailyNet=-9.09, risk=NORMAL, top=Skip HMSTRUSDC: Risk budget market entry cap below exchange minimum (32)
- 5. `autobot-feedback-20260610-082902.tgz` — class=baseline, dailyNet=-5.33, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (44)
