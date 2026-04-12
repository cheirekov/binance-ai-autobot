# Automatic Retrospective

Last updated: 2026-04-12T18:02:25.906Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260412-180152.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip BTCUSDC: Grid sell leg not actionable yet -> Skip WLDUSDC: Protection lock COOLDOWN: Cooldown after non-actionable sell leg (900s)
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — -190.97 | -77.21 | 70.07
- No KPI trend improvement across latest 3 fresh bundles: `FAIL` — daily=-190.97 | -77.21 | 70.07 ; maxDD=2.93 | 2.93 | 1.27

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `CAUTION`
- Daily net: `-190.97`
- Max drawdown: `2.93%`
- Open positions: `5`
- Total alloc pct: `0.30`

## Top skip reasons (latest bundle)

- Skip WLDUSDC: Protection lock COOLDOWN: Cooldown after non-actionable sell leg (900s) (19)
- Skip WLDUSDC: Grid sell leg not actionable yet (17)
- Skip ETHUSDC: Grid sell leg not actionable yet (14)
- Skip ETHUSDC: Grid guard paused BUY leg (14)
- Skip BTCUSDC: Grid sell leg not actionable yet (12)

## PM/BA automatic decision

- Decision: `patch_required`
- Required action: `same-ticket mitigation required before next long run`

## Bundle window

- 1. `autobot-feedback-20260412-180152.tgz` — class=fresh, dailyNet=-190.97, risk=CAUTION, top=Skip WLDUSDC: Protection lock COOLDOWN: Cooldown after non-actionable sell leg (900s) (19)
- 2. `autobot-feedback-20260412-054225.tgz` — class=fresh, dailyNet=-77.21, risk=CAUTION, top=Skip BTCUSDC: Grid sell leg not actionable yet (22)
- 3. `autobot-feedback-20260411-190327.tgz` — class=fresh, dailyNet=70.07, risk=NORMAL, top=Skip WLFIUSDC: Grid sell leg not actionable yet (12)
- 4. `autobot-feedback-20260411-135547.tgz` — class=fresh, dailyNet=-0.12, risk=NORMAL, top=Skip XRPUSDC: Fee/edge filter (net -0.032% < 0.052%) (13)
- 5. `autobot-feedback-20260411-074053.tgz` — class=baseline, dailyNet=-0.20, risk=NORMAL, top=Skip BTCUSDC: Grid sell leg not actionable yet (12)

