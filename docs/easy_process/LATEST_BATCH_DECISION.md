# LATEST_BATCH_DECISION

Last updated: 2026-04-10 10:35 EEST  
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Lane A — Strategy quality / regime routing`
- Why:
- `observed`: the latest fresh bundle is `autobot-feedback-20260410-072500.tgz`
- `observed`: auto-retro says `patch_required`
- `observed`: the bundle ends `risk_state=NORMAL`, `daily_net_usdt=+0.75`, `sizingRejectPressure=low`
- `observed`: the April 9 slice reduced the broader residual family, but `ETHUSDC` still alternates sell-leg-not-actionable and cooldown entries over many hours
- `observed`: the remaining blocker is one-symbol home-quote dust resurfacing through a steady every-15-minute loop
- `inferred`: the next bounded patch is still `T-031`, and it should extend the solo-loop lookback so the longer retry cooldown can actually trigger on that cadence

## Chosen active ticket
- Current: `T-031` (Regime engine v2)
- Linked support: `T-032` (support slices allowed only when fresh evidence couples downside-control with strategy-quality validation)
- Decision: `patch_required`
- Why:
  - `observed`: downside-control remains support-only; the live blocker is still residual home-quote dust churn
  - `observed`: the bundle stays fresh and `NORMAL`, so this is not a lane pivot
  - `inferred`: the next bounded batch is a `T-031` steady-loop lookback slice, not a ticket switch

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260410-072500.tgz`
- Compared bundle: `autobot-feedback-20260409-071715.tgz`

## Allowed work mode
- Current batch: `PATCH_NOW`

## Batch decision
- Decision: `patch_required`
- Next ticket candidate: `T-031`
- Review slice:
  - keep `T-031` active
  - extend the solo residual-loop lookback so the longer retry cooldown can trigger on steady-state 15-minute loops
  - preserve the earlier deadlock recovery, April 9 family reduction, and March 30-31 `T-032` downside-control behavior
- Validation:
  - fresh bundle review (`autobot-feedback-20260410-072500.tgz`) ✅
  - same-ticket mitigation landed in code/tests ✅
  - PM/BA gate start + Docker CI pass ✅
