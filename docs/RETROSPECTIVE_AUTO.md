# Automatic Retrospective

Last updated: 2026-03-27T10:25:00.336Z
Active ticket: `T-032`
Latest bundle: `autobot-feedback-20260327-102432.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip BTCUSDC: Grid guard paused BUY leg -> Skip: No feasible candidates after sizing/cap filters (5 rejected)
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — -141.37 | -120.28 | 413.91
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-141.37 | -120.28 | 413.91 ; maxDD=3.41 | 3.46 | 3.46

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `-141.37`
- Max drawdown: `3.41%`
- Open positions: `11`
- Total alloc pct: `97.85`

## Top skip reasons (latest bundle)

- Skip: No feasible candidates after sizing/cap filters (5 rejected) (70)
- Skip: No feasible candidates after sizing/cap filters (4 rejected) (50)
- Skip: No feasible candidates after sizing/cap filters (6 rejected) (32)
- Skip: No feasible candidates after sizing/cap filters (3 rejected) (30)
- Skip: No feasible candidates after sizing/cap filters (2 rejected) (18)

## PM/BA automatic decision

- Decision: `continue`
- Required action: `continue active ticket`

## Bundle window

- 1. `autobot-feedback-20260327-102432.tgz` — class=fresh, dailyNet=-141.37, risk=NORMAL, top=Skip: No feasible candidates after sizing/cap filters (5 rejected) (70)
- 2. `autobot-feedback-20260326-164157.tgz` — class=fresh, dailyNet=-120.28, risk=NORMAL, top=Skip BTCUSDC: Grid guard paused BUY leg (17)
- 3. `autobot-feedback-20260326-130152.tgz` — class=fresh, dailyNet=413.91, risk=NORMAL, top=Skip BTCUSDC: Grid guard paused BUY leg (17)
- 4. `autobot-feedback-20260326-090817.tgz` — class=fresh, dailyNet=17.11, risk=NORMAL, top=Skip BTCUSDC: Grid guard paused BUY leg (17)
- 5. `autobot-feedback-20260325-195431.tgz` — class=baseline, dailyNet=17.11, risk=NORMAL, top=Skip BTCUSDC: Grid guard paused BUY leg (17)

