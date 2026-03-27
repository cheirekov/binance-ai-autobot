# BUNDLE_DIGEST

Last updated: 2026-03-27 12:46 EET  
Owner: PM/BA + Runtime Analyst

Use this file instead of pasting large bundle narratives into chat.

## Latest reviewed bundle
- Bundle: `autobot-feedback-20260327-102432.tgz`
- Ingest decision: `continue active ticket`
- Fresh runtime evidence: `yes`
- Evidence class: `fresh`

## Why this matters
This bundle is fresh enough to justify a bounded `T-032` patch. It shows the no-feasible recovery policy already arming, but not actually attempting a recovery action because the gate is still suppressed by raw spendable quote on another family.

## Observed
- latest skip signature remains `Skip: No feasible candidates after sizing/cap filters`
- latest skip details include:
  - `noFeasibleRecovery.enabled = true`
  - `recentCount = 201`
  - `threshold = 2`
  - `quoteLiquidityThreshold = 3`
  - `maxExecutionQuoteSpendableHome = 1588.033641`
  - `attemptedSymbol = null`
  - `attemptedReason = null`
- rejection samples in the same bundle show active quote pressure:
  - `quote-spendable-floor` on `USDC`
  - `quote-spendable` on `BTC` and `ETH`
- bundle-level runtime remains:
  - `risk_state = NORMAL`
  - `open_positions = 11`
  - `total_alloc_pct = 97.85`

## Inferred
- the policy threshold logic is no longer the main defect
- the current same-ticket mismatch is in the final recovery gate, not the earlier accumulation logic
- raw spendable quote on a different execution-quote family can hide trapped-liquidity conditions in the active candidate pool

## Next proof required
- next fresh bundle after this patch should show `gateAttempted=true` when quote-pressure rejection stages recur
- the next bundle should also show either:
  - a `no-feasible-liquidity-recovery` trade, or
  - a non-null `attemptedReason`
