# BUNDLE_DIGEST

Last updated: 2026-03-28 23:10 EET  
Owner: PM/BA + Runtime Analyst

Use this file instead of pasting large bundle narratives into chat.

## Latest reviewed bundle
- Bundle: `autobot-feedback-20260328-202730.tgz`
- Ingest decision: `continue`
- Manual PM/BA decision: `pivot_active_ticket`
- Fresh runtime evidence: `yes`
- Evidence class: `fresh`

## Why this matters
This bundle confirms the runtime is no longer primarily blocked by `T-032` downside-control defects. The deployed runtime still runs `5927bd9`, but the current behavior is materially healthier and the remaining blockers are strategy-quality signals. That makes `T-031` the higher-leverage next lane.

## Observed
- the bundle finishes with:
  - `risk_state = NORMAL`
  - `daily_net_usdt = +19.17`
  - `max_drawdown_pct = 0.97`
  - `open_positions = 9`
  - `total_alloc_pct = 70.43`
  - `trades = 95`
  - `activeOrders = 9`
- dominant aggregate skips are now:
  - `Skip BTCUSDC: Fee/edge filter (net 0.040% < 0.052%)`
  - `Skip SOLUSDC: Fee/edge filter (net 0.044% < 0.052%)`
  - parked-ladder waiting on `ETHUSDC`, `TAOUSDC`, `XRPUSDC`, `DOGEUSDC`
- funding/routing regression is absent:
  - no dominant `Insufficient spendable <quote>` family
  - `unmanaged_exposure_pct = 0`

## Inferred
- the earlier low-exposure `ABS_DAILY_LOSS` caution case is no longer the current authority
- `T-032` should remain preserved, but no longer as the active development lane
- the next code batch should be the first `T-031` slice: risk-linked regime thresholds + regime-aware fee floor

## Next proof required
- deploy the first `T-031` slice
- collect one fresh bundle to confirm fee-edge behavior changes without reopening funding or downside-control regressions
