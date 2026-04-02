# LATEST_BATCH_DECISION

Last updated: 2026-04-02 14:53 EEST  
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Lane A — Strategy quality / regime routing`
- Why:
  - `observed`: the latest fresh bundle is `autobot-feedback-20260402-113357.tgz`
  - `observed`: auto-retro says `patch_required`
  - `observed`: the bundle ends `risk_state=CAUTION`, `daily_net_usdt=-158.18`, `sizingRejectPressure=low`
  - `observed`: the dominant repeat is `Skip: No feasible candidates after policy/exposure filters (21)`
  - `observed`: all remaining home-quote candidates are dust residuals cooled by `GRID_SELL_NOT_ACTIONABLE`, while cross-quote rejection samples are mostly unfundable after reserve
  - `inferred`: `T-032` is not the live blocker; the next leverage point is still `T-031` candidate/actionability quality

## Chosen active ticket
- Current: `T-031` (Regime engine v2)
- Linked support: `T-032` (support slices allowed only when fresh evidence couples downside-control with strategy-quality validation)
- Decision: `patch_required`
- Why:
  - `observed`: downside-control remains preserved, but fresh runtime now falls through to no-feasible deadlock after dust residual sell cooldowns
  - `observed`: repeated home-quote dust cooldowns, not funding or caution policy, are boxing out feasible candidates
  - `inferred`: the next bounded batch is a `T-031` selection-time dust-cooldown slice, not a ticket pivot

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260402-113357.tgz`
- Compared bundle: `autobot-feedback-20260402-081314.tgz`

## Allowed work mode
- Current batch: `PATCH_NOW`

## Batch decision
- Decision: `patch_required`
- Next ticket candidate: `T-031`
- Review slice:
  - keep `T-031` active
  - stop cooled home-quote dust residuals from blocking all feasible candidate selection
  - preserve March 30-31 `T-032` downside-control behavior and `T-034` routing stability
- Validation:
  - fresh bundle review (`autobot-feedback-20260402-113357.tgz`) ✅
  - same-ticket mitigation landed in code/tests ✅
  - PM/BA gate start + Docker CI pass ✅
