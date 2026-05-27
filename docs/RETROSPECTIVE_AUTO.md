# Automatic Retrospective

Last updated: 2026-05-27T10:43:29.070Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260527-104314.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `FAIL` — "Skip BTCUSDC: Risk budget blocked new exposure" (32 -> 60; latestShare=30.0%; material persistent loop)
- Negative daily_net_usdt across latest 3 fresh bundles: `FAIL` — -11.26 | -77.12 | -43.20
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-11.26 | -77.12 | -43.20 ; maxDD=3.66 | 4.11 | 1.83
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `CAUTION`
- Daily net: `-11.26`
- Max drawdown: `3.66%`
- Open positions: `11`
- Total alloc pct: `5.30`

## Top skip reasons (latest bundle)

- Skip BTCUSDC: Risk budget blocked new exposure (60)
- Skip ETHUSDC: Risk budget blocked new exposure (54)
- Skip SOLUSDC: Risk budget blocked new exposure (54)
- Skip SEIUSDC: Risk budget blocked new exposure (15)
- Skip XRPUSDC: Risk budget blocked new exposure (10)

## PM/BA automatic decision

- Decision: `pivot_required`
- Required action: `PM/BA pivot review required before next long run`

## Bundle window

- 1. `autobot-feedback-20260527-104314.tgz` — class=fresh, dailyNet=-11.26, risk=CAUTION, top=Skip BTCUSDC: Risk budget blocked new exposure (60)
- 2. `autobot-feedback-20260526-145313.tgz` — class=fresh, dailyNet=-77.12, risk=NORMAL, top=Skip BTCUSDC: Risk budget blocked new exposure (32)
- 3. `autobot-feedback-20260525-090223.tgz` — class=fresh, dailyNet=-43.20, risk=NORMAL, top=Skip ETHUSDC: Risk budget blocked new exposure (30)
- 4. `autobot-feedback-20260522-114754.tgz` — class=fresh, dailyNet=92.77, risk=NORMAL, top=Skip BTCUSDC: Risk budget blocked new exposure (14)
- 5. `autobot-feedback-20260521-125108.tgz` — class=baseline, dailyNet=-38.50, risk=NORMAL, top=Skip BTCUSDC: Risk budget blocked new exposure (59)
