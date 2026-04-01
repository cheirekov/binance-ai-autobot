# Automatic Retrospective

Last updated: 2026-04-01T15:08:22.973Z
Active ticket: `T-032`
Latest bundle: `autobot-feedback-20260401-150741.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip: No feasible candidates after policy/exposure filters -> Skip BNBETH: Grid guard paused BUY leg
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — 129.39 | 235.33 | 74.14
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=129.39 | 235.33 | 74.14 ; maxDD=1.88 | 1.22 | 3.11

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `129.39`
- Max drawdown: `1.88%`
- Open positions: `10`
- Total alloc pct: `43.93`

## Top skip reasons (latest bundle)

- Skip BNBETH: Grid guard paused BUY leg (10)
- Skip BNBETH: Grid waiting for ladder slot or inventory (8)
- Skip SOLETH: Grid waiting for ladder slot or inventory (6)
- Skip SOLETH: Grid guard paused BUY leg (6)
- Skip SOLBTC: Fee/edge filter (net -0.087% < 0.052%) (6)

## PM/BA automatic decision

- Decision: `continue`
- Required action: `continue active ticket`

## Bundle window

- 1. `autobot-feedback-20260401-150741.tgz` — class=fresh, dailyNet=129.39, risk=NORMAL, top=Skip BNBETH: Grid guard paused BUY leg (10)
- 2. `autobot-feedback-20260401-083229.tgz` — class=fresh, dailyNet=235.33, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (6)
- 3. `autobot-feedback-20260331-170410.tgz` — class=fresh, dailyNet=74.14, risk=NORMAL, top=Skip: No feasible candidates after sizing/cap filters (8 rejected) (8)
- 4. `autobot-feedback-20260331-084549.tgz` — class=fresh, dailyNet=-155.28, risk=CAUTION, top=Skip NOMUSDC: Post stop-loss cooldown active (45)
- 5. `autobot-feedback-20260330-135922.tgz` — class=baseline, dailyNet=-144.52, risk=CAUTION, top=Skip SUIUSDC: Daily loss caution paused GRID BUY leg (61)

