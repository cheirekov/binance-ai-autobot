# Automatic Retrospective

Last updated: 2026-04-30T08:21:10.267Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260430-081918.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `FAIL` — "Skip BTCUSDC: Grid sell leg not actionable yet" (63 -> 86)
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — -0.26 | 0.22 | 0.26
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-0.26 | 0.22 | 0.26 ; maxDD=0.02 | 0.01 | 0.02

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `-0.26`
- Max drawdown: `0.02%`
- Open positions: `8`
- Total alloc pct: `9.23`

## Top skip reasons (latest bundle)

- Skip BTCUSDC: Grid sell leg not actionable yet (86)
- Skip BTCUSDC: Grid guard paused BUY leg (85)
- Skip PENGUUSDC: Grid sell leg not actionable yet (12)
- Skip PENGUUSDC: Protection lock COOLDOWN: Cooldown after non-actionable sell leg (900s) (6)
- Skip PENGUUSDC: Protection lock COOLDOWN: Skip storm (3/3): Grid sell leg not actionable yet (3600s) (5)

## PM/BA automatic decision

- Decision: `patch_required`
- Required action: `same-ticket mitigation required before next long run`

## Bundle window

- 1. `autobot-feedback-20260430-081918.tgz` — class=fresh, dailyNet=-0.26, risk=NORMAL, top=Skip BTCUSDC: Grid sell leg not actionable yet (86)
- 2. `autobot-feedback-20260429-120806.tgz` — class=fresh, dailyNet=0.22, risk=NORMAL, top=Skip BTCUSDC: Grid sell leg not actionable yet (63)
- 3. `autobot-feedback-20260428-102858.tgz` — class=fresh, dailyNet=0.26, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (59)
- 4. `autobot-feedback-20260427-113318.tgz` — class=fresh, dailyNet=-0.84, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (70)
- 5. `autobot-feedback-20260424-082814.tgz` — class=baseline, dailyNet=0.55, risk=NORMAL, top=Skip XRPUSDC: Fee/edge filter (net -0.020% < 0.052%) (15)

