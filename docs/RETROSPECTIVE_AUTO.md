# Automatic Retrospective

Last updated: 2026-08-31T09:11:12.687Z
Active ticket: `T-026`
Latest bundle: `autobot-feedback-20260831-084332.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip ETHUSDC: Risk budget blocked new exposure -> Skip BTCUSDC: Risk budget blocked new exposure
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — -10.67 | -40.19 | -17.89 (historical carryover suppressed: latest improved by 29.51 from prior fresh bundle)
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=-10.67 | -40.19 | -17.89 ; maxDD=0.48 | 1.22 | 0.64
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `-10.67`
- Max drawdown: `0.48%`
- Open positions: `9`
- Total alloc pct: `1.46`

## Top skip reasons (latest bundle)

- Skip BTCUSDC: Risk budget blocked new exposure (41)
- Skip: No feasible candidates after policy/exposure filters (36)
- Skip XRPUSDC: Risk budget blocked new exposure (15)
- Skip NEARUSDC: Risk budget blocked new exposure (14)
- Skip XRPUSDC: fresh long blocked by bearish breakdown (12)

## PM/BA automatic decision

- Decision: `continue`
- Required action: `continue active ticket`
- Deterministic calibration mode: `enabled`
- Live evidence policy: `supporting input only; promotion requires replay/calibration acceptance`

## Bundle window

- 1. `autobot-feedback-20260831-084332.tgz` — class=fresh, dailyNet=-10.67, risk=NORMAL, top=Skip BTCUSDC: Risk budget blocked new exposure (41)
- 2. `autobot-feedback-20260810-062844.tgz` — class=fresh, dailyNet=-40.19, risk=NORMAL, top=Skip ETHUSDC: Risk budget blocked new exposure (45)
- 3. `autobot-feedback-20260721-114241.tgz` — class=fresh, dailyNet=-17.89, risk=NORMAL, top=Skip SOLUSDC: Risk budget blocked new exposure (40)
- 4. `autobot-feedback-20260714-075300.tgz` — class=fresh, dailyNet=-31.07, risk=NORMAL, top=Skip ETHUSDC: Risk budget blocked new exposure (49)
- 5. `autobot-feedback-20260713-085946.tgz` — class=baseline, dailyNet=-25.68, risk=NORMAL, top=Skip BTCUSDC: Risk budget blocked new exposure (51)
