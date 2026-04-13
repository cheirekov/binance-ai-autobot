# Automatic Retrospective

Last updated: 2026-04-13T08:22:15.724Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260413-082204.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip WLDUSDC: Protection lock COOLDOWN: Cooldown after non-actionable sell leg (900s) -> Skip: No feasible candidates: daily loss caution paused new symbols (58 filtered)
- Negative daily_net_usdt across latest 3 fresh bundles: `FAIL` — -154.33 | -190.97 | -77.21
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-154.33 | -190.97 | -77.21 ; maxDD=5.49 | 2.93 | 2.93

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `CAUTION`
- Daily net: `-154.33`
- Max drawdown: `5.49%`
- Open positions: `8`
- Total alloc pct: `0.53`

## Top skip reasons (latest bundle)

- Skip: No feasible candidates: daily loss caution paused new symbols (58 filtered) (13)
- Skip 币安人生USDC: Grid sell leg not actionable yet (12)
- Skip GIGGLEUSDC: Grid sell leg not actionable yet (12)
- Skip ENJUSDC: Daily loss caution paused GRID BUY leg (12)
- Skip ETHUSDC: Grid sell leg not actionable yet (10)

## PM/BA automatic decision

- Decision: `patch_required`
- Required action: `same-ticket mitigation required before next long run`

## Bundle window

- 1. `autobot-feedback-20260413-082204.tgz` — class=fresh, dailyNet=-154.33, risk=CAUTION, top=Skip: No feasible candidates: daily loss caution paused new symbols (58 filtered) (13)
- 2. `autobot-feedback-20260412-180152.tgz` — class=fresh, dailyNet=-190.97, risk=CAUTION, top=Skip WLDUSDC: Protection lock COOLDOWN: Cooldown after non-actionable sell leg (900s) (19)
- 3. `autobot-feedback-20260412-054225.tgz` — class=fresh, dailyNet=-77.21, risk=CAUTION, top=Skip BTCUSDC: Grid sell leg not actionable yet (22)
- 4. `autobot-feedback-20260411-190327.tgz` — class=fresh, dailyNet=70.07, risk=NORMAL, top=Skip WLFIUSDC: Grid sell leg not actionable yet (12)
- 5. `autobot-feedback-20260411-135547.tgz` — class=baseline, dailyNet=-0.12, risk=NORMAL, top=Skip XRPUSDC: Fee/edge filter (net -0.032% < 0.052%) (13)

