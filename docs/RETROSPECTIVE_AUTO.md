# Automatic Retrospective

Last updated: 2026-04-17T16:40:29.722Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260417-164018.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `FAIL` — "Skip: No feasible candidates after policy/exposure filters" (75 -> 61)
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — -63.41 | -53.44 | 54.69
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-63.41 | -53.44 | 54.69 ; maxDD=1.62 | 1.44 | 2.68

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `CAUTION`
- Daily net: `-63.41`
- Max drawdown: `1.62%`
- Open positions: `4`
- Total alloc pct: `0.22`

## Top skip reasons (latest bundle)

- Skip: No feasible candidates after policy/exposure filters (61)
- Skip TAOUSDC: Grid sell leg not actionable yet (8)
- Skip 1000SATSUSDC: Grid sell leg not actionable yet (8)
- Skip SUIUSDC: Grid sell leg not actionable yet (8)
- Skip NEIROUSDC: Grid sell leg not actionable yet (8)

## PM/BA automatic decision

- Decision: `patch_required`
- Required action: `same-ticket mitigation required before next long run`

## Bundle window

- 1. `autobot-feedback-20260417-164018.tgz` — class=fresh, dailyNet=-63.41, risk=CAUTION, top=Skip: No feasible candidates after policy/exposure filters (61)
- 2. `autobot-feedback-20260417-074005.tgz` — class=fresh, dailyNet=-53.44, risk=CAUTION, top=Skip: No feasible candidates after policy/exposure filters (75)
- 3. `autobot-feedback-20260416-082447.tgz` — class=fresh, dailyNet=54.69, risk=NORMAL, top=Skip: No feasible candidates after sizing/cap filters (8 rejected) (26)
- 4. `autobot-feedback-20260415-164608.tgz` — class=fresh, dailyNet=-79.00, risk=NORMAL, top=Skip XRPETH: Fee/edge filter (net -0.075% < 0.052%) (12)
- 5. `autobot-feedback-20260415-072942.tgz` — class=baseline, dailyNet=-109.67, risk=HALT, top=Skip ETHUSDC: Grid sell leg not actionable yet (15)

