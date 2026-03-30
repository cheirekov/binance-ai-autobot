# LATEST_BATCH_DECISION

Last updated: 2026-03-30 17:40 EEST  
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Lane A — Exit manager / downside control`
- Why:
  - `observed`: the latest fresh bundle is `autobot-feedback-20260330-135922.tgz`
  - `observed`: auto-retro says `patch_required`
  - `observed`: the bundle ends `risk_state=CAUTION`, `daily_net_usdt=-144.52`, `total_alloc_pct=32.69`, `activeOrders=1`
  - `observed`: the dominant repeats are managed-symbol `Daily loss caution paused GRID BUY leg` plus residual global new-symbol pause
  - `inferred`: the first flat-book thaw slice worked, but the next leverage point is caution unwind while exposure is still material

## Chosen active ticket
- Current: `T-032` (Exit manager v2)
- Decision: `patch_same_ticket`
- Why:
  - `observed`: the active `T-032` evidence is still the correct lane
  - `observed`: runtime now shows material managed exposure under `ABS_DAILY_LOSS` caution, but still mostly pauses GRID buy legs instead of reaching caution unwind
  - `inferred`: the more valuable next batch is a bounded same-ticket `T-032` unwind-activation slice

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260330-135922.tgz`
- Compared bundle: `autobot-feedback-20260330-082950.tgz`

## Allowed work mode
- Current batch: `PATCH_NOW`

## Batch decision
- Decision: `patch_same_ticket`
- Next ticket candidate: `T-032`
- Review slice:
  - keep `T-032` active
  - let `ABS_DAILY_LOSS` caution run best-effort unwind once managed exposure is still material
  - preserve the earlier flat-book thaw behavior, March 28-29 `T-031` strategy-quality slices, and `T-034` routing stability
- Validation:
  - fresh bundle review (`autobot-feedback-20260330-135922.tgz`) ✅
  - current active lane still `T-032` ✅
  - second `T-032` slice landed in code/tests ✅
