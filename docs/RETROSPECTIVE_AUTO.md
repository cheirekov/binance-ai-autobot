# Automatic Retrospective

Last updated: 2026-06-02T08:29:08.491Z
Active ticket: `T-040`
Latest bundle: `autobot-feedback-20260602-082850.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip XLMUSDC: Risk budget market entry cap below exchange minimum -> Skip TONUSDC: Risk budget market entry cap below exchange minimum
- Negative daily_net_usdt across latest 3 fresh bundles: `FAIL` — -36.55 | -38.71 | -8.81
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-36.55 | -38.71 | -8.81 ; maxDD=1.98 | 1.51 | 0.75
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `-36.55`
- Max drawdown: `1.98%`
- Open positions: `5`
- Total alloc pct: `0.12`

## Top skip reasons (latest bundle)

- Skip TONUSDC: Risk budget market entry cap below exchange minimum (22)
- Skip NEARUSDC: Risk budget market entry cap below exchange minimum (20)
- Skip WLDUSDC: Risk budget market entry cap below exchange minimum (7)
- Skip SOLUSDC: Fee/edge filter (net 0.327% < 0.559%) (7)
- Skip ZECUSDC: Grid waiting for ladder slot or inventory (6)

## PM/BA automatic decision

- Decision: `validation_required`
- Required action: `classify severity and add deterministic validation before any runtime patch; live-market churn alone is not a beta blocker`
- Production readiness mode: `enabled`
- Patch policy: `runtime patches require P0/P1 safety severity plus deterministic reproduction`

## Bundle window

- 1. `autobot-feedback-20260602-082850.tgz` — class=fresh, dailyNet=-36.55, risk=NORMAL, top=Skip TONUSDC: Risk budget market entry cap below exchange minimum (22)
- 2. `autobot-feedback-20260601-083624.tgz` — class=fresh, dailyNet=-38.71, risk=NORMAL, top=Skip XLMUSDC: Risk budget market entry cap below exchange minimum (37)
- 3. `autobot-feedback-20260531-120353.tgz` — class=fresh, dailyNet=-8.81, risk=NORMAL, top=Skip BNBUSDC: Risk budget market entry cap below exchange minimum (78)
- 4. `autobot-feedback-20260529-081216.tgz` — class=fresh, dailyNet=31.00, risk=NORMAL, top=Skip XLMUSDC: Risk budget market entry cap below exchange minimum (20)
- 5. `autobot-feedback-20260528-105508.tgz` — class=baseline, dailyNet=-16.21, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (62)
