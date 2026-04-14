# Automatic Retrospective

Last updated: 2026-04-14T09:08:38.389Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260414-090828.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip GIGGLEUSDC: Protection lock COOLDOWN: Cooldown after non-actionable sell leg (900s) -> Skip 币安人生USDC: Grid sell leg not actionable yet
- Negative daily_net_usdt across latest 3 fresh bundles: `FAIL` — -39.80 | -153.94 | -154.33
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-39.80 | -153.94 | -154.33 ; maxDD=5.65 | 5.49 | 5.49

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `-39.80`
- Max drawdown: `5.65%`
- Open positions: `10`
- Total alloc pct: `40.65`

## Top skip reasons (latest bundle)

- Skip 币安人生USDC: Grid sell leg not actionable yet (32)
- Skip GIGGLEUSDC: Protection lock COOLDOWN: Cooldown after non-actionable sell leg (900s) (30)
- Skip GIGGLEUSDC: Grid sell leg not actionable yet (28)
- Skip: No feasible candidates: daily loss caution paused new symbols (58 filtered) (13)
- Skip BTCUSDC: Daily loss caution paused GRID BUY leg (12)

## PM/BA automatic decision

- Decision: `patch_required`
- Required action: `same-ticket mitigation required before next long run`

## Bundle window

- 1. `autobot-feedback-20260414-090828.tgz` — class=fresh, dailyNet=-39.80, risk=NORMAL, top=Skip 币安人生USDC: Grid sell leg not actionable yet (32)
- 2. `autobot-feedback-20260413-161359.tgz` — class=fresh, dailyNet=-153.94, risk=CAUTION, top=Skip GIGGLEUSDC: Protection lock COOLDOWN: Cooldown after non-actionable sell leg (900s) (38)
- 3. `autobot-feedback-20260413-082204.tgz` — class=fresh, dailyNet=-154.33, risk=CAUTION, top=Skip: No feasible candidates: daily loss caution paused new symbols (58 filtered) (13)
- 4. `autobot-feedback-20260412-180152.tgz` — class=fresh, dailyNet=-190.97, risk=CAUTION, top=Skip WLDUSDC: Protection lock COOLDOWN: Cooldown after non-actionable sell leg (900s) (19)
- 5. `autobot-feedback-20260412-054225.tgz` — class=baseline, dailyNet=-77.21, risk=CAUTION, top=Skip BTCUSDC: Grid sell leg not actionable yet (22)

