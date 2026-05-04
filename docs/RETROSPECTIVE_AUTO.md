# Automatic Retrospective

Last updated: 2026-05-04T08:43:15.346Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260504-084256.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip BTCUSDC: Grid sell leg not actionable yet -> Skip BTCUSDC: Fee/edge filter (net 0.040% < 0.050%)
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — -301.36 | -0.26 | 0.22
- No KPI trend improvement across latest 3 fresh bundles: `FAIL` — daily=-301.36 | -0.26 | 0.22 ; maxDD=5.05 | 0.02 | 0.01

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `HALT`
- Daily net: `-301.36`
- Max drawdown: `5.05%`
- Open positions: `9`
- Total alloc pct: `14.18`

## Top skip reasons (latest bundle)

- Skip BTCUSDC: Fee/edge filter (net 0.040% < 0.050%) (10)
- Skip BABYUSDC: Post stop-loss cooldown active (7)
- Skip BABYUSDC: Grid sell sizing rejected (Below minQty 1.00000000) (7)
- Skip: No eligible universe candidates after policy and lock filters (7)
- Skip BTCUSDC: Fee/edge filter (net 0.037% < 0.050%) (5)

## PM/BA automatic decision

- Decision: `patch_required`
- Required action: `same-ticket mitigation required before next long run`

## Bundle window

- 1. `autobot-feedback-20260504-084256.tgz` — class=fresh, dailyNet=-301.36, risk=HALT, top=Skip BTCUSDC: Fee/edge filter (net 0.040% < 0.050%) (10)
- 2. `autobot-feedback-20260430-081918.tgz` — class=fresh, dailyNet=-0.26, risk=NORMAL, top=Skip BTCUSDC: Grid sell leg not actionable yet (86)
- 3. `autobot-feedback-20260429-120806.tgz` — class=fresh, dailyNet=0.22, risk=NORMAL, top=Skip BTCUSDC: Grid sell leg not actionable yet (63)
- 4. `autobot-feedback-20260428-102858.tgz` — class=fresh, dailyNet=0.26, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (59)
- 5. `autobot-feedback-20260427-113318.tgz` — class=baseline, dailyNet=-0.84, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (70)

