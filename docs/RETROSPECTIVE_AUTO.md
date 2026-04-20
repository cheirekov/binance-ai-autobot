# Automatic Retrospective

Last updated: 2026-04-20T14:57:11.582Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260420-145411.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `FAIL` — "Skip: No feasible candidates after policy/exposure filters" (42 -> 38)
- Negative daily_net_usdt across latest 3 fresh bundles: `FAIL` — -48.24 | -16.03 | -127.54
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-48.24 | -16.03 | -127.54 ; maxDD=4.13 | 4.13 | 3.86

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `HALT`
- Daily net: `-48.24`
- Max drawdown: `4.13%`
- Open positions: `8`
- Total alloc pct: `9.23`

## Top skip reasons (latest bundle)

- Skip: No feasible candidates after policy/exposure filters (38)
- Skip BOMEUSDC: Grid sell leg not actionable yet (8)
- Skip 币安人生USDC: Grid sell leg not actionable yet (8)
- Skip: Protection lock COOLDOWN (GLOBAL) (7)
- Skip BLURUSDC: Grid sell leg not actionable yet (6)

## PM/BA automatic decision

- Decision: `pivot_required`
- Required action: `PM/BA pivot review required before next long run`

## Bundle window

- 1. `autobot-feedback-20260420-145411.tgz` — class=fresh, dailyNet=-48.24, risk=HALT, top=Skip: No feasible candidates after policy/exposure filters (38)
- 2. `autobot-feedback-20260420-083837.tgz` — class=fresh, dailyNet=-16.03, risk=CAUTION, top=Skip: No feasible candidates after policy/exposure filters (42)
- 3. `autobot-feedback-20260419-123151.tgz` — class=fresh, dailyNet=-127.54, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (14)
- 4. `autobot-feedback-20260417-164018.tgz` — class=fresh, dailyNet=-63.41, risk=CAUTION, top=Skip: No feasible candidates after policy/exposure filters (61)
- 5. `autobot-feedback-20260417-074005.tgz` — class=baseline, dailyNet=-53.44, risk=CAUTION, top=Skip: No feasible candidates after policy/exposure filters (75)

