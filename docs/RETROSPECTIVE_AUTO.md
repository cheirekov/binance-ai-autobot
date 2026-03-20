# Automatic Retrospective

Last updated: 2026-03-20T08:14:49.137Z
Active ticket: `T-034`
Latest bundle: `autobot-feedback-20260320-081418.tgz`
Review window: `5` local bundle(s)

## Hard rules

- Repeated dominant loop across latest 2 bundles: `PASS` — Skip XRPUSDC: Insufficient spendable USDC for grid BUY -> Skip BNBUSDC: Insufficient spendable USDC for grid BUY
- Negative daily_net_usdt across latest 3 bundles: `PASS` — 6.54 | -285.84 | -269.75
- No KPI trend improvement across latest 3 bundles: `PASS` — daily=6.54 | -285.84 | -269.75 ; maxDD=1.83 | 6.12 | 5.47

## Latest bundle snapshot

- Risk state: `NORMAL`
- Daily net: `6.54`
- Max drawdown: `1.83%`
- Open positions: `8`
- Total alloc pct: `52.49`

## Top skip reasons (latest bundle)

- Skip BNBUSDC: Insufficient spendable USDC for grid BUY (18)
- Skip XRPUSDC: Insufficient spendable USDC for grid BUY (15)
- Skip TAOUSDC: Insufficient spendable USDC for grid BUY (15)
- Skip PAXGUSDC: Insufficient spendable USDC for grid BUY (11)
- Skip SUIUSDC: Insufficient spendable USDC for grid BUY (11)

## PM/BA automatic decision

- Decision: `continue`
- Required action: `continue active ticket`

## Bundle window

- 1. `autobot-feedback-20260320-081418.tgz` — dailyNet=6.54, risk=NORMAL, top=Skip BNBUSDC: Insufficient spendable USDC for grid BUY (18)
- 2. `autobot-feedback-20260319-124933.tgz` — dailyNet=-285.84, risk=NORMAL, top=Skip XRPUSDC: Insufficient spendable USDC for grid BUY (14)
- 3. `autobot-feedback-20260319-082411.tgz` — dailyNet=-269.75, risk=CAUTION, top=Skip BNBETH: Insufficient spendable ETH for grid BUY (17)
- 4. `autobot-feedback-20260318-171743.tgz` — dailyNet=-269.75, risk=CAUTION, top=Skip BNBETH: Insufficient spendable ETH for grid BUY (17)
- 5. `autobot-feedback-20260317-131955.tgz` — dailyNet=-14.73, risk=NORMAL, top=Skip FETUSDC: Insufficient spendable USDC for grid BUY (13)

