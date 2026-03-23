# Automatic Retrospective

Last updated: 2026-03-23T10:23:39.283Z
Active ticket: `T-032`
Latest bundle: `autobot-feedback-20260323-102308.tgz`
Review window: `5` local bundle(s)

## Hard rules

- Repeated dominant loop across latest 2 bundles: `FAIL` — "Skip BTCUSDC: Grid guard paused BUY leg" (17 -> 17)
- Negative daily_net_usdt across latest 3 bundles: `PASS` — 17.11 | 17.11 | -163.90
- No KPI trend improvement across latest 3 bundles: `PASS` — daily=17.11 | 17.11 | -163.90 ; maxDD=3.46 | 3.46 | 3.00

## Latest bundle snapshot

- Risk state: `NORMAL`
- Daily net: `17.11`
- Max drawdown: `3.46%`
- Open positions: `9`
- Total alloc pct: `100.00`

## Top skip reasons (latest bundle)

- Skip BTCUSDC: Grid guard paused BUY leg (17)
- Skip SOLUSDC: Grid waiting for ladder slot or inventory (16)
- Skip BTCUSDC: Grid waiting for ladder slot or inventory (16)
- Skip SOLUSDC: Grid guard paused BUY leg (15)
- Skip: No feasible candidates after policy/exposure filters (9)

## PM/BA automatic decision

- Decision: `patch_required`
- Required action: `same-ticket mitigation required before next long run`

## Bundle window

- 1. `autobot-feedback-20260323-102308.tgz` — dailyNet=17.11, risk=NORMAL, top=Skip BTCUSDC: Grid guard paused BUY leg (17)
- 2. `autobot-feedback-20260323-074326.tgz` — dailyNet=17.11, risk=NORMAL, top=Skip BTCUSDC: Grid guard paused BUY leg (17)
- 3. `autobot-feedback-20260322-155534.tgz` — dailyNet=-163.90, risk=HALT, top=Skip BTCUSDC: Fee/edge filter (net -0.023% < 0.052%) (12)
- 4. `autobot-feedback-20260322-063344.tgz` — dailyNet=-138.87, risk=NORMAL, top=Skip ETHFIUSDC: Grid waiting for ladder slot or inventory (14)
- 5. `autobot-feedback-20260321-165459.tgz` — dailyNet=18.54, risk=NORMAL, top=Skip ETHBTC: Fee/edge filter (net -0.166% < 0.052%) (15)

