# LATEST_BATCH_DECISION

Last updated: 2026-04-09 10:35 EEST  
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Lane A — Strategy quality / regime routing`
- Why:
- `observed`: the latest fresh bundle is `autobot-feedback-20260409-071715.tgz`
- `observed`: auto-retro says `patch_required`
- `observed`: the bundle ends `risk_state=NORMAL`, `daily_net_usdt=-0.89`, `sizingRejectPressure=low`
- `observed`: the April 7 evening slice kept the broad deadlock fixed, but the residual family expanded across `BTCUSDC` / `TAOUSDC` / `ZECUSDC`
- `observed`: the remaining blocker is home-quote dust residuals resurfacing after cooldown expiry through paired or solo non-actionable sell-leg retries
- `inferred`: the next bounded patch is still `T-031`, and it should reuse the longer retry cooldown for repeated paired residual loops too

## Chosen active ticket
- Current: `T-031` (Regime engine v2)
- Linked support: `T-032` (support slices allowed only when fresh evidence couples downside-control with strategy-quality validation)
- Decision: `patch_required`
- Why:
  - `observed`: downside-control remains support-only; the live blocker is still residual home-quote dust churn
  - `observed`: the bundle stays fresh and `NORMAL`, so this is not a lane pivot
  - `inferred`: the next bounded batch is a `T-031` residual-family cooldown extension slice, not a ticket switch

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260409-071715.tgz`
- Compared bundle: `autobot-feedback-20260408-130935.tgz`

## Allowed work mode
- Current batch: `PATCH_NOW`

## Batch decision
- Decision: `patch_required`
- Next ticket candidate: `T-031`
- Review slice:
  - keep `T-031` active
  - re-apply the longer dust retry cooldown after repeated paired or solo dead-end sell-leg loops on the same residual symbol
  - preserve the earlier deadlock recovery, April 7 residual re-blocks, and March 30-31 `T-032` downside-control behavior
- Validation:
  - fresh bundle review (`autobot-feedback-20260409-071715.tgz`) ✅
  - same-ticket mitigation landed in code/tests ✅
  - PM/BA gate start + Docker CI pass ✅
