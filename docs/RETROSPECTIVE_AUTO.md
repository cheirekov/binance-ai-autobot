# Automatic Retrospective

Last updated: 2026-03-20T13:49:40.983Z
Active ticket: `T-034`
Latest bundle: `autobot-feedback-20260320-134927.tgz`
Review window: `5` local bundle(s)

## Hard rules

- Repeated dominant loop across latest 2 bundles: `PASS` — Skip BNBUSDC: Insufficient spendable USDC for grid BUY -> Skip TAOUSDC: Insufficient spendable USDC for grid BUY
- Negative daily_net_usdt across latest 3 bundles: `PASS` — -72.09 | 6.54 | -285.84
- No KPI trend improvement across latest 3 bundles: `PASS` — daily=-72.09 | 6.54 | -285.84 ; maxDD=2.65 | 1.83 | 6.12

## Latest bundle snapshot

- Risk state: `NORMAL`
- Daily net: `-72.09`
- Max drawdown: `2.65%`
- Open positions: `9`
- Total alloc pct: `100.00`

## Top skip reasons (latest bundle)

- Skip TAOUSDC: Insufficient spendable USDC for grid BUY (10)
- Skip XRPUSDC: Insufficient spendable USDC for grid BUY (8)
- Skip ETHBTC: Grid guard paused BUY leg (8)
- Skip BNBUSDC: Insufficient spendable USDC for grid BUY (7)
- Skip ETHUSDC: Insufficient spendable USDC for grid BUY (7)

## PM/BA automatic decision

- Decision: `continue`
- Required action: `continue active ticket`

## Bundle window

- 1. `autobot-feedback-20260320-134927.tgz` — dailyNet=-72.09, risk=NORMAL, top=Skip TAOUSDC: Insufficient spendable USDC for grid BUY (10)
- 2. `autobot-feedback-20260320-081418.tgz` — dailyNet=6.54, risk=NORMAL, top=Skip BNBUSDC: Insufficient spendable USDC for grid BUY (18)
- 3. `autobot-feedback-20260319-124933.tgz` — dailyNet=-285.84, risk=NORMAL, top=Skip XRPUSDC: Insufficient spendable USDC for grid BUY (14)
- 4. `autobot-feedback-20260319-082411.tgz` — dailyNet=-269.75, risk=CAUTION, top=Skip BNBETH: Insufficient spendable ETH for grid BUY (17)
- 5. `autobot-feedback-20260318-171743.tgz` — dailyNet=-269.75, risk=CAUTION, top=Skip BNBETH: Insufficient spendable ETH for grid BUY (17)

