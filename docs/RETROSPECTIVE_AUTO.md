# Automatic Retrospective

Last updated: 2026-03-21T06:06:23.284Z
Active ticket: `T-034`
Latest bundle: `autobot-feedback-20260321-060548.tgz`
Review window: `5` local bundle(s)

## Hard rules

- Repeated dominant loop across latest 2 bundles: `PASS` — Skip SUIUSDC: Insufficient spendable USDC for grid BUY -> Skip ETHBTC: Fee/edge filter (net -0.128% < 0.052%)
- Negative daily_net_usdt across latest 3 bundles: `PASS` — 54.90 | -84.61 | -72.09
- No KPI trend improvement across latest 3 bundles: `PASS` — daily=54.90 | -84.61 | -72.09 ; maxDD=3.06 | 3.06 | 2.65

## Latest bundle snapshot

- Risk state: `NORMAL`
- Daily net: `54.90`
- Max drawdown: `3.06%`
- Open positions: `6`
- Total alloc pct: `18.36`

## Top skip reasons (latest bundle)

- Skip ETHBTC: Fee/edge filter (net -0.128% < 0.052%) (13)
- Skip SOLUSDC: Fee/edge filter (net 0.049% < 0.052%) (11)
- Skip ETHBTC: Fee/edge filter (net -0.129% < 0.052%) (11)
- Skip WBTCBTC: Fee/edge filter (net -0.234% < 0.052%) (8)
- Skip ETHUSDC: Grid sell sizing rejected (Below minQty 0.00010000) (7)

## PM/BA automatic decision

- Decision: `continue`
- Required action: `continue active ticket`

## Bundle window

- 1. `autobot-feedback-20260321-060548.tgz` — dailyNet=54.90, risk=NORMAL, top=Skip ETHBTC: Fee/edge filter (net -0.128% < 0.052%) (13)
- 2. `autobot-feedback-20260320-164744.tgz` — dailyNet=-84.61, risk=NORMAL, top=Skip SUIUSDC: Insufficient spendable USDC for grid BUY (15)
- 3. `autobot-feedback-20260320-134927.tgz` — dailyNet=-72.09, risk=NORMAL, top=Skip TAOUSDC: Insufficient spendable USDC for grid BUY (10)
- 4. `autobot-feedback-20260320-081418.tgz` — dailyNet=6.54, risk=NORMAL, top=Skip BNBUSDC: Insufficient spendable USDC for grid BUY (18)
- 5. `autobot-feedback-20260319-124933.tgz` — dailyNet=-285.84, risk=NORMAL, top=Skip XRPUSDC: Insufficient spendable USDC for grid BUY (14)

