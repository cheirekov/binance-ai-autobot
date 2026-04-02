# Automatic Retrospective

Last updated: 2026-04-02T16:29:01.284Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260402-162840.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `FAIL` — "Skip: No feasible candidates after policy/exposure filters" (21 -> 31)
- Negative daily_net_usdt across latest 3 fresh bundles: `FAIL` — -144.24 | -158.18 | -250.94
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-144.24 | -158.18 | -250.94 ; maxDD=6.37 | 6.37 | 6.37

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `CAUTION`
- Daily net: `-144.24`
- Max drawdown: `6.37%`
- Open positions: `5`
- Total alloc pct: `4.95`

## Top skip reasons (latest bundle)

- Skip: No feasible candidates after policy/exposure filters (31)
- Skip STOUSDC: Grid sell leg not actionable yet (15)
- Skip NOMUSDC: Grid sell leg not actionable yet (13)
- Skip XPLUSDC: Grid sell leg not actionable yet (12)
- Skip BTCUSDC: Grid sell leg not actionable yet (10)

## PM/BA automatic decision

- Decision: `pivot_required`
- Required action: `PM/BA pivot review required before next long run`

## Bundle window

- 1. `autobot-feedback-20260402-162840.tgz` — class=fresh, dailyNet=-144.24, risk=CAUTION, top=Skip: No feasible candidates after policy/exposure filters (31)
- 2. `autobot-feedback-20260402-113357.tgz` — class=fresh, dailyNet=-158.18, risk=CAUTION, top=Skip: No feasible candidates after policy/exposure filters (21)
- 3. `autobot-feedback-20260402-081314.tgz` — class=fresh, dailyNet=-250.94, risk=CAUTION, top=Skip: No feasible candidates after policy/exposure filters (9)
- 4. `autobot-feedback-20260401-150741.tgz` — class=fresh, dailyNet=129.39, risk=NORMAL, top=Skip BNBETH: Grid guard paused BUY leg (10)
- 5. `autobot-feedback-20260401-083229.tgz` — class=baseline, dailyNet=235.33, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (6)

