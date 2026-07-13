# Automatic Retrospective

Last updated: 2026-07-03T09:21:20.914Z
Active ticket: `T-040`
Latest bundle: `autobot-feedback-20260703-091448.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip ETHUSDC: Risk budget blocked new exposure -> Skip ETHUSDC: Risk budget market entry cap below exchange minimum
- Negative daily_net_usdt across latest 3 fresh bundles: `FAIL` — -2.68 | -13.65 | -46.55
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-2.68 | -13.65 | -46.55 ; maxDD=0.37 | 1.38 | 1.54
- External exchange/order-sync backoff in latest bundle: `WARN` — latest evidence includes external exchange/order-sync backoff (Skip: Transient exchange backoff active)

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `-2.68`
- Max drawdown: `0.37%`
- Open positions: `12`
- Total alloc pct: `5.09`

## Top skip reasons (latest bundle)

- Skip ETHUSDC: Risk budget market entry cap below exchange minimum (38)
- Skip TLMUSDC: Risk budget market entry cap below exchange minimum (29)
- Skip: Transient exchange backoff active (14)
- Skip: Live order sync failed (14)
- Skip ADAUSDC: Risk budget market entry cap below exchange minimum (14)

## PM/BA automatic decision

- Decision: `validation_required`
- Required action: `classify severity and add deterministic validation before any runtime patch; live-market churn alone is not a beta blocker`
- Production readiness mode: `enabled`
- Patch policy: `runtime patches require P0/P1 safety severity plus deterministic reproduction`

## Bundle window

- 1. `autobot-feedback-20260703-091448.tgz` — class=fresh, dailyNet=-2.68, risk=NORMAL, top=Skip ETHUSDC: Risk budget market entry cap below exchange minimum (38)
- 2. `autobot-feedback-20260702-074745.tgz` — class=fresh, dailyNet=-13.65, risk=NORMAL, top=Skip ETHUSDC: Risk budget blocked new exposure (47)
- 3. `autobot-feedback-20260701-085837.tgz` — class=fresh, dailyNet=-46.55, risk=CAUTION, top=Skip SOLUSDC: Risk budget blocked new exposure (54)
- 4. `autobot-feedback-20260619-085557.tgz` — class=fresh, dailyNet=3.07, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (80)
- 5. `autobot-feedback-20260618-090049.tgz` — class=baseline, dailyNet=-39.77, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (45)
