# Automatic Retrospective

Last updated: 2026-04-07T05:52:54.358Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260407-055241.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip SOLVUSDC: Protection lock COOLDOWN: Cooldown after non-actionable sell leg (900s) -> Skip ETHUSDC: Grid sell leg not actionable yet
- Negative daily_net_usdt across latest 3 fresh bundles: `FAIL` — -99.51 | -96.05 | -22.49
- No KPI trend improvement across latest 3 fresh bundles: `FAIL` — daily=-99.51 | -96.05 | -22.49 ; maxDD=5.29 | 2.83 | 1.75

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `-99.51`
- Max drawdown: `5.29%`
- Open positions: `10`
- Total alloc pct: `21.24`

## Top skip reasons (latest bundle)

- Skip ETHUSDC: Grid sell leg not actionable yet (91)
- Skip ETHUSDC: Grid guard paused BUY leg (91)
- Skip BTCUSDC: Grid guard paused BUY leg (6)
- Skip BTCUSDC: Grid waiting for ladder slot or inventory (3)

## PM/BA automatic decision

- Decision: `pivot_required`
- Required action: `PM/BA pivot review required before next long run`

## Bundle window

- 1. `autobot-feedback-20260407-055241.tgz` — class=fresh, dailyNet=-99.51, risk=NORMAL, top=Skip ETHUSDC: Grid sell leg not actionable yet (91)
- 2. `autobot-feedback-20260405-184019.tgz` — class=fresh, dailyNet=-96.05, risk=CAUTION, top=Skip SOLVUSDC: Protection lock COOLDOWN: Cooldown after non-actionable sell leg (900s) (39)
- 3. `autobot-feedback-20260404-183649.tgz` — class=fresh, dailyNet=-22.49, risk=CAUTION, top=Skip STOUSDC: Grid sell leg not actionable yet (32)
- 4. `autobot-feedback-20260403-161123.tgz` — class=fresh, dailyNet=18.39, risk=NORMAL, top=Skip ETHUSDC: Grid sell leg not actionable yet (87)
- 5. `autobot-feedback-20260403-094703.tgz` — class=baseline, dailyNet=50.08, risk=NORMAL, top=Skip STOUSDC: Grid sell leg not actionable yet (100)

