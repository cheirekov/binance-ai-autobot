# Automatic Retrospective

Last updated: 2026-05-25T09:02:41.889Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260525-090223.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip BTCUSDC: Risk budget blocked new exposure -> Skip ETHUSDC: Risk budget blocked new exposure
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — -43.20 | 92.77 | -38.50
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-43.20 | 92.77 | -38.50 ; maxDD=1.83 | 0.73 | 1.57
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `-43.20`
- Max drawdown: `1.83%`
- Open positions: `13`
- Total alloc pct: `2.63`

## Top skip reasons (latest bundle)

- Skip ETHUSDC: Risk budget blocked new exposure (30)
- Skip BTCUSDC: Risk budget blocked new exposure (26)
- Skip XRPUSDC: Risk budget blocked new exposure (13)
- Skip NEARUSDC: Grid sell sizing rejected (Below minQty 0.10000000) (7)
- Skip ETHUSDC: Fee/edge filter (net 0.403% < 0.559%) (6)

## PM/BA automatic decision

- Decision: `continue`
- Required action: `continue active ticket`

## Bundle window

- 1. `autobot-feedback-20260525-090223.tgz` — class=fresh, dailyNet=-43.20, risk=NORMAL, top=Skip ETHUSDC: Risk budget blocked new exposure (30)
- 2. `autobot-feedback-20260522-114754.tgz` — class=fresh, dailyNet=92.77, risk=NORMAL, top=Skip BTCUSDC: Risk budget blocked new exposure (14)
- 3. `autobot-feedback-20260521-125108.tgz` — class=fresh, dailyNet=-38.50, risk=NORMAL, top=Skip BTCUSDC: Risk budget blocked new exposure (59)
- 4. `autobot-feedback-20260520-150037.tgz` — class=fresh, dailyNet=-11.24, risk=CAUTION, top=Skip EDENUSDC: Grid sell leg not actionable yet (34)
- 5. `autobot-feedback-20260519-074932.tgz` — class=baseline, dailyNet=7.69, risk=CAUTION, top=Skip DOGEUSDC: Risk budget blocked new exposure (46)
