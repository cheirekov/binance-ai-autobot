# LATEST_BATCH_DECISION

Last updated: 2026-03-31 11:55 EEST  
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Lane A — Exit manager / downside control`
- Why:
  - `observed`: the latest fresh bundle is `autobot-feedback-20260331-084549.tgz`
  - `observed`: auto-retro says `patch_required`
  - `observed`: the bundle ends `risk_state=CAUTION`, `daily_net_usdt=-155.28`, `total_alloc_pct=0.25`, `activeOrders=0`
  - `observed`: the dominant repeats are `Post stop-loss cooldown active` plus residual global new-symbol pause on the same cooled symbol
  - `inferred`: the March 30 caution-unwind slice worked, but the next leverage point is preventing cooled residuals from anchoring global caution

## Chosen active ticket
- Current: `T-032` (Exit manager v2)
- Decision: `patch_same_ticket`
- Why:
  - `observed`: the active `T-032` evidence is still the correct lane
  - `observed`: runtime now shows almost-flat exposure and no active orders, but a stop-loss-cooled residual symbol still anchors global caution
  - `inferred`: the more valuable next batch is a bounded same-ticket `T-032` cooled-residual release slice

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260331-084549.tgz`
- Compared bundle: `autobot-feedback-20260330-135922.tgz`

## Allowed work mode
- Current batch: `PATCH_NOW`

## Batch decision
- Decision: `patch_same_ticket`
- Next ticket candidate: `T-032`
- Review slice:
  - keep `T-032` active
  - stop stop-loss-cooled residual positions from anchoring global caution once active orders are already gone
  - preserve the March 30 caution-unwind behavior, the earlier flat-book thaw, March 28-29 `T-031` strategy-quality slices, and `T-034` routing stability
- Validation:
  - fresh bundle review (`autobot-feedback-20260331-084549.tgz`) ✅
  - current active lane still `T-032` ✅
  - third `T-032` slice landed in code/tests ✅
