# Automatic Retrospective

Last updated: 2026-03-22T06:33:59.158Z
Active ticket: `T-034`
Latest bundle: `autobot-feedback-20260322-063344.tgz`
Review window: `5` local bundle(s)

## Hard rules

- Repeated dominant loop across latest 2 bundles: `PASS` — Skip ETHBTC: Fee/edge filter (net -0.166% < 0.052%) -> Skip ETHFIUSDC: Grid waiting for ladder slot or inventory
- Negative daily_net_usdt across latest 3 bundles: `PASS` — -138.87 | 18.54 | 16.88
- No KPI trend improvement across latest 3 bundles: `PASS` — daily=-138.87 | 18.54 | 16.88 ; maxDD=2.68 | 0.93 | 2.31

## Latest bundle snapshot

- Risk state: `NORMAL`
- Daily net: `-138.87`
- Max drawdown: `2.68%`
- Open positions: `10`
- Total alloc pct: `92.44`

## Top skip reasons (latest bundle)

- Skip ETHFIUSDC: Grid waiting for ladder slot or inventory (14)
- Skip SOLUSDC: Fee/edge filter (net -0.060% < 0.052%) (14)
- Skip BTCUSDC: Fee/edge filter (net 0.000% < 0.052%) (14)
- Skip BTCUSDC: Fee/edge filter (net -0.023% < 0.052%) (12)
- Skip ETHBTC: Fee/edge filter (net -0.159% < 0.052%) (11)

## PM/BA automatic decision

- Decision: `continue`
- Required action: `continue active ticket`

## Bundle window

- 1. `autobot-feedback-20260322-063344.tgz` — dailyNet=-138.87, risk=NORMAL, top=Skip ETHFIUSDC: Grid waiting for ladder slot or inventory (14)
- 2. `autobot-feedback-20260321-165459.tgz` — dailyNet=18.54, risk=NORMAL, top=Skip ETHBTC: Fee/edge filter (net -0.166% < 0.052%) (15)
- 3. `autobot-feedback-20260321-093401.tgz` — dailyNet=16.88, risk=CAUTION, top=Skip: No feasible candidates: daily loss caution paused new symbols (57 filtered) (37)
- 4. `autobot-feedback-20260321-060548.tgz` — dailyNet=54.90, risk=NORMAL, top=Skip ETHBTC: Fee/edge filter (net -0.128% < 0.052%) (13)
- 5. `autobot-feedback-20260320-164744.tgz` — dailyNet=-84.61, risk=NORMAL, top=Skip SUIUSDC: Insufficient spendable USDC for grid BUY (15)

