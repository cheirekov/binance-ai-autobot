# Automatic Retrospective

Last updated: 2026-06-19T08:56:09.811Z
Active ticket: `T-040`
Latest bundle: `autobot-feedback-20260619-085557.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `FAIL` — "Skip: No feasible candidates after policy/exposure filters" (45 -> 80; latestShare=40.0%; material persistent loop)
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — 3.07 | -39.77 | -29.62
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=3.07 | -39.77 | -29.62 ; maxDD=1.29 | 1.09 | 0.65
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `3.07`
- Max drawdown: `1.29%`
- Open positions: `7`
- Total alloc pct: `0.10`

## Top skip reasons (latest bundle)

- Skip: No feasible candidates after policy/exposure filters (80)
- Skip NEARUSDC: Risk budget blocked new exposure (11)
- Skip NEARUSDC: Fee/edge filter (net 0.545% < 0.559%) (3)
- Skip NEARUSDC: Grid sell sizing rejected (Below minQty 0.10000000) (3)
- Skip NEARUSDC: Fee/edge filter (net 0.538% < 0.559%) (2)

## PM/BA automatic decision

- Decision: `validation_required`
- Required action: `classify severity and add deterministic validation before any runtime patch; live-market churn alone is not a beta blocker`
- Production readiness mode: `enabled`
- Patch policy: `runtime patches require P0/P1 safety severity plus deterministic reproduction`

## Bundle window

- 1. `autobot-feedback-20260619-085557.tgz` — class=fresh, dailyNet=3.07, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (80)
- 2. `autobot-feedback-20260618-090049.tgz` — class=fresh, dailyNet=-39.77, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (45)
- 3. `autobot-feedback-20260617-093804.tgz` — class=fresh, dailyNet=-29.62, risk=NORMAL, top=Skip BTCUSDC: Risk budget blocked new exposure (62)
- 4. `autobot-feedback-20260616-152318.tgz` — class=fresh, dailyNet=-12.74, risk=NORMAL, top=Skip BTCUSDC: Risk budget blocked new exposure (58)
- 5. `autobot-feedback-20260615-065149.tgz` — class=baseline, dailyNet=-23.60, risk=NORMAL, top=Skip SOLUSDC: Risk budget market entry cap below exchange minimum (26)
