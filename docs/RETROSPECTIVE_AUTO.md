# Automatic Retrospective

Last updated: 2026-03-28T20:28:11.141Z
Active ticket: `T-032`
Latest bundle: `autobot-feedback-20260328-202730.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered) -> Skip BTCUSDC: Fee/edge filter (net 0.040% < 0.052%)
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — 19.17 | -73.02 | -82.40
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=19.17 | -73.02 | -82.40 ; maxDD=0.97 | 3.17 | 3.41

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `19.17`
- Max drawdown: `0.97%`
- Open positions: `9`
- Total alloc pct: `70.43`

## Top skip reasons (latest bundle)

- Skip BTCUSDC: Fee/edge filter (net 0.040% < 0.052%) (15)
- Skip SOLUSDC: Fee/edge filter (net 0.044% < 0.052%) (14)
- Skip: No feasible candidates after policy/exposure filters (10)
- Skip ETHUSDC: Grid waiting for ladder slot or inventory (9)
- Skip BTCUSDC: Fee/edge filter (net -0.016% < 0.052%) (8)

## PM/BA automatic decision

- Decision: `continue`
- Required action: `continue active ticket`

## Bundle window

- 1. `autobot-feedback-20260328-202730.tgz` — class=fresh, dailyNet=19.17, risk=NORMAL, top=Skip BTCUSDC: Fee/edge filter (net 0.040% < 0.052%) (15)
- 2. `autobot-feedback-20260328-084345.tgz` — class=fresh, dailyNet=-73.02, risk=CAUTION, top=Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered) (100)
- 3. `autobot-feedback-20260327-155408.tgz` — class=fresh, dailyNet=-82.40, risk=CAUTION, top=Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered) (20)
- 4. `autobot-feedback-20260327-123604.tgz` — class=fresh, dailyNet=-103.86, risk=CAUTION, top=Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered) (48)
- 5. `autobot-feedback-20260327-102432.tgz` — class=baseline, dailyNet=-141.37, risk=NORMAL, top=Skip: No feasible candidates after sizing/cap filters (5 rejected) (70)

