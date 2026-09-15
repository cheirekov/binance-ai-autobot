# Automatic Retrospective

Last updated: 2026-09-12T09:38:15.184Z
Active ticket: `T-026`
Latest bundle: `autobot-feedback-20260912-093754.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — "Skip BTCUSDC: Risk budget blocked new exposure" (41 -> 13; latestShare=6.5%; improving 68.3%)
- Negative daily_net_usdt across latest 3 fresh bundles: `FAIL` — -8.65 | -10.67 | -40.19
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-8.65 | -10.67 | -40.19 ; maxDD=0.30 | 0.48 | 1.22
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `-8.65`
- Max drawdown: `0.30%`
- Open positions: `9`
- Total alloc pct: `1.88`

## Top skip reasons (latest bundle)

- Skip BTCUSDC: Risk budget blocked new exposure (13)
- Skip 牛来USDC: Risk budget blocked new exposure (10)
- Skip BNBUSDC: Risk budget blocked new exposure (9)
- Order rejected (entry-market-buy:BUY) for 牛来USDC (testnet): Unknown symbol (ccxt): 牛来USDC (8)
- Skip ETHUSDC: Fee/edge filter (net 0.215% < 0.559%) (8)

## PM/BA automatic decision

- Decision: `validation_required`
- Required action: `continue deterministic calibration/replay; live-market churn is supporting evidence and cannot require a runtime patch`
- Deterministic calibration mode: `enabled`
- Live evidence policy: `supporting input only; promotion requires replay/calibration acceptance`

## Bundle window

- 1. `autobot-feedback-20260912-093754.tgz` — class=fresh, dailyNet=-8.65, risk=NORMAL, top=Skip BTCUSDC: Risk budget blocked new exposure (13)
- 2. `autobot-feedback-20260831-084332.tgz` — class=fresh, dailyNet=-10.67, risk=NORMAL, top=Skip BTCUSDC: Risk budget blocked new exposure (41)
- 3. `autobot-feedback-20260810-062844.tgz` — class=fresh, dailyNet=-40.19, risk=NORMAL, top=Skip ETHUSDC: Risk budget blocked new exposure (45)
- 4. `autobot-feedback-20260721-114241.tgz` — class=fresh, dailyNet=-17.89, risk=NORMAL, top=Skip SOLUSDC: Risk budget blocked new exposure (40)
- 5. `autobot-feedback-20260714-075300.tgz` — class=baseline, dailyNet=-31.07, risk=NORMAL, top=Skip ETHUSDC: Risk budget blocked new exposure (49)
