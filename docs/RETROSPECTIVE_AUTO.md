# Automatic Retrospective

Last updated: 2026-03-19T12:49:51.178Z
Active ticket: `T-034`
Latest bundle: `autobot-feedback-20260319-124933.tgz`
Review window: `5` local bundle(s)

## Hard rules

- Repeated dominant loop across latest 2 bundles: `PASS` — Skip BNBETH: Insufficient spendable ETH for grid BUY -> Skip XRPUSDC: Insufficient spendable USDC for grid BUY
- Negative daily_net_usdt across latest 3 bundles: `FAIL` — -285.84 | -269.75 | -269.75
- No KPI trend improvement across latest 3 bundles: `FAIL` — daily=-285.84 | -269.75 | -269.75 ; maxDD=6.12 | 5.47 | 5.46

## Latest bundle snapshot

- Risk state: `NORMAL`
- Daily net: `-285.84`
- Max drawdown: `6.12%`
- Open positions: `10`
- Total alloc pct: `100.00`

## Top skip reasons (latest bundle)

- Skip XRPUSDC: Insufficient spendable USDC for grid BUY (14)
- Skip ETHBTC: Fee/edge filter (net -0.048% < 0.052%) (11)
- Skip BNBETH: Insufficient spendable ETH for grid BUY (7)
- Skip BTCUSDC: Grid guard paused BUY leg (6)
- Skip TAOUSDC: Insufficient spendable USDC for grid BUY (6)

## PM/BA automatic decision

- Decision: `pivot_required`
- Required action: `PM/BA pivot review required before next long run`

## Bundle window

- 1. `autobot-feedback-20260319-124933.tgz` — dailyNet=-285.84, risk=NORMAL, top=Skip XRPUSDC: Insufficient spendable USDC for grid BUY (14)
- 2. `autobot-feedback-20260319-082411.tgz` — dailyNet=-269.75, risk=CAUTION, top=Skip BNBETH: Insufficient spendable ETH for grid BUY (17)
- 3. `autobot-feedback-20260318-171743.tgz` — dailyNet=-269.75, risk=CAUTION, top=Skip BNBETH: Insufficient spendable ETH for grid BUY (17)
- 4. `autobot-feedback-20260317-131955.tgz` — dailyNet=-14.73, risk=NORMAL, top=Skip FETUSDC: Insufficient spendable USDC for grid BUY (13)
- 5. `autobot-feedback-20260317-071016.tgz` — dailyNet=-27.42, risk=CAUTION, top=Skip PEPEUSDC: Entry cooldown active (24)

