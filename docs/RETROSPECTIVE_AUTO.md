# Automatic Retrospective

Last updated: 2026-04-10T07:25:12.176Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260410-072500.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip BTCUSDC: Grid sell leg not actionable yet -> Skip ETHUSDC: Grid sell leg not actionable yet
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — 0.75 | -0.89 | 1.59
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=0.75 | -0.89 | 1.59 ; maxDD=5.00 | 5.29 | 5.29

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `0.75`
- Max drawdown: `5.00%`
- Open positions: `11`
- Total alloc pct: `0.99`

## Top skip reasons (latest bundle)

- Skip ETHUSDC: Grid sell leg not actionable yet (41)
- Skip BTCUSDC: Grid sell leg not actionable yet (32)
- Skip ETHUSDC: Protection lock COOLDOWN: Cooldown after non-actionable sell leg (900s) (28)
- Skip TAOUSDC: Grid sell leg not actionable yet (9)
- Skip XRPUSDC: Grid sell leg not actionable yet (8)

## PM/BA automatic decision

- Decision: `continue`
- Required action: `continue active ticket`

## Bundle window

- 1. `autobot-feedback-20260410-072500.tgz` — class=fresh, dailyNet=0.75, risk=NORMAL, top=Skip ETHUSDC: Grid sell leg not actionable yet (41)
- 2. `autobot-feedback-20260409-071715.tgz` — class=fresh, dailyNet=-0.89, risk=NORMAL, top=Skip BTCUSDC: Grid sell leg not actionable yet (30)
- 3. `autobot-feedback-20260408-130935.tgz` — class=fresh, dailyNet=1.59, risk=NORMAL, top=Skip ETHUSDC: Grid sell leg not actionable yet (28)
- 4. `autobot-feedback-20260407-181242.tgz` — class=fresh, dailyNet=153.19, risk=NORMAL, top=Skip ETHUSDC: Grid sell leg not actionable yet (31)
- 5. `autobot-feedback-20260407-055241.tgz` — class=baseline, dailyNet=-99.51, risk=NORMAL, top=Skip ETHUSDC: Grid sell leg not actionable yet (91)

