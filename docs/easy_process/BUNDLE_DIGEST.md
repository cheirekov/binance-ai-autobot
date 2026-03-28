# BUNDLE_DIGEST

Last updated: 2026-03-28 10:47 EET  
Owner: PM/BA + Runtime Analyst

Use this file instead of pasting large bundle narratives into chat.

## Latest reviewed bundle
- Bundle: `autobot-feedback-20260328-084345.tgz`
- Ingest decision: `pivot_required`
- Manual PM/BA decision: `pivot_ticket`
- Fresh runtime evidence: `yes`
- Evidence class: `fresh`

## Why this matters
This bundle is fresh enough to close the previous same-ticket hypothesis. The deployed runtime now runs `5927bd9`, the old defensive cancel/recreate churn is gone, and the remaining repeat is a different policy/scope question: under `ABS_DAILY_LOSS` caution the bot spends the review window globally pausing new symbols while only a managed-symbol fee/edge path remains active.

## Observed
- the bundle finishes with:
  - `risk_state = CAUTION`
  - `trigger = ABS_DAILY_LOSS`
  - `open_positions = 4`
  - `total_alloc_pct = 3.40`
  - `quoteFree = 6930.325431`
  - `decisions = 200`
  - `trades = 0`
  - `activeOrders = 0`
- latest risk-state reasons include:
  - `trigger=ABS_DAILY_LOSS`
  - `dailyRealized=-139.34USDC`
  - `maxLoss=333.47USDC`
- dominant aggregate skips are now:
  - `Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered)`
  - repeated `BTCUSDC` `Fee/edge filter` skips
- raw state / adaptive-shadow evidence now shows:
  - no repeated `defensive-bear-cancel-buy` / `defensive-buy-pause-cancel-buy`
  - alternating candidate selection between:
    - `BNBBTC` / other non-managed symbols → global new-symbol pause
    - `BTCUSDC` → fee/edge filter under `DEFENSIVE` / `RANGE`
  - `noFeasibleRecovery.enabled=false` with `recentCount=0`, `threshold=0`

## Inferred
- the previous defensive cancel-churn hypothesis is closed
- the current repeat is no longer clearly a `T-032` implementation bug
- the next move should be PM/BA pivot review, not another blind runtime patch

## Next proof required
- an explicit next active lane / follow-up ticket decision
- if PM/BA keeps `T-032`, a new bounded same-ticket hypothesis with acceptance criteria
- if PM/BA pivots, the dedicated board/switch-retro update in the next batch
