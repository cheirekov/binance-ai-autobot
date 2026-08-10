# Automatic Retrospective

Last updated: 2026-08-10T06:29:01.704Z
Active ticket: `T-026`
Latest bundle: `autobot-feedback-20260810-062844.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip SOLUSDC: Risk budget blocked new exposure -> Skip ETHUSDC: Risk budget blocked new exposure
- Negative daily_net_usdt across latest 3 fresh bundles: `FAIL` — -40.19 | -17.89 | -31.07
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-40.19 | -17.89 | -31.07 ; maxDD=1.22 | 0.64 | 0.93
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `-40.19`
- Max drawdown: `1.22%`
- Open positions: `11`
- Total alloc pct: `0.13`

## Top skip reasons (latest bundle)

- Skip ETHUSDC: Risk budget blocked new exposure (45)
- Skip BTCUSDC: Risk budget blocked new exposure (45)
- Skip SOLUSDC: Risk budget blocked new exposure (35)
- Skip WLDUSDC: Risk budget blocked new exposure (5)
- Skip TUTUSDC: Grid sell leg not actionable yet (4)

## PM/BA automatic decision

- Decision: `validation_required`
- Required action: `continue deterministic calibration/replay; live-market churn is supporting evidence and cannot require a runtime patch`
- Deterministic calibration mode: `enabled`
- Live evidence policy: `supporting input only; promotion requires replay/calibration acceptance`

## Bundle window

- 1. `autobot-feedback-20260810-062844.tgz` — class=fresh, dailyNet=-40.19, risk=NORMAL, top=Skip ETHUSDC: Risk budget blocked new exposure (45)
- 2. `autobot-feedback-20260721-114241.tgz` — class=fresh, dailyNet=-17.89, risk=NORMAL, top=Skip SOLUSDC: Risk budget blocked new exposure (40)
- 3. `autobot-feedback-20260714-075300.tgz` — class=fresh, dailyNet=-31.07, risk=NORMAL, top=Skip ETHUSDC: Risk budget blocked new exposure (49)
- 4. `autobot-feedback-20260713-085946.tgz` — class=fresh, dailyNet=-25.68, risk=NORMAL, top=Skip BTCUSDC: Risk budget blocked new exposure (51)
- 5. `autobot-feedback-20260703-091448.tgz` — class=baseline, dailyNet=-2.68, risk=NORMAL, top=Skip ETHUSDC: Risk budget market entry cap below exchange minimum (38)
