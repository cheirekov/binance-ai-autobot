# Automatic Retrospective

Last updated: 2026-07-13T08:59:58.727Z
Active ticket: `T-040`
Latest bundle: `autobot-feedback-20260713-085946.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip ETHUSDC: Risk budget market entry cap below exchange minimum -> Skip BTCUSDC: Risk budget blocked new exposure
- Negative daily_net_usdt across latest 3 fresh bundles: `FAIL` — -25.68 | -2.68 | -13.65
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-25.68 | -2.68 | -13.65 ; maxDD=0.75 | 0.37 | 1.38
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `-25.68`
- Max drawdown: `0.75%`
- Open positions: `13`
- Total alloc pct: `3.10`

## Top skip reasons (latest bundle)

- Skip BTCUSDC: Risk budget blocked new exposure (51)
- Skip ETHUSDC: Risk budget blocked new exposure (49)
- Skip SOLUSDC: Risk budget blocked new exposure (44)
- Skip NEARUSDC: Risk budget blocked new exposure (9)
- Skip ZECUSDC: Grid sell leg not actionable yet (6)

## PM/BA automatic decision

- Decision: `validation_required`
- Required action: `classify severity and add deterministic validation before any runtime patch; live-market churn alone is not a beta blocker`
- Production readiness mode: `enabled`
- Patch policy: `runtime patches require P0/P1 safety severity plus deterministic reproduction`

## Bundle window

- 1. `autobot-feedback-20260713-085946.tgz` — class=fresh, dailyNet=-25.68, risk=NORMAL, top=Skip BTCUSDC: Risk budget blocked new exposure (51)
- 2. `autobot-feedback-20260703-091448.tgz` — class=fresh, dailyNet=-2.68, risk=NORMAL, top=Skip ETHUSDC: Risk budget market entry cap below exchange minimum (38)
- 3. `autobot-feedback-20260702-074745.tgz` — class=fresh, dailyNet=-13.65, risk=NORMAL, top=Skip ETHUSDC: Risk budget blocked new exposure (47)
- 4. `autobot-feedback-20260701-085837.tgz` — class=fresh, dailyNet=-46.55, risk=CAUTION, top=Skip SOLUSDC: Risk budget blocked new exposure (54)
- 5. `autobot-feedback-20260619-085557.tgz` — class=baseline, dailyNet=3.07, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (80)
