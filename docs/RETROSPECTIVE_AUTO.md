# Automatic Retrospective

Last updated: 2026-04-28T10:29:14.747Z
Active ticket: `T-031`
Latest bundle: `autobot-feedback-20260428-102858.tgz`
Review window: `5` fresh/baseline bundle(s) out of `5` local bundle(s)

## Hard rules

- Fresh runtime evidence in latest bundle: `PASS` — behavior signature changed vs previous bundle
- Repeated dominant loop across latest 2 fresh bundles: `FAIL` — "Skip: No feasible candidates after policy/exposure filters" (70 -> 59)
- Negative daily_net_usdt across latest 3 fresh bundles: `PASS` — 0.26 | -0.84 | 0.55
- No KPI trend improvement across latest 3 fresh bundles: `PASS` — daily=0.26 | -0.84 | 0.55 ; maxDD=0.02 | 0.02 | 0.02

## Latest bundle snapshot

- Freshness class: `fresh`
- Stale bundle streak: `0`
- Risk state: `NORMAL`
- Daily net: `0.26`
- Max drawdown: `0.02%`
- Open positions: `8`
- Total alloc pct: `9.23`

## Top skip reasons (latest bundle)

- Skip: No feasible candidates after policy/exposure filters (59)
- Skip: No eligible universe candidates after policy and lock filters (29)
- Skip ORCAUSDC: Grid sell leg not actionable yet (7)
- Skip PENGUUSDC: Grid sell leg not actionable yet (7)
- Skip XRPUSDC: Grid sell leg not actionable yet (6)

## PM/BA automatic decision

- Decision: `patch_required`
- Required action: `same-ticket mitigation required before next long run`

## Bundle window

- 1. `autobot-feedback-20260428-102858.tgz` — class=fresh, dailyNet=0.26, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (59)
- 2. `autobot-feedback-20260427-113318.tgz` — class=fresh, dailyNet=-0.84, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (70)
- 3. `autobot-feedback-20260424-082814.tgz` — class=fresh, dailyNet=0.55, risk=NORMAL, top=Skip XRPUSDC: Fee/edge filter (net -0.020% < 0.052%) (15)
- 4. `autobot-feedback-20260423-080554.tgz` — class=fresh, dailyNet=-0.90, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (65)
- 5. `autobot-feedback-20260422-100621.tgz` — class=baseline, dailyNet=-0.59, risk=NORMAL, top=Skip: No feasible candidates after policy/exposure filters (75)

