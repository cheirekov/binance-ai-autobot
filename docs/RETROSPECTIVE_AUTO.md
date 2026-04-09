# Automatic Retrospective

Last updated: 2026-04-09T07:17:33.865Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260409-071715.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip ETHUSDC: Grid sell leg not actionable yet -> Skip BTCUSDC: Grid sell leg not actionable yet
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — -0.89 | 1.59 | 153.19
- No KPI trend improvement across latest 3 fresh bundles: `FAIL` — daily=-0.89 | 1.59 | 153.19 ; maxDD=5.29 | 5.29 | 5.29

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `-0.89`
- Max drawdown: `5.29%`
- Open positions: `11`
- Total alloc pct: `0.99`

## Top skip reasons (latest bundle)

- Skip BTCUSDC: Grid sell leg not actionable yet (30)
- Skip TAOUSDC: Grid sell leg not actionable yet (29)
- Skip TAOUSDC: Protection lock COOLDOWN: Cooldown after non-actionable sell leg (900s) (25)
- Skip ZECUSDC: Grid sell leg not actionable yet (11)
- Skip XRPUSDC: Grid sell leg not actionable yet (8)

## PM/BA automatic decision

- Decision: `patch_required`
- Required action: `same-ticket mitigation required before next long run`

## Bundle window

- 1. `autobot-feedback-20260409-071715.tgz` — class=fresh, dailyNet=-0.89, risk=NORMAL, top=Skip BTCUSDC: Grid sell leg not actionable yet (30)
- 2. `autobot-feedback-20260408-130935.tgz` — class=fresh, dailyNet=1.59, risk=NORMAL, top=Skip ETHUSDC: Grid sell leg not actionable yet (28)
- 3. `autobot-feedback-20260407-181242.tgz` — class=fresh, dailyNet=153.19, risk=NORMAL, top=Skip ETHUSDC: Grid sell leg not actionable yet (31)
- 4. `autobot-feedback-20260407-055241.tgz` — class=fresh, dailyNet=-99.51, risk=NORMAL, top=Skip ETHUSDC: Grid sell leg not actionable yet (91)
- 5. `autobot-feedback-20260405-184019.tgz` — class=baseline, dailyNet=-96.05, risk=CAUTION, top=Skip SOLVUSDC: Protection lock COOLDOWN: Cooldown after non-actionable sell leg (900s) (39)

