# Automatic Retrospective

Last updated: 2026-06-18T09:06:01.485Z
Active ticket: `T-040`
Latest bundle: `autobot-feedback-20260618-090049.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip BTCUSDC: Risk budget blocked new exposure -> Skip: No feasible candidates after policy/exposure filters
- Negative daily_net_usdt across latest 3 fresh bundles: `FAIL` — -39.77 | -29.62 | -12.74
- No KPI trend improvement across latest 3 fresh bundles: `FAIL` — daily=-39.77 | -29.62 | -12.74 ; maxDD=1.09 | 0.65 | 0.46
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `-39.77`
- Max drawdown: `1.09%`
- Open positions: `7`
- Total alloc pct: `0.11`

## Top skip reasons (latest bundle)

- Skip: No feasible candidates after policy/exposure filters (45)
- Skip SOLUSDC: Risk budget blocked new exposure (35)
- Skip NEARUSDC: Risk budget blocked new exposure (15)
- Skip ETHUSDC: Risk budget blocked new exposure (12)
- Skip XLMUSDC: Risk budget market entry cap below exchange minimum (11)

## PM/BA automatic decision

- Decision: `validation_required`
- Required action: `classify severity and add deterministic validation before any runtime patch; live-market churn alone is not a beta blocker`
- Production readiness mode: `enabled`
- Patch policy: `runtime patches require P0/P1 safety severity plus deterministic reproduction`

## Bundle window

- 1. `autobot-feedback-20260618-090049.tgz` — class=fresh, dailyNet=-39.77, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (45)
- 2. `autobot-feedback-20260617-093804.tgz` — class=fresh, dailyNet=-29.62, risk=NORMAL, top=Skip BTCUSDC: Risk budget blocked new exposure (62)
- 3. `autobot-feedback-20260616-152318.tgz` — class=fresh, dailyNet=-12.74, risk=NORMAL, top=Skip BTCUSDC: Risk budget blocked new exposure (58)
- 4. `autobot-feedback-20260615-065149.tgz` — class=fresh, dailyNet=-23.60, risk=NORMAL, top=Skip SOLUSDC: Risk budget market entry cap below exchange minimum (26)
- 5. `autobot-feedback-20260612-063453.tgz` — class=baseline, dailyNet=-7.00, risk=NORMAL, top=Skip EPICUSDC: Risk budget market entry cap below exchange minimum (27)
