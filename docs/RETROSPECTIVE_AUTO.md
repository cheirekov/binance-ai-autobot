# Automatic Retrospective

Last updated: 2026-03-27T12:36:20.147Z
Active ticket: `T-032`
Latest bundle: `autobot-feedback-20260327-123604.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip: No feasible candidates after sizing/cap filters (5 rejected) -> Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered)
- Negative daily_net_usdt across latest 3 fresh bundles: `FAIL` — -103.86 | -141.37 | -120.28
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-103.86 | -141.37 | -120.28 ; maxDD=3.41 | 3.41 | 3.46

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `CAUTION`
- Daily net: `-103.86`
- Max drawdown: `3.41%`
- Open positions: `7`
- Total alloc pct: `17.98`

## Top skip reasons (latest bundle)

- Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered) (48)
- Skip BTCUSDC: Daily loss caution paused GRID BUY leg (48)
- Skip: No feasible candidates after sizing/cap filters (3 rejected) (35)
- Skip: No feasible candidates after sizing/cap filters (4 rejected) (27)
- Skip: No feasible candidates after sizing/cap filters (2 rejected) (20)

## PM/BA automatic decision

- Decision: `patch_required`
- Required action: `same-ticket mitigation required before next long run`

## Bundle window

- 1. `autobot-feedback-20260327-123604.tgz` — class=fresh, dailyNet=-103.86, risk=CAUTION, top=Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered) (48)
- 2. `autobot-feedback-20260327-102432.tgz` — class=fresh, dailyNet=-141.37, risk=NORMAL, top=Skip: No feasible candidates after sizing/cap filters (5 rejected) (70)
- 3. `autobot-feedback-20260326-164157.tgz` — class=fresh, dailyNet=-120.28, risk=NORMAL, top=Skip BTCUSDC: Grid guard paused BUY leg (17)
- 4. `autobot-feedback-20260326-130152.tgz` — class=fresh, dailyNet=413.91, risk=NORMAL, top=Skip BTCUSDC: Grid guard paused BUY leg (17)
- 5. `autobot-feedback-20260326-090817.tgz` — class=baseline, dailyNet=17.11, risk=NORMAL, top=Skip BTCUSDC: Grid guard paused BUY leg (17)

