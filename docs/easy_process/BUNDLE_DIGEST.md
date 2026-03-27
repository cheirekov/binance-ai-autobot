# BUNDLE_DIGEST

Last updated: 2026-03-27 14:40 EET  
Owner: PM/BA + Runtime Analyst

Use this file instead of pasting large bundle narratives into chat.

## Latest reviewed bundle
- Bundle: `autobot-feedback-20260327-123604.tgz`
- Ingest decision: `patch_required`
- Fresh runtime evidence: `yes`
- Evidence class: `fresh`

## Why this matters
This bundle is fresh enough to close the last `T-032` hypothesis and define the next one. It proves the no-feasible recovery patch can actually fire in live runtime, then shows the next dominant blocker as a global profit-giveback `CAUTION` pause on new symbols after the book has already been cut down to about `18%` exposure.

## Observed
- the bundle contains `Binance testnet SELL MARKET TAOUSDC qty 0.445 → FILLED ... no-feasible-liquidity-recovery`
- the run then records multiple stop-loss / take-profit exits and finishes with:
  - `risk_state = CAUTION`
  - `open_positions = 7`
  - `total_alloc_pct = 17.98`
  - `quoteFree = 5889.612684`
- latest risk-state reasons include:
  - `trigger=PROFIT_GIVEBACK`
  - `giveback=110.91USDC (66.7%)`
  - `managedExposure=18.0%`
  - `haltExposureFloor=8.0%`
- dominant latest skips are now:
  - `Skip: No feasible candidates: daily loss caution paused new symbols (59 filtered)`
  - `Skip BTCUSDC: Daily loss caution paused GRID BUY leg`

## Inferred
- the prior recovery-gate patch is validated by real runtime evidence
- the current same-ticket mismatch is the profit-giveback caution threshold staying global after material de-risking
- the remaining risky symbol can keep its own BUY pause without forcing all new symbols to stay blocked

## Next proof required
- the next fresh bundle should stop making `daily loss caution paused new symbols` the dominant latest loop
- the next bundle should still preserve symbol-level bearish pause evidence where needed
- the next bundle should not regress the earlier no-feasible recovery trade path
