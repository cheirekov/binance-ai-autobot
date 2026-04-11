# Automatic Retrospective

Last updated: 2026-04-11T07:41:07.889Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260411-074053.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip ETHUSDC: Grid sell leg not actionable yet -> Skip BTCUSDC: Grid sell leg not actionable yet
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — -0.20 | 0.13 | 0.75
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-0.20 | 0.13 | 0.75 ; maxDD=0.92 | 2.56 | 5.00

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `-0.20`
- Max drawdown: `0.92%`
- Open positions: `11`
- Total alloc pct: `0.99`

## Top skip reasons (latest bundle)

- Skip BTCUSDC: Grid sell leg not actionable yet (12)
- Skip ETHUSDC: Grid sell leg not actionable yet (12)
- Skip SOLUSDC: Grid sell leg not actionable yet (12)
- Skip ZECUSDC: Grid sell leg not actionable yet (11)
- Skip WLFIUSDC: Grid sell leg not actionable yet (11)

## PM/BA automatic decision

- Decision: `continue`
- Required action: `continue active ticket`

## Bundle window

- 1. `autobot-feedback-20260411-074053.tgz` — class=fresh, dailyNet=-0.20, risk=NORMAL, top=Skip BTCUSDC: Grid sell leg not actionable yet (12)
- 2. `autobot-feedback-20260410-203000.tgz` — class=fresh, dailyNet=0.13, risk=NORMAL, top=Skip ETHUSDC: Grid sell leg not actionable yet (12)
- 3. `autobot-feedback-20260410-072500.tgz` — class=fresh, dailyNet=0.75, risk=NORMAL, top=Skip ETHUSDC: Grid sell leg not actionable yet (41)
- 4. `autobot-feedback-20260409-071715.tgz` — class=fresh, dailyNet=-0.89, risk=NORMAL, top=Skip BTCUSDC: Grid sell leg not actionable yet (30)
- 5. `autobot-feedback-20260408-130935.tgz` — class=baseline, dailyNet=1.59, risk=NORMAL, top=Skip ETHUSDC: Grid sell leg not actionable yet (28)

