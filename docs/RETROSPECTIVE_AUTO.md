# Automatic Retrospective

Last updated: 2026-04-08T13:09:57.435Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260408-130935.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `FAIL` — "Skip ETHUSDC: Grid sell leg not actionable yet" (31 -> 28)
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — 1.59 | 153.19 | -99.51
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=1.59 | 153.19 | -99.51 ; maxDD=5.29 | 5.29 | 5.29

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `1.59`
- Max drawdown: `5.29%`
- Open positions: `11`
- Total alloc pct: `0.99`

## Top skip reasons (latest bundle)

- Skip ETHUSDC: Grid sell leg not actionable yet (28)
- Skip TAOUSDC: Protection lock COOLDOWN: Cooldown after non-actionable sell leg (900s) (25)
- Skip TAOUSDC: Grid sell leg not actionable yet (23)
- Skip BTCUSDC: Grid sell leg not actionable yet (21)
- Skip BTCUSDC: Grid guard paused BUY leg (12)

## PM/BA automatic decision

- Decision: `patch_required`
- Required action: `same-ticket mitigation required before next long run`

## Bundle window

- 1. `autobot-feedback-20260408-130935.tgz` — class=fresh, dailyNet=1.59, risk=NORMAL, top=Skip ETHUSDC: Grid sell leg not actionable yet (28)
- 2. `autobot-feedback-20260407-181242.tgz` — class=fresh, dailyNet=153.19, risk=NORMAL, top=Skip ETHUSDC: Grid sell leg not actionable yet (31)
- 3. `autobot-feedback-20260407-055241.tgz` — class=fresh, dailyNet=-99.51, risk=NORMAL, top=Skip ETHUSDC: Grid sell leg not actionable yet (91)
- 4. `autobot-feedback-20260405-184019.tgz` — class=fresh, dailyNet=-96.05, risk=CAUTION, top=Skip SOLVUSDC: Protection lock COOLDOWN: Cooldown after non-actionable sell leg (900s) (39)
- 5. `autobot-feedback-20260404-183649.tgz` — class=baseline, dailyNet=-22.49, risk=CAUTION, top=Skip STOUSDC: Grid sell leg not actionable yet (32)

