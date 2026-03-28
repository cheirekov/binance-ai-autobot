# Automatic Retrospective

Last updated: 2026-03-28T08:44:12.033Z
Active ticket: `T-032`
Latest bundle: `autobot-feedback-20260328-084345.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `FAIL` — "Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered)" (20 -> 100)
- Negative daily_net_usdt across latest 3 fresh bundles: `FAIL` — -73.02 | -82.40 | -103.86
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-73.02 | -82.40 | -103.86 ; maxDD=3.17 | 3.41 | 3.41

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `CAUTION`
- Daily net: `-73.02`
- Max drawdown: `3.17%`
- Open positions: `4`
- Total alloc pct: `3.40`

## Top skip reasons (latest bundle)

- Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered) (100)
- Skip BTCUSDC: Fee/edge filter (net 0.019% < 0.052%) (15)
- Skip BTCUSDC: Fee/edge filter (net 0.006% < 0.052%) (12)
- Skip BTCUSDC: Fee/edge filter (net 0.041% < 0.052%) (12)
- Skip BTCUSDC: Fee/edge filter (net -0.003% < 0.052%) (9)

## PM/BA automatic decision

- Decision: `pivot_required`
- Required action: `PM/BA pivot review required before next long run`

## Bundle window

- 1. `autobot-feedback-20260328-084345.tgz` — class=fresh, dailyNet=-73.02, risk=CAUTION, top=Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered) (100)
- 2. `autobot-feedback-20260327-155408.tgz` — class=fresh, dailyNet=-82.40, risk=CAUTION, top=Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered) (20)
- 3. `autobot-feedback-20260327-123604.tgz` — class=fresh, dailyNet=-103.86, risk=CAUTION, top=Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered) (48)
- 4. `autobot-feedback-20260327-102432.tgz` — class=fresh, dailyNet=-141.37, risk=NORMAL, top=Skip: No feasible candidates after sizing/cap filters (5 rejected) (70)
- 5. `autobot-feedback-20260326-164157.tgz` — class=baseline, dailyNet=-120.28, risk=NORMAL, top=Skip BTCUSDC: Grid guard paused BUY leg (17)

