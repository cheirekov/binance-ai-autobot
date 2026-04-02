# Automatic Retrospective

Last updated: 2026-04-02T08:13:25.199Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260402-081314.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip BNBETH: Grid guard paused BUY leg -> Skip: No feasible candidates after policy/exposure filters
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — -250.94 | 129.39 | 235.33
- No KPI trend improvement across latest 3 fresh bundles: `FAIL` — daily=-250.94 | 129.39 | 235.33 ; maxDD=6.37 | 1.88 | 1.22

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `CAUTION`
- Daily net: `-250.94`
- Max drawdown: `6.37%`
- Open positions: `8`
- Total alloc pct: `11.69`

## Top skip reasons (latest bundle)

- Skip: No feasible candidates after policy/exposure filters (9)
- Skip ETHUSDC: Grid sell sizing rejected (Below minNotional 5.00000000 at LIMIT price (need qty ≥ 0.0025)) (8)
- Skip ETHUSDC: Grid guard paused BUY leg (8)
- Skip BTCUSDC: Grid sell sizing rejected (Below minQty 0.00001000) (7)
- Skip BNBUSDC: Grid guard paused BUY leg (7)

## PM/BA automatic decision

- Decision: `patch_required`
- Required action: `same-ticket mitigation required before next long run`

## Bundle window

- 1. `autobot-feedback-20260402-081314.tgz` — class=fresh, dailyNet=-250.94, risk=CAUTION, top=Skip: No feasible candidates after policy/exposure filters (9)
- 2. `autobot-feedback-20260401-150741.tgz` — class=fresh, dailyNet=129.39, risk=NORMAL, top=Skip BNBETH: Grid guard paused BUY leg (10)
- 3. `autobot-feedback-20260401-083229.tgz` — class=fresh, dailyNet=235.33, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (6)
- 4. `autobot-feedback-20260331-170410.tgz` — class=fresh, dailyNet=74.14, risk=NORMAL, top=Skip: No feasible candidates after sizing/cap filters (8 rejected) (8)
- 5. `autobot-feedback-20260331-084549.tgz` — class=baseline, dailyNet=-155.28, risk=CAUTION, top=Skip NOMUSDC: Post stop-loss cooldown active (45)

