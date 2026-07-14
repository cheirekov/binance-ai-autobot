# Automatic Retrospective

Last updated: 2026-07-14T08:06:18.185Z
Active ticket: `T-040`
Latest bundle: `autobot-feedback-20260714-075300.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip BTCUSDC: Risk budget blocked new exposure -> Skip ETHUSDC: Risk budget blocked new exposure
- Negative daily_net_usdt across latest 3 fresh bundles: `FAIL` — -31.07 | -25.68 | -2.68
- No KPI trend improvement across latest 3 fresh bundles: `FAIL` — daily=-31.07 | -25.68 | -2.68 ; maxDD=0.93 | 0.75 | 0.37
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `-31.07`
- Max drawdown: `0.93%`
- Open positions: `13`
- Total alloc pct: `5.09`

## Top skip reasons (latest bundle)

- Skip ETHUSDC: Risk budget blocked new exposure (49)
- Skip BTCUSDC: Risk budget blocked new exposure (49)
- Skip NEARUSDC: Risk budget blocked new exposure (24)
- Skip XRPUSDC: Risk budget blocked new exposure (17)
- Skip ZECUSDC: Risk budget paused GRID BUY leg (6)

## PM/BA automatic decision

- Decision: `validation_required`
- Required action: `classify severity and add deterministic validation before any runtime patch; live-market churn alone is not a beta blocker`
- Production readiness mode: `enabled`
- Patch policy: `runtime patches require P0/P1 safety severity plus deterministic reproduction`

## Bundle window

- 1. `autobot-feedback-20260714-075300.tgz` — class=fresh, dailyNet=-31.07, risk=NORMAL, top=Skip ETHUSDC: Risk budget blocked new exposure (49)
- 2. `autobot-feedback-20260713-085946.tgz` — class=fresh, dailyNet=-25.68, risk=NORMAL, top=Skip BTCUSDC: Risk budget blocked new exposure (51)
- 3. `autobot-feedback-20260703-091448.tgz` — class=fresh, dailyNet=-2.68, risk=NORMAL, top=Skip ETHUSDC: Risk budget market entry cap below exchange minimum (38)
- 4. `autobot-feedback-20260702-074745.tgz` — class=fresh, dailyNet=-13.65, risk=NORMAL, top=Skip ETHUSDC: Risk budget blocked new exposure (47)
- 5. `autobot-feedback-20260701-085837.tgz` — class=baseline, dailyNet=-46.55, risk=CAUTION, top=Skip SOLUSDC: Risk budget blocked new exposure (54)
