# Automatic Retrospective

Last updated: 2026-03-19T08:24:29.455Z
Active ticket: `T-032`
Latest bundle: `autobot-feedback-20260319-082411.tgz`
Review window: `5` local bundle(s)

## Hard rules

- Repeated dominant loop across latest 2 bundles: `FAIL` — "Skip BNBETH: Insufficient spendable ETH for grid BUY" (17 -> 17)
- Negative daily_net_usdt across latest 3 bundles: `FAIL` — -269.75 | -269.75 | -14.73
- No KPI trend improvement across latest 3 bundles: `FAIL` — daily=-269.75 | -269.75 | -14.73 ; maxDD=5.47 | 5.46 | 2.84

## Latest bundle snapshot

- Risk state: `CAUTION`
- Daily net: `-269.75`
- Max drawdown: `5.47%`
- Open positions: `10`
- Total alloc pct: `0.16`

## Top skip reasons (latest bundle)

- Skip BNBETH: Insufficient spendable ETH for grid BUY (17)
- Skip XRPUSDC: Insufficient spendable USDC for grid BUY (13)
- Skip ASTERUSDC: Insufficient spendable USDC for grid BUY (10)
- Skip ETHUSDC: Grid waiting for ladder slot or inventory (10)
- Skip ROBOUSDC: Grid sell sizing rejected (Below minQty 1.00000000) (9)

## PM/BA automatic decision

- Decision: `pivot_required`
- Required action: `PM/BA pivot review required before next long run`

## Bundle window

- 1. `autobot-feedback-20260319-082411.tgz` — dailyNet=-269.75, risk=CAUTION, top=Skip BNBETH: Insufficient spendable ETH for grid BUY (17)
- 2. `autobot-feedback-20260318-171743.tgz` — dailyNet=-269.75, risk=CAUTION, top=Skip BNBETH: Insufficient spendable ETH for grid BUY (17)
- 3. `autobot-feedback-20260317-131955.tgz` — dailyNet=-14.73, risk=NORMAL, top=Skip FETUSDC: Insufficient spendable USDC for grid BUY (13)
- 4. `autobot-feedback-20260317-071016.tgz` — dailyNet=-27.42, risk=CAUTION, top=Skip PEPEUSDC: Entry cooldown active (24)
- 5. `autobot-feedback-20260316-173623.tgz` — dailyNet=2.00, risk=NORMAL, top=Skip TAOUSDC: Insufficient spendable USDC for grid BUY (25)

