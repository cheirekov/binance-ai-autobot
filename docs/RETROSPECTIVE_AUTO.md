# Automatic Retrospective

Last updated: 2026-03-29T15:08:17.879Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260329-150750.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip TAOUSDC: Grid waiting for ladder slot or inventory -> Skip: No feasible candidates: daily loss caution paused new symbols (58 filtered)
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — -299.30 | -166.45 | 19.17
- No KPI trend improvement across latest 3 fresh bundles: `FAIL` — daily=-299.30 | -166.45 | 19.17 ; maxDD=4.80 | 2.99 | 0.97

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `CAUTION`
- Daily net: `-299.30`
- Max drawdown: `4.80%`
- Open positions: `4`
- Total alloc pct: `33.36`

## Top skip reasons (latest bundle)

- Skip: No feasible candidates: daily loss caution paused new symbols (58 filtered) (77)
- Skip BTCUSDC: Fee/edge filter (net 0.017% < 0.052%) (25)
- Skip BTCUSDC: Fee/edge filter (net 0.027% < 0.052%) (13)
- Skip BTCUSDC: Fee/edge filter (net 0.026% < 0.052%) (9)
- Skip BTCUSDC: Fee/edge filter (net 0.039% < 0.052%) (9)

## PM/BA automatic decision

- Decision: `patch_required`
- Required action: `same-ticket mitigation required before next long run`

## Bundle window

- 1. `autobot-feedback-20260329-150750.tgz` — class=fresh, dailyNet=-299.30, risk=CAUTION, top=Skip: No feasible candidates: daily loss caution paused new symbols (58 filtered) (77)
- 2. `autobot-feedback-20260329-081616.tgz` — class=fresh, dailyNet=-166.45, risk=HALT, top=Skip TAOUSDC: Grid waiting for ladder slot or inventory (6)
- 3. `autobot-feedback-20260328-202730.tgz` — class=fresh, dailyNet=19.17, risk=NORMAL, top=Skip BTCUSDC: Fee/edge filter (net 0.040% < 0.052%) (15)
- 4. `autobot-feedback-20260328-084345.tgz` — class=fresh, dailyNet=-73.02, risk=CAUTION, top=Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered) (100)
- 5. `autobot-feedback-20260327-155408.tgz` — class=baseline, dailyNet=-82.40, risk=CAUTION, top=Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered) (20)

