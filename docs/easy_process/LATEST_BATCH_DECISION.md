# LATEST_BATCH_DECISION

Last updated: 2026-04-07 21:20 EEST  
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Lane A — Strategy quality / regime routing`
- Why:
- `observed`: the latest fresh bundle is `autobot-feedback-20260407-181242.tgz`
- `observed`: auto-retro says `pivot_required`, but the fresh-state audit shows a narrower same-ticket blocker
- `observed`: the bundle ends `risk_state=NORMAL`, `daily_net_usdt=+153.19`, `sizingRejectPressure=low`
- `observed`: the April 7 morning slice reduced the paired `ETHUSDC` loop (`91 -> 31`)
- `observed`: the remaining blocker is the same residual family surfacing through solo non-actionable sell-leg retries
- `inferred`: the next bounded patch is still `T-031`, but it should re-block repeated solo sell-leg retries at a higher threshold than the paired-loop threshold

## Chosen active ticket
- Current: `T-031` (Regime engine v2)
- Linked support: `T-032` (support slices allowed only when fresh evidence couples downside-control with strategy-quality validation)
- Decision: `patch_required`
- Why:
  - `observed`: downside-control remains support-only; the live blocker is still one residual family, but now through solo sell-leg churn
  - `observed`: the morning patch improved runtime and the bundle is positive, so this is not a lane pivot
  - `inferred`: the next bounded batch is a `T-031` solo residual-loop re-block slice, not a ticket switch

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260407-181242.tgz`
- Compared bundle: `autobot-feedback-20260407-055241.tgz`

## Allowed work mode
- Current batch: `PATCH_NOW`

## Batch decision
- Decision: `patch_required`
- Next ticket candidate: `T-031`
- Review slice:
  - keep `T-031` active
  - re-apply the existing dust cooldown after repeated solo dead-end sell-leg loops on the same residual symbol
  - preserve the earlier paired-loop reduction, April 2 deadlock recovery, and March 30-31 `T-032` downside-control behavior
- Validation:
  - fresh bundle review (`autobot-feedback-20260407-181242.tgz`) ✅
  - same-ticket mitigation landed in code/tests ✅
  - PM/BA gate start + Docker CI pass ✅
