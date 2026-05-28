# Automatic Retrospective

Last updated: 2026-05-28T10:55:22.580Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260528-105508.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip BTCUSDC: Risk budget blocked new exposure -> Skip: No feasible candidates after policy/exposure filters
- Negative daily_net_usdt across latest 3 fresh bundles: `FAIL` — -16.21 | -11.26 | -77.12
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-16.21 | -11.26 | -77.12 ; maxDD=0.93 | 3.66 | 4.11
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `-16.21`
- Max drawdown: `0.93%`
- Open positions: `7`
- Total alloc pct: `5.06`

## Top skip reasons (latest bundle)

- Skip: No feasible candidates after policy/exposure filters (62)
- Skip XLMUSDC: Risk budget market entry cap below exchange minimum (22)
- Skip ZECUSDC: Grid waiting for ladder slot or inventory (21)
- Skip GENIUSUSDC: Risk budget market entry cap below exchange minimum (13)
- Skip ZECUSDC: Grid sell sizing rejected (Below minNotional 5.00000000 at LIMIT price (need qty ≥ 0.01)) (1)

## PM/BA automatic decision

- Decision: `patch_required`
- Required action: `same-ticket mitigation required before next long run`

## Bundle window

- 1. `autobot-feedback-20260528-105508.tgz` — class=fresh, dailyNet=-16.21, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (62)
- 2. `autobot-feedback-20260527-104314.tgz` — class=fresh, dailyNet=-11.26, risk=CAUTION, top=Skip BTCUSDC: Risk budget blocked new exposure (60)
- 3. `autobot-feedback-20260526-145313.tgz` — class=fresh, dailyNet=-77.12, risk=NORMAL, top=Skip BTCUSDC: Risk budget blocked new exposure (32)
- 4. `autobot-feedback-20260525-090223.tgz` — class=fresh, dailyNet=-43.20, risk=NORMAL, top=Skip ETHUSDC: Risk budget blocked new exposure (30)
- 5. `autobot-feedback-20260522-114754.tgz` — class=baseline, dailyNet=92.77, risk=NORMAL, top=Skip BTCUSDC: Risk budget blocked new exposure (14)
