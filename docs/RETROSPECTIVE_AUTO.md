# Automatic Retrospective

Last updated: 2026-05-20T15:00:50.707Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260520-150037.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip DOGEUSDC: Risk budget blocked new exposure -> Skip EDENUSDC: Grid sell leg not actionable yet
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — -11.24 | 7.69 | 14.08
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-11.24 | 7.69 | 14.08 ; maxDD=1.48 | 1.24 | 2.78
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `CAUTION`
- Daily net: `-11.24`
- Max drawdown: `1.48%`
- Open positions: `12`
- Total alloc pct: `1.23`

## Top skip reasons (latest bundle)

- Skip EDENUSDC: Grid sell leg not actionable yet (34)
- Skip ETHUSDC: Risk budget blocked new exposure (31)
- Skip BTCUSDC: Risk budget blocked new exposure (31)
- Skip: No feasible candidates: daily loss caution paused new symbols (58 filtered) (24)
- Skip EDENUSDC: Risk budget paused GRID BUY leg (24)

## PM/BA automatic decision

- Decision: `patch_required`
- Required action: `same-ticket managed-bypass mitigation before next long run`

## Bundle window

- 1. `autobot-feedback-20260520-150037.tgz` — class=fresh, dailyNet=-11.24, risk=CAUTION, top=Skip EDENUSDC: Grid sell leg not actionable yet (34)
- 2. `autobot-feedback-20260519-074932.tgz` — class=fresh, dailyNet=7.69, risk=CAUTION, top=Skip DOGEUSDC: Risk budget blocked new exposure (46)
- 3. `autobot-feedback-20260514-103746.tgz` — class=fresh, dailyNet=14.08, risk=CAUTION, top=Skip SAGAUSDC: Grid sell leg not actionable yet (48)
- 4. `autobot-feedback-20260513-085101.tgz` — class=fresh, dailyNet=-33.81, risk=CAUTION, top=Skip SAGAUSDC: Grid sell leg not actionable yet (47)
- 5. `autobot-feedback-20260512-091818.tgz` — class=baseline, dailyNet=3.89, risk=CAUTION, top=Skip SUIUSDC: Grid waiting for ladder slot or inventory (8)
