# Automatic Retrospective

Last updated: 2026-04-15T07:29:53.411Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260415-072942.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip 币安人生USDC: Grid sell leg not actionable yet -> Skip ETHUSDC: Grid sell leg not actionable yet
- Negative daily_net_usdt across latest 3 fresh bundles: `FAIL` — -109.67 | -39.80 | -153.94
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-109.67 | -39.80 | -153.94 ; maxDD=7.18 | 5.65 | 5.49

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `HALT`
- Daily net: `-109.67`
- Max drawdown: `7.18%`
- Open positions: `14`
- Total alloc pct: `9.62`

## Top skip reasons (latest bundle)

- Skip ETHUSDC: Grid sell leg not actionable yet (15)
- Skip 币安人生USDC: Grid sell leg not actionable yet (13)
- Skip GIGGLEUSDC: Protection lock COOLDOWN: Skip storm (3/3): Grid sell leg not actionable yet (3600s) (13)
- Skip ZAMAUSDC: Grid sell leg not actionable yet (10)
- Skip ETHUSDC: Grid guard paused BUY leg (7)

## PM/BA automatic decision

- Decision: `patch_required`
- Required action: `same-ticket mitigation required before next long run`

## Bundle window

- 1. `autobot-feedback-20260415-072942.tgz` — class=fresh, dailyNet=-109.67, risk=HALT, top=Skip ETHUSDC: Grid sell leg not actionable yet (15)
- 2. `autobot-feedback-20260414-090828.tgz` — class=fresh, dailyNet=-39.80, risk=NORMAL, top=Skip 币安人生USDC: Grid sell leg not actionable yet (32)
- 3. `autobot-feedback-20260413-161359.tgz` — class=fresh, dailyNet=-153.94, risk=CAUTION, top=Skip GIGGLEUSDC: Protection lock COOLDOWN: Cooldown after non-actionable sell leg (900s) (38)
- 4. `autobot-feedback-20260413-082204.tgz` — class=fresh, dailyNet=-154.33, risk=CAUTION, top=Skip: No feasible candidates: daily loss caution paused new symbols (58 filtered) (13)
- 5. `autobot-feedback-20260412-180152.tgz` — class=baseline, dailyNet=-190.97, risk=CAUTION, top=Skip WLDUSDC: Protection lock COOLDOWN: Cooldown after non-actionable sell leg (900s) (19)

