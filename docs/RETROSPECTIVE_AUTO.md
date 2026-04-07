# Automatic Retrospective

Last updated: 2026-04-07T18:12:59.972Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260407-181242.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `FAIL` — "Skip ETHUSDC: Grid sell leg not actionable yet" (91 -> 31)
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — 153.19 | -99.51 | -96.05
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=153.19 | -99.51 | -96.05 ; maxDD=5.29 | 5.29 | 2.83

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `153.19`
- Max drawdown: `5.29%`
- Open positions: `11`
- Total alloc pct: `0.99`

## Top skip reasons (latest bundle)

- Skip ETHUSDC: Grid sell leg not actionable yet (31)
- Skip BTCUSDC: Grid guard paused BUY leg (15)
- Skip BANKUSDC: Grid sell leg not actionable yet (14)
- Skip BTCUSDC: Grid sell leg not actionable yet (13)
- Skip BTCUSDC: Grid waiting for ladder slot or inventory (10)

## PM/BA automatic decision

- Decision: `patch_required`
- Required action: `same-ticket mitigation required before next long run`

## Bundle window

- 1. `autobot-feedback-20260407-181242.tgz` — class=fresh, dailyNet=153.19, risk=NORMAL, top=Skip ETHUSDC: Grid sell leg not actionable yet (31)
- 2. `autobot-feedback-20260407-055241.tgz` — class=fresh, dailyNet=-99.51, risk=NORMAL, top=Skip ETHUSDC: Grid sell leg not actionable yet (91)
- 3. `autobot-feedback-20260405-184019.tgz` — class=fresh, dailyNet=-96.05, risk=CAUTION, top=Skip SOLVUSDC: Protection lock COOLDOWN: Cooldown after non-actionable sell leg (900s) (39)
- 4. `autobot-feedback-20260404-183649.tgz` — class=fresh, dailyNet=-22.49, risk=CAUTION, top=Skip STOUSDC: Grid sell leg not actionable yet (32)
- 5. `autobot-feedback-20260403-161123.tgz` — class=baseline, dailyNet=18.39, risk=NORMAL, top=Skip ETHUSDC: Grid sell leg not actionable yet (87)

