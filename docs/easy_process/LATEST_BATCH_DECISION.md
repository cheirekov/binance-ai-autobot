# LATEST_BATCH_DECISION

Last updated: 2026-04-15 19:55 EEST
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Lane A — Strategy quality / regime routing`
- Why:
- `observed`: the latest fresh bundle is `autobot-feedback-20260415-164608.tgz`
- `observed`: auto-retro says `patch_required`
- `observed`: April 15 dust-storm lock behavior is no longer the dominant blocker
- `observed`: a global `REASON_QUARANTINE:FEE_EDGE` lock is active while fresh `ETH`/cross-quote pairs still rotate into fee-edge skips
- `observed`: `risk_state=NORMAL`, `activeOrders=0`, and `sizingRejectPressure=low`
- `inferred`: the immediate blocker is symbol-local fee-edge suppression not honoring the active global fee-edge quarantine for fresh non-home-quote candidates

## Chosen active ticket
- Current: `T-031` (Regime engine v2)
- Linked support: `T-032` (support slices allowed only when fresh evidence couples downside-control with strategy-quality validation)
- Decision: `patch_required`
- Why:
  - `observed`: the linked-support thaw and downside-control support path remain preserved
  - `observed`: the live blocker is `T-031` candidate-quality behavior, not quote-funding or downside-control
  - `inferred`: the next bounded batch is to make global fee-edge quarantine cross-quote aware without weakening the fee floor

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260415-164608.tgz`
- Compared bundle: `autobot-feedback-20260415-072942.tgz`

## Allowed work mode
- Current batch: `PATCH_NOW`

## Batch decision
- Decision: `patch_required`
- Next ticket candidate: `T-031`
- Review slice:
  - keep `T-031` active
  - preserve the widened residual-family storm behavior and April 15 morning storm-lock bypass fix
  - suppress fresh non-home-quote grid candidates while global `FEE_EDGE` quarantine is active unless a sell leg is actionable
  - preserve the April 12 linked-support thaw, April 9-10 residual mitigations, and March 30-31 `T-032` downside-control behavior
- Validation:
  - fresh bundle review (`autobot-feedback-20260415-164608.tgz`) ✅
  - same-ticket mitigation landed in code/tests ✅
  - PM/BA gate start + Docker CI pass ✅
