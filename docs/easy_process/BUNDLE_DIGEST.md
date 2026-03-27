# BUNDLE_DIGEST

Last updated: 2026-03-27 18:03 EET  
Owner: PM/BA + Runtime Analyst

Use this file instead of pasting large bundle narratives into chat.

## Latest reviewed bundle
- Bundle: `autobot-feedback-20260327-155408.tgz`
- Ingest decision: `pivot_required`
- Manual PM/BA decision: `patch_same_ticket`
- Fresh runtime evidence: `yes`
- Evidence class: `fresh`

## Why this matters
This bundle is fresh enough to overrule a coarse automatic pivot with a narrower same-ticket diagnosis. The aggregate top skip still repeats, but the raw runtime has materially changed: the bot is placing BUY ladder orders and then canceling them in `DEFENSIVE` mode even while regime is only `NEUTRAL`.

## Observed
- the bundle finishes with:
  - `risk_state = CAUTION`
  - `managedExposure = 6.7%`
  - `orders.submitted = 278`
  - `orders.filled = 146`
  - `orders.canceled = 129`
  - `activeOrders = 3`
- latest risk-state reasons include:
  - `trigger=PROFIT_GIVEBACK`
  - `giveback=135.02USDC (81.2%)`
  - `managedExposure=6.7%`
  - `haltExposureFloor=8.0%`
- dominant aggregate skips are still:
  - `Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered)`
  - `Skip BTCUSDC: Daily loss caution paused GRID BUY leg`
- raw state / adaptive-shadow evidence now shows:
  - repeated `Binance testnet BUY LIMIT BTCUSDC ... grid-ladder-buy`
  - repeated `Canceled 1 bot open order(s): defensive-bear-cancel-buy BTCUSDC`
  - the same alternating pattern also appears on `ETHUSDC`
  - the latest cancel events happen with `executionLane=DEFENSIVE`, `regime=NEUTRAL`, `confidence=0.4`

## Inferred
- the raw runtime defect is no longer a pure global no-candidate loop
- the current same-ticket mismatch is defensive BUY-order cleanup firing even when buys are allowed
- the repeated aggregate skip summary is lagging the actual low-level runtime behavior in this bundle

## Next proof required
- the next fresh bundle should stop alternating `grid-ladder-buy` with defensive BUY-order cancel cleanup while buys are allowed
- the next bundle should still preserve explicit caution/grid-guard pause evidence where needed
- the next bundle should not regress the earlier no-feasible recovery trade path
