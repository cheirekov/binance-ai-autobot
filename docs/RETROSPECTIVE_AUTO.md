# Automatic Retrospective

Last updated: 2026-03-22T15:56:13.617Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260322-155534.tgz`
Review window: `5` local bundle(s)

## Hard rules

- Repeated dominant loop across latest 2 bundles: `PASS` — Skip ETHFIUSDC: Grid waiting for ladder slot or inventory -> Skip BTCUSDC: Fee/edge filter (net -0.023% < 0.052%)
- Negative daily_net_usdt across latest 3 bundles: `PASS` — -163.90 | -138.87 | 18.54
- No KPI trend improvement across latest 3 bundles: `FAIL` — daily=-163.90 | -138.87 | 18.54 ; maxDD=3.00 | 2.68 | 0.93

## Latest bundle snapshot

- Risk state: `HALT`
- Daily net: `-163.90`
- Max drawdown: `3.00%`
- Open positions: `6`
- Total alloc pct: `0.28`

## Top skip reasons (latest bundle)

- Skip BTCUSDC: Fee/edge filter (net -0.023% < 0.052%) (12)
- Skip ETHBTC: Fee/edge filter (net -0.159% < 0.052%) (11)
- Skip: Daily loss HALT (profit giveback 338.1% >= 70.0%) (4)
- Skip SOLBTC: Fee/edge filter (net 0.036% < 0.052%) (4)
- Skip SOLUSDC: Fee/edge filter (net -0.066% < 0.052%) (4)

## PM/BA automatic decision

- Decision: `patch_required`
- Required action: `same-ticket mitigation required before next long run`

## Bundle window

- 1. `autobot-feedback-20260322-155534.tgz` — dailyNet=-163.90, risk=HALT, top=Skip BTCUSDC: Fee/edge filter (net -0.023% < 0.052%) (12)
- 2. `autobot-feedback-20260322-063344.tgz` — dailyNet=-138.87, risk=NORMAL, top=Skip ETHFIUSDC: Grid waiting for ladder slot or inventory (14)
- 3. `autobot-feedback-20260321-165459.tgz` — dailyNet=18.54, risk=NORMAL, top=Skip ETHBTC: Fee/edge filter (net -0.166% < 0.052%) (15)
- 4. `autobot-feedback-20260321-093401.tgz` — dailyNet=16.88, risk=CAUTION, top=Skip: No feasible candidates: daily loss caution paused new symbols (57 filtered) (37)
- 5. `autobot-feedback-20260321-060548.tgz` — dailyNet=54.90, risk=NORMAL, top=Skip ETHBTC: Fee/edge filter (net -0.128% < 0.052%) (13)

