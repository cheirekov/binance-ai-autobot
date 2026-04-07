# LATEST_BATCH_DECISION

Last updated: 2026-04-07 08:05 EEST  
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Lane A — Strategy quality / regime routing`
- Why:
- `observed`: the latest fresh bundle is `autobot-feedback-20260407-055241.tgz`
- `observed`: auto-retro says `pivot_required`, but the fresh-state audit shows a narrower same-ticket blocker
- `observed`: the bundle ends `risk_state=NORMAL`, `daily_net_usdt=-99.51`, `sizingRejectPressure=low`
- `observed`: the broad `No feasible candidates after policy/exposure filters` deadlock stays fixed
- `observed`: the dominant paired loop is now `ETHUSDC` residual churn:
  - `Skip ETHUSDC: Grid sell leg not actionable yet (91)`
  - `Skip ETHUSDC: Grid guard paused BUY leg (91)`
- `inferred`: the dust cooldown bypass is now too permissive for one residual family and needs a bounded same-ticket re-block threshold

## Chosen active ticket
- Current: `T-031` (Regime engine v2)
- Linked support: `T-032` (support slices allowed only when fresh evidence couples downside-control with strategy-quality validation)
- Decision: `patch_required`
- Why:
  - `observed`: downside-control remains support-only; the live blocker is repeated paired residual-loop churn on one home-quote family
  - `observed`: the bundle no longer supports a lane pivot because the deadlock recovery is holding
  - `inferred`: the next bounded batch is a `T-031` residual-loop re-block slice, not a ticket switch

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260407-055241.tgz`
- Compared bundle: `autobot-feedback-20260405-184019.tgz`

## Allowed work mode
- Current batch: `PATCH_NOW`

## Batch decision
- Decision: `patch_required`
- Next ticket candidate: `T-031`
- Review slice:
  - keep `T-031` active
  - re-apply the existing dust cooldown after repeated paired dead-end loops on the same residual symbol
  - preserve April 2 deadlock recovery and March 30-31 `T-032` downside-control behavior
- Validation:
  - fresh bundle review (`autobot-feedback-20260407-055241.tgz`) ✅
  - same-ticket mitigation landed in code/tests ✅
  - PM/BA gate start + Docker CI pass ✅
