# Automatic Retrospective

Last updated: 2026-03-26T09:08:28.841Z
Active ticket: `T-032`
Latest bundle: `autobot-feedback-20260326-090817.tgz`
Review window: `3` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `FAIL` — "Skip BTCUSDC: Grid guard paused BUY leg" (17 -> 17)
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — 17.11 | 17.11 | 17.11
- No KPI trend improvement across latest 3 fresh bundles: `FAIL` — daily=17.11 | 17.11 | 17.11 ; maxDD=3.46 | 3.46 | 3.46

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `17.11`
- Max drawdown: `3.46%`
- Open positions: `10`
- Total alloc pct: `93.93`

## Top skip reasons (latest bundle)

- Skip BTCUSDC: Grid guard paused BUY leg (17)
- Skip BTCUSDC: Grid waiting for ladder slot or inventory (16)
- Skip SOLUSDC: Grid waiting for ladder slot or inventory (15)
- Skip SOLUSDC: Grid guard paused BUY leg (15)
- Skip: No feasible candidates after policy/exposure filters (13)

## PM/BA automatic decision

- Decision: `pivot_required`
- Required action: `PM/BA pivot review required before next long run`

## Bundle window

- 1. `autobot-feedback-20260326-090817.tgz` — class=fresh, dailyNet=17.11, risk=NORMAL, top=Skip BTCUSDC: Grid guard paused BUY leg (17)
- 2. `autobot-feedback-20260325-195431.tgz` — class=fresh, dailyNet=17.11, risk=NORMAL, top=Skip BTCUSDC: Grid guard paused BUY leg (17)
- 3. `autobot-feedback-20260324-095550.tgz` — class=stale, dailyNet=17.11, risk=NORMAL, top=Skip BTCUSDC: Grid guard paused BUY leg (17)
- 4. `autobot-feedback-20260324-091829.tgz` — class=stale, dailyNet=17.11, risk=NORMAL, top=Skip BTCUSDC: Grid guard paused BUY leg (17)
- 5. `autobot-feedback-20260323-160632.tgz` — class=baseline, dailyNet=17.11, risk=NORMAL, top=Skip BTCUSDC: Grid guard paused BUY leg (17)

