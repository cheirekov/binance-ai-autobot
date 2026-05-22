# Automatic Retrospective

Last updated: 2026-05-22T11:55:42.396Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260522-114754.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — "Skip BTCUSDC: Risk budget blocked new exposure" (59 -> 14; latestShare=7.0%; improving 76.3%)
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — 92.77 | -38.50 | -11.24
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=92.77 | -38.50 | -11.24 ; maxDD=0.73 | 1.57 | 1.48
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `92.77`
- Max drawdown: `0.73%`
- Open positions: `14`
- Total alloc pct: `3.19`

## Top skip reasons (latest bundle)

- Skip BTCUSDC: Risk budget blocked new exposure (14)
- Skip ETHUSDC: Risk budget blocked new exposure (13)
- Skip: No eligible universe candidates after policy and lock filters (12)
- Skip: No feasible candidates after policy/exposure filters (11)
- Skip USDEUSDC: Fee/edge filter (net 0.243% < 0.559%) (6)

## PM/BA automatic decision

- Decision: `continue`
- Required action: `continue active ticket`

## Bundle window

- 1. `autobot-feedback-20260522-114754.tgz` — class=fresh, dailyNet=92.77, risk=NORMAL, top=Skip BTCUSDC: Risk budget blocked new exposure (14)
- 2. `autobot-feedback-20260521-125108.tgz` — class=fresh, dailyNet=-38.50, risk=NORMAL, top=Skip BTCUSDC: Risk budget blocked new exposure (59)
- 3. `autobot-feedback-20260520-150037.tgz` — class=fresh, dailyNet=-11.24, risk=CAUTION, top=Skip EDENUSDC: Grid sell leg not actionable yet (34)
- 4. `autobot-feedback-20260519-074932.tgz` — class=fresh, dailyNet=7.69, risk=CAUTION, top=Skip DOGEUSDC: Risk budget blocked new exposure (46)
- 5. `autobot-feedback-20260514-103746.tgz` — class=baseline, dailyNet=14.08, risk=CAUTION, top=Skip SAGAUSDC: Grid sell leg not actionable yet (48)
