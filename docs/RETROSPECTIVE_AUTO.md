# Automatic Retrospective

Last updated: 2026-03-27T15:54:36.319Z
Active ticket: `T-032`
Latest bundle: `autobot-feedback-20260327-155408.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `FAIL` — "Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered)" (48 -> 20)
- Negative daily_net_usdt across latest 3 fresh bundles: `FAIL` — -82.40 | -103.86 | -141.37
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-82.40 | -103.86 | -141.37 ; maxDD=3.41 | 3.41 | 3.41

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `CAUTION`
- Daily net: `-82.40`
- Max drawdown: `3.41%`
- Open positions: `7`
- Total alloc pct: `6.67`

## Top skip reasons (latest bundle)

- Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered) (20)
- Skip BTCUSDC: Daily loss caution paused GRID BUY leg (20)
- Skip: Daily loss HALT (profit giveback 78.0% >= 70.0%) (1)

## PM/BA automatic decision

- Decision: `pivot_required`
- Required action: `PM/BA pivot review required before next long run`

## Bundle window

- 1. `autobot-feedback-20260327-155408.tgz` — class=fresh, dailyNet=-82.40, risk=CAUTION, top=Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered) (20)
- 2. `autobot-feedback-20260327-123604.tgz` — class=fresh, dailyNet=-103.86, risk=CAUTION, top=Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered) (48)
- 3. `autobot-feedback-20260327-102432.tgz` — class=fresh, dailyNet=-141.37, risk=NORMAL, top=Skip: No feasible candidates after sizing/cap filters (5 rejected) (70)
- 4. `autobot-feedback-20260326-164157.tgz` — class=fresh, dailyNet=-120.28, risk=NORMAL, top=Skip BTCUSDC: Grid guard paused BUY leg (17)
- 5. `autobot-feedback-20260326-130152.tgz` — class=baseline, dailyNet=413.91, risk=NORMAL, top=Skip BTCUSDC: Grid guard paused BUY leg (17)

