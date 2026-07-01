# Automatic Retrospective

Last updated: 2026-07-01T08:58:52.396Z
Active ticket: `T-040`
Latest bundle: `autobot-feedback-20260701-085837.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip: No feasible candidates after policy/exposure filters -> Skip SOLUSDC: Risk budget blocked new exposure
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — -46.55 | 3.07 | -39.77
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-46.55 | 3.07 | -39.77 ; maxDD=1.54 | 1.29 | 1.09
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `CAUTION`
- Daily net: `-46.55`
- Max drawdown: `1.54%`
- Open positions: `3`
- Total alloc pct: `0.12`

## Top skip reasons (latest bundle)

- Skip SOLUSDC: Risk budget blocked new exposure (54)
- Skip ETHUSDC: Risk budget blocked new exposure (40)
- Skip AIGENSYNUSDC: Risk budget market entry cap below exchange minimum (23)
- Skip SYNUSDC: Grid sell leg not actionable yet (6)
- Skip SYNUSDC: Risk budget paused GRID BUY leg (5)

## PM/BA automatic decision

- Decision: `continue`
- Required action: `continue active ticket`
- Production readiness mode: `enabled`
- Patch policy: `runtime patches require P0/P1 safety severity plus deterministic reproduction`

## Bundle window

- 1. `autobot-feedback-20260701-085837.tgz` — class=fresh, dailyNet=-46.55, risk=CAUTION, top=Skip SOLUSDC: Risk budget blocked new exposure (54)
- 2. `autobot-feedback-20260619-085557.tgz` — class=fresh, dailyNet=3.07, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (80)
- 3. `autobot-feedback-20260618-090049.tgz` — class=fresh, dailyNet=-39.77, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (45)
- 4. `autobot-feedback-20260617-093804.tgz` — class=fresh, dailyNet=-29.62, risk=NORMAL, top=Skip BTCUSDC: Risk budget blocked new exposure (62)
- 5. `autobot-feedback-20260616-152318.tgz` — class=baseline, dailyNet=-12.74, risk=NORMAL, top=Skip BTCUSDC: Risk budget blocked new exposure (58)
