# Automatic Retrospective

Last updated: 2026-04-02T11:34:29.463Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260402-113357.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `FAIL` — "Skip: No feasible candidates after policy/exposure filters" (9 -> 21)
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — -158.18 | -250.94 | 129.39
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-158.18 | -250.94 | 129.39 ; maxDD=6.37 | 6.37 | 1.88

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `CAUTION`
- Daily net: `-158.18`
- Max drawdown: `6.37%`
- Open positions: `5`
- Total alloc pct: `4.96`

## Top skip reasons (latest bundle)

- Skip: No feasible candidates after policy/exposure filters (21)
- Skip ETHUSDC: Grid sell leg not actionable yet (8)
- Skip TAOUSDC: Grid sell leg not actionable yet (7)
- Skip BNBUSDC: Grid sell leg not actionable yet (7)
- Skip BNBUSDC: Grid guard paused BUY leg (7)

## PM/BA automatic decision

- Decision: `patch_required`
- Required action: `same-ticket mitigation required before next long run`

## Bundle window

- 1. `autobot-feedback-20260402-113357.tgz` — class=fresh, dailyNet=-158.18, risk=CAUTION, top=Skip: No feasible candidates after policy/exposure filters (21)
- 2. `autobot-feedback-20260402-081314.tgz` — class=fresh, dailyNet=-250.94, risk=CAUTION, top=Skip: No feasible candidates after policy/exposure filters (9)
- 3. `autobot-feedback-20260401-150741.tgz` — class=fresh, dailyNet=129.39, risk=NORMAL, top=Skip BNBETH: Grid guard paused BUY leg (10)
- 4. `autobot-feedback-20260401-083229.tgz` — class=fresh, dailyNet=235.33, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (6)
- 5. `autobot-feedback-20260331-170410.tgz` — class=baseline, dailyNet=74.14, risk=NORMAL, top=Skip: No feasible candidates after sizing/cap filters (8 rejected) (8)

