# Automatic Retrospective

Last updated: 2026-04-23T08:06:04.379Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260423-080554.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `FAIL` — "Skip: No feasible candidates after policy/exposure filters" (75 -> 65)
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — -0.90 | -0.59 | 1.04
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-0.90 | -0.59 | 1.04 ; maxDD=0.04 | 0.03 | 2.42

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `-0.90`
- Max drawdown: `0.04%`
- Open positions: `8`
- Total alloc pct: `9.23`

## Top skip reasons (latest bundle)

- Skip: No feasible candidates after policy/exposure filters (65)
- Skip SPKUSDC: Grid sell leg not actionable yet (7)
- Skip ETHUSDC: Grid sell leg not actionable yet (7)
- Skip BTCUSDC: Grid sell leg not actionable yet (7)
- Skip RUNEUSDC: Grid sell leg not actionable yet (7)

## PM/BA automatic decision

- Decision: `patch_required`
- Required action: `same-ticket mitigation required before next long run`

## Bundle window

- 1. `autobot-feedback-20260423-080554.tgz` — class=fresh, dailyNet=-0.90, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (65)
- 2. `autobot-feedback-20260422-100621.tgz` — class=fresh, dailyNet=-0.59, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (75)
- 3. `autobot-feedback-20260421-083942.tgz` — class=fresh, dailyNet=1.04, risk=NORMAL, top=Skip SOLUSDC: Fee/edge filter (net 0.010% < 0.052%) (15)
- 4. `autobot-feedback-20260420-145411.tgz` — class=fresh, dailyNet=-48.24, risk=HALT, top=Skip: No feasible candidates after policy/exposure filters (38)
- 5. `autobot-feedback-20260420-083837.tgz` — class=baseline, dailyNet=-16.03, risk=CAUTION, top=Skip: No feasible candidates after policy/exposure filters (42)

