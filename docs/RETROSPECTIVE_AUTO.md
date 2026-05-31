# Automatic Retrospective

Last updated: 2026-05-29T08:12:35.344Z
Active ticket: `T-040`
Latest bundle: `autobot-feedback-20260529-081216.tgz`
Review window: `2` fresh/baseline bundle(s) out of `2` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `PASS` — Skip: No feasible candidates after policy/exposure filters -> Skip XLMUSDC: Risk budget market entry cap below exchange minimum
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — not enough fresh bundles
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — not enough fresh bundles
- External exchange/order-sync backoff in latest bundle: `PASS` — not observed in latest top reasons

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `31.00`
- Max drawdown: `0.86%`
- Open positions: `6`
- Total alloc pct: `4.62`

## Top skip reasons (latest bundle)

- Skip XLMUSDC: Risk budget market entry cap below exchange minimum (20)
- Skip ALLOUSDC: Risk budget market entry cap below exchange minimum (12)
- Skip BTCUSDC: Fee/edge filter (net 0.210% < 0.559%) (5)
- Skip ETHUSDC: Fee/edge filter (net 0.214% < 0.559%) (5)
- Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered) (4)

## PM/BA automatic decision

- Decision: `continue`
- Required action: `continue active ticket`
- Production readiness mode: `enabled`
- Patch policy: `runtime patches require P0/P1 safety severity plus deterministic reproduction`

## Bundle window

- 1. `autobot-feedback-20260529-081216.tgz` — class=fresh, dailyNet=31.00, risk=NORMAL, top=Skip XLMUSDC: Risk budget market entry cap below exchange minimum (20)
- 2. `autobot-feedback-20260528-105508.tgz` — class=baseline, dailyNet=-16.21, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (62)
