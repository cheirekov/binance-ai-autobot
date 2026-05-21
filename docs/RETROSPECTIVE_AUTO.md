# Automatic Retrospective

Last updated: 2026-05-21T12:56:36.844Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260521-125108.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip EDENUSDC: Grid sell leg not actionable yet -> Skip BTCUSDC: Risk budget blocked new exposure
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — -38.50 | -11.24 | 7.69
- No KPI trend improvement across latest 3 fresh bundles: `FAIL` — daily=-38.50 | -11.24 | 7.69 ; maxDD=1.57 | 1.48 | 1.24
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `-38.50`
- Max drawdown: `1.57%`
- Open positions: `12`
- Total alloc pct: `21.32`

## Top skip reasons (latest bundle)

- Skip BTCUSDC: Risk budget blocked new exposure (59)
- Skip ETHUSDC: Risk budget blocked new exposure (43)
- Skip SOLUSDC: Risk budget paused GRID BUY leg (31)
- Skip ZECUSDC: Grid sell leg not actionable yet (29)
- Skip ZECUSDC: Risk budget paused GRID BUY leg (29)

## PM/BA automatic decision

- Decision: `patch_required`
- Required action: `same-ticket mitigation required before next long run`

## Bundle window

- 1. `autobot-feedback-20260521-125108.tgz` — class=fresh, dailyNet=-38.50, risk=NORMAL, top=Skip BTCUSDC: Risk budget blocked new exposure (59)
- 2. `autobot-feedback-20260520-150037.tgz` — class=fresh, dailyNet=-11.24, risk=CAUTION, top=Skip EDENUSDC: Grid sell leg not actionable yet (34)
- 3. `autobot-feedback-20260519-074932.tgz` — class=fresh, dailyNet=7.69, risk=CAUTION, top=Skip DOGEUSDC: Risk budget blocked new exposure (46)
- 4. `autobot-feedback-20260514-103746.tgz` — class=fresh, dailyNet=14.08, risk=CAUTION, top=Skip SAGAUSDC: Grid sell leg not actionable yet (48)
- 5. `autobot-feedback-20260513-085101.tgz` — class=baseline, dailyNet=-33.81, risk=CAUTION, top=Skip SAGAUSDC: Grid sell leg not actionable yet (47)
