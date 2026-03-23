# Automatic Retrospective

Last updated: 2026-03-23T07:48:12.108Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260323-074326.tgz`
Review window: `5` local bundle(s)

## Hard rules

- Repeated dominant loop across latest 2 bundles: `PASS` — Skip BTCUSDC: Fee/edge filter (net -0.023% < 0.052%) -> Skip BTCUSDC: Grid guard paused BUY leg
- Negative daily_net_usdt across latest 3 bundles: `PASS` — 17.11 | -163.90 | -138.87
- No KPI trend improvement across latest 3 bundles: `PASS` — daily=17.11 | -163.90 | -138.87 ; maxDD=3.46 | 3.00 | 2.68

## Latest bundle snapshot

- Risk state: `NORMAL`
- Daily net: `17.11`
- Max drawdown: `3.46%`
- Open positions: `9`
- Total alloc pct: `99.42`

## Top skip reasons (latest bundle)

- Skip BTCUSDC: Grid guard paused BUY leg (17)
- Skip SOLUSDC: Grid waiting for ladder slot or inventory (16)
- Skip SOLUSDC: Grid guard paused BUY leg (16)
- Skip BTCUSDC: Grid waiting for ladder slot or inventory (16)
- Skip: No feasible candidates after policy/exposure filters (8)

## PM/BA automatic decision

- Decision: `continue`
- Required action: `continue active ticket`

## Bundle window

- 1. `autobot-feedback-20260323-074326.tgz` — dailyNet=17.11, risk=NORMAL, top=Skip BTCUSDC: Grid guard paused BUY leg (17)
- 2. `autobot-feedback-20260322-155534.tgz` — dailyNet=-163.90, risk=HALT, top=Skip BTCUSDC: Fee/edge filter (net -0.023% < 0.052%) (12)
- 3. `autobot-feedback-20260322-063344.tgz` — dailyNet=-138.87, risk=NORMAL, top=Skip ETHFIUSDC: Grid waiting for ladder slot or inventory (14)
- 4. `autobot-feedback-20260321-165459.tgz` — dailyNet=18.54, risk=NORMAL, top=Skip ETHBTC: Fee/edge filter (net -0.166% < 0.052%) (15)
- 5. `autobot-feedback-20260321-093401.tgz` — dailyNet=16.88, risk=CAUTION, top=Skip: No feasible candidates: daily loss caution paused new symbols (57 filtered) (37)

