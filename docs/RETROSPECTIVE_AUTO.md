# Automatic Retrospective

Last updated: 2026-06-17T09:41:44.762Z
Active ticket: `T-040`
Latest bundle: `autobot-feedback-20260617-093804.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `FAIL` — "Skip BTCUSDC: Risk budget blocked new exposure" (58 -> 62; latestShare=31.0%; material persistent loop)
- Negative daily_net_usdt across latest 3 fresh bundles: `FAIL` — -29.62 | -12.74 | -23.60
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-29.62 | -12.74 | -23.60 ; maxDD=0.65 | 0.46 | 0.75
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `-29.62`
- Max drawdown: `0.65%`
- Open positions: `8`
- Total alloc pct: `1.62`

## Top skip reasons (latest bundle)

- Skip BTCUSDC: Risk budget blocked new exposure (62)
- Skip SOLUSDC: Risk budget blocked new exposure (31)
- Skip ZECUSDC: Risk budget paused GRID BUY leg (21)
- Skip WLDUSDC: Risk budget market entry cap below exchange minimum (16)
- Skip NEARUSDC: Risk budget blocked new exposure (14)

## PM/BA automatic decision

- Decision: `validation_required`
- Required action: `classify severity and add deterministic validation before any runtime patch; live-market churn alone is not a beta blocker`
- Production readiness mode: `enabled`
- Patch policy: `runtime patches require P0/P1 safety severity plus deterministic reproduction`

## Bundle window

- 1. `autobot-feedback-20260617-093804.tgz` — class=fresh, dailyNet=-29.62, risk=NORMAL, top=Skip BTCUSDC: Risk budget blocked new exposure (62)
- 2. `autobot-feedback-20260616-152318.tgz` — class=fresh, dailyNet=-12.74, risk=NORMAL, top=Skip BTCUSDC: Risk budget blocked new exposure (58)
- 3. `autobot-feedback-20260615-065149.tgz` — class=fresh, dailyNet=-23.60, risk=NORMAL, top=Skip SOLUSDC: Risk budget market entry cap below exchange minimum (26)
- 4. `autobot-feedback-20260612-063453.tgz` — class=fresh, dailyNet=-7.00, risk=NORMAL, top=Skip EPICUSDC: Risk budget market entry cap below exchange minimum (27)
- 5. `autobot-feedback-20260611-090617.tgz` — class=baseline, dailyNet=-9.09, risk=NORMAL, top=Skip HMSTRUSDC: Risk budget market entry cap below exchange minimum (32)
