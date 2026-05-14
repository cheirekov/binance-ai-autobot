# Automatic Retrospective

Last updated: 2026-05-14T10:38:04.510Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260514-103746.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `FAIL` — "Skip SAGAUSDC: Grid sell leg not actionable yet" (47 -> 48)
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — 14.08 | -33.81 | 3.89
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=14.08 | -33.81 | 3.89 ; maxDD=2.78 | 3.49 | 4.41
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `CAUTION`
- Daily net: `14.08`
- Max drawdown: `2.78%`
- Open positions: `8`
- Total alloc pct: `0.32`

## Top skip reasons (latest bundle)

- Skip SAGAUSDC: Grid sell leg not actionable yet (48)
- Skip SAGAUSDC: Daily loss caution paused GRID BUY leg (48)
- Skip ETHUSDC: Grid sell leg not actionable yet (28)
- Skip ETHUSDC: Risk budget paused GRID BUY leg (27)
- Skip BTCUSDC: Risk budget blocked new exposure (18)

## PM/BA automatic decision

- Decision: `patch_required`
- Required action: `same-ticket mitigation required before next long run`

## Bundle window

- 1. `autobot-feedback-20260514-103746.tgz` — class=fresh, dailyNet=14.08, risk=CAUTION, top=Skip SAGAUSDC: Grid sell leg not actionable yet (48)
- 2. `autobot-feedback-20260513-085101.tgz` — class=fresh, dailyNet=-33.81, risk=CAUTION, top=Skip SAGAUSDC: Grid sell leg not actionable yet (47)
- 3. `autobot-feedback-20260512-091818.tgz` — class=fresh, dailyNet=3.89, risk=CAUTION, top=Skip SUIUSDC: Grid waiting for ladder slot or inventory (8)
- 4. `autobot-feedback-20260511-080610.tgz` — class=fresh, dailyNet=-49.72, risk=NORMAL, top=Skip TONUSDC: Daily loss caution paused GRID BUY leg (34)
- 5. `autobot-feedback-20260508-081302.tgz` — class=baseline, dailyNet=-136.89, risk=HALT, top=Skip: No feasible candidates after policy/exposure filters (34)

