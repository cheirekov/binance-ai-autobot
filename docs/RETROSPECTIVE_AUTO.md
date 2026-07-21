# Automatic Retrospective

Last updated: 2026-07-21T11:53:21.195Z
Active ticket: `T-026`
Latest bundle: `autobot-feedback-20260721-114241.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip ETHUSDC: Risk budget blocked new exposure -> Skip SOLUSDC: Risk budget blocked new exposure
- Negative daily_net_usdt across latest 3 fresh bundles: `FAIL` — -17.89 | -31.07 | -25.68
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-17.89 | -31.07 | -25.68 ; maxDD=0.64 | 0.93 | 0.75
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `-17.89`
- Max drawdown: `0.64%`
- Open positions: `9`
- Total alloc pct: `3.56`

## Top skip reasons (latest bundle)

- Skip SOLUSDC: Risk budget blocked new exposure (40)
- Skip BTCUSDC: Risk budget blocked new exposure (37)
- Skip ETHUSDC: Risk budget blocked new exposure (35)
- Skip XRPUSDC: Risk budget blocked new exposure (5)
- Skip ONDOUSDC: Risk budget market entry cap below exchange minimum (5)

## PM/BA automatic decision

- Decision: `validation_required`
- Required action: `continue deterministic calibration/replay; live-market churn is supporting evidence and cannot require a runtime patch`
- Deterministic calibration mode: `enabled`
- Live evidence policy: `supporting input only; promotion requires replay/calibration acceptance`

## Bundle window

- 1. `autobot-feedback-20260721-114241.tgz` — class=fresh, dailyNet=-17.89, risk=NORMAL, top=Skip SOLUSDC: Risk budget blocked new exposure (40)
- 2. `autobot-feedback-20260714-075300.tgz` — class=fresh, dailyNet=-31.07, risk=NORMAL, top=Skip ETHUSDC: Risk budget blocked new exposure (49)
- 3. `autobot-feedback-20260713-085946.tgz` — class=fresh, dailyNet=-25.68, risk=NORMAL, top=Skip BTCUSDC: Risk budget blocked new exposure (51)
- 4. `autobot-feedback-20260703-091448.tgz` — class=fresh, dailyNet=-2.68, risk=NORMAL, top=Skip ETHUSDC: Risk budget market entry cap below exchange minimum (38)
- 5. `autobot-feedback-20260702-074745.tgz` — class=baseline, dailyNet=-13.65, risk=NORMAL, top=Skip ETHUSDC: Risk budget blocked new exposure (47)
