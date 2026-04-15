# Automatic Retrospective

Last updated: 2026-04-15T16:46:20.636Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260415-164608.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip ETHUSDC: Grid sell leg not actionable yet -> Skip XRPETH: Fee/edge filter (net -0.075% < 0.052%)
- Negative daily_net_usdt across latest 3 fresh bundles: `FAIL` — -79.00 | -109.67 | -39.80
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-79.00 | -109.67 | -39.80 ; maxDD=7.41 | 7.18 | 5.65

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `-79.00`
- Max drawdown: `7.41%`
- Open positions: `12`
- Total alloc pct: `41.04`

## Top skip reasons (latest bundle)

- Skip XRPETH: Fee/edge filter (net -0.075% < 0.052%) (12)
- Skip XRPETH: Fee/edge filter (net -0.073% < 0.052%) (7)
- Skip BNBETH: Fee/edge filter (net -0.061% < 0.052%) (6)
- Skip ETHUSDC: Grid waiting for ladder slot or inventory (6)
- Skip XRPETH: Fee/edge filter (net -0.089% < 0.052%) (6)

## PM/BA automatic decision

- Decision: `patch_required`
- Required action: `same-ticket mitigation required before next long run`

## Bundle window

- 1. `autobot-feedback-20260415-164608.tgz` — class=fresh, dailyNet=-79.00, risk=NORMAL, top=Skip XRPETH: Fee/edge filter (net -0.075% < 0.052%) (12)
- 2. `autobot-feedback-20260415-072942.tgz` — class=fresh, dailyNet=-109.67, risk=HALT, top=Skip ETHUSDC: Grid sell leg not actionable yet (15)
- 3. `autobot-feedback-20260414-090828.tgz` — class=fresh, dailyNet=-39.80, risk=NORMAL, top=Skip 币安人生USDC: Grid sell leg not actionable yet (32)
- 4. `autobot-feedback-20260413-161359.tgz` — class=fresh, dailyNet=-153.94, risk=CAUTION, top=Skip GIGGLEUSDC: Protection lock COOLDOWN: Cooldown after non-actionable sell leg (900s) (38)
- 5. `autobot-feedback-20260413-082204.tgz` — class=baseline, dailyNet=-154.33, risk=CAUTION, top=Skip: No feasible candidates: daily loss caution paused new symbols (58 filtered) (13)

