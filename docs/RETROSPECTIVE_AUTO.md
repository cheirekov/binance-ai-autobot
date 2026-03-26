# Automatic Retrospective

Last updated: 2026-03-26T13:02:15.486Z
Active ticket: `T-032`
Latest bundle: `autobot-feedback-20260326-130152.tgz`
Review window: `4` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `FAIL` — "Skip BTCUSDC: Grid guard paused BUY leg" (17 -> 17)
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — 413.91 | 17.11 | 17.11
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=413.91 | 17.11 | 17.11 ; maxDD=3.46 | 3.46 | 3.46

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `413.91`
- Max drawdown: `3.46%`
- Open positions: `10`
- Total alloc pct: `95.33`

## Top skip reasons (latest bundle)

- Skip BTCUSDC: Grid guard paused BUY leg (17)
- Skip BTCUSDC: Grid waiting for ladder slot or inventory (16)
- Skip: No feasible candidates after policy/exposure filters (15)
- Skip SOLUSDC: Grid waiting for ladder slot or inventory (15)
- Skip SOLUSDC: Grid guard paused BUY leg (14)

## PM/BA automatic decision

- Decision: `patch_required`
- Required action: `same-ticket mitigation required before next long run`

## Bundle window

- 1. `autobot-feedback-20260326-130152.tgz` — class=fresh, dailyNet=413.91, risk=NORMAL, top=Skip BTCUSDC: Grid guard paused BUY leg (17)
- 2. `autobot-feedback-20260326-090817.tgz` — class=fresh, dailyNet=17.11, risk=NORMAL, top=Skip BTCUSDC: Grid guard paused BUY leg (17)
- 3. `autobot-feedback-20260325-195431.tgz` — class=fresh, dailyNet=17.11, risk=NORMAL, top=Skip BTCUSDC: Grid guard paused BUY leg (17)
- 4. `autobot-feedback-20260324-095550.tgz` — class=stale, dailyNet=17.11, risk=NORMAL, top=Skip BTCUSDC: Grid guard paused BUY leg (17)
- 5. `autobot-feedback-20260324-091829.tgz` — class=baseline, dailyNet=17.11, risk=NORMAL, top=Skip BTCUSDC: Grid guard paused BUY leg (17)

