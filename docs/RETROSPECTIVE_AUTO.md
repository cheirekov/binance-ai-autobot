# Automatic Retrospective

Last updated: 2026-03-30T14:24:30.276Z
Active ticket: `T-032`
Latest bundle: `autobot-feedback-20260330-135922.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip: No feasible candidates: daily loss caution paused new symbols (58 filtered) -> Skip SUIUSDC: Daily loss caution paused GRID BUY leg
- Negative daily_net_usdt across latest 3 fresh bundles: `FAIL` — -144.52 | -170.99 | -299.30
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-144.52 | -170.99 | -299.30 ; maxDD=6.72 | 5.26 | 4.80

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `CAUTION`
- Daily net: `-144.52`
- Max drawdown: `6.72%`
- Open positions: `5`
- Total alloc pct: `32.69`

## Top skip reasons (latest bundle)

- Skip SUIUSDC: Daily loss caution paused GRID BUY leg (61)
- Skip: No feasible candidates: daily loss caution paused new symbols (58 filtered) (41)
- Skip: No feasible candidates: daily loss caution paused new symbols (57 filtered) (18)
- Skip NOMUSDC: Daily loss caution paused GRID BUY leg (16)
- Skip SUIUSDC: Grid waiting for ladder slot or inventory (6)

## PM/BA automatic decision

- Decision: `patch_required`
- Required action: `same-ticket mitigation required before next long run`

## Bundle window

- 1. `autobot-feedback-20260330-135922.tgz` — class=fresh, dailyNet=-144.52, risk=CAUTION, top=Skip SUIUSDC: Daily loss caution paused GRID BUY leg (61)
- 2. `autobot-feedback-20260330-082950.tgz` — class=fresh, dailyNet=-170.99, risk=CAUTION, top=Skip: No feasible candidates: daily loss caution paused new symbols (58 filtered) (89)
- 3. `autobot-feedback-20260329-150750.tgz` — class=fresh, dailyNet=-299.30, risk=CAUTION, top=Skip: No feasible candidates: daily loss caution paused new symbols (58 filtered) (77)
- 4. `autobot-feedback-20260329-081616.tgz` — class=fresh, dailyNet=-166.45, risk=HALT, top=Skip TAOUSDC: Grid waiting for ladder slot or inventory (6)
- 5. `autobot-feedback-20260328-202730.tgz` — class=baseline, dailyNet=19.17, risk=NORMAL, top=Skip BTCUSDC: Fee/edge filter (net 0.040% < 0.052%) (15)

