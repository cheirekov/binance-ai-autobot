# LATEST_BATCH_DECISION

Last updated: 2026-04-12 21:20 EEST  
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Lane A — Strategy quality / regime routing`
- Why:
- `observed`: the latest fresh bundle is `autobot-feedback-20260412-180152.tgz`
- `observed`: auto-retro says `patch_required`
- `observed`: the bundle ends `risk_state=CAUTION`, `trigger=ABS_DAILY_LOSS`, `managedExposure≈0.3%`, `activeOrders=0`
- `observed`: the latest decision is `Skip: No feasible candidates: daily loss caution paused new symbols (60 filtered)`
- `inferred`: the immediate blocker is a downside-control policy edge case that is blocking further `T-031` validation

## Chosen active ticket
- Current: `T-031` (Regime engine v2)
- Linked support: `T-032` (support slices allowed only when fresh evidence couples downside-control with strategy-quality validation)
- Decision: `patch_required`
- Why:
  - `observed`: downside-control support is the immediate blocker because `CAUTION` stays frozen after the book is already near-flat and orderless
  - `observed`: this still fits linked-support rules, so there is no ticket switch
  - `inferred`: the next bounded batch is a `T-032` support thaw inside active `T-031`

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260412-180152.tgz`
- Compared bundle: `autobot-feedback-20260412-054225.tgz`

## Allowed work mode
- Current batch: `PATCH_NOW`

## Batch decision
- Decision: `patch_required`
- Next ticket candidate: `T-031`
- Review slice:
  - keep `T-031` active
  - add one bounded linked-support `T-032` thaw so `ABS_DAILY_LOSS` near-flat residuals do not keep global `CAUTION` new-symbol pause frozen
  - preserve the earlier deadlock recovery, April 9-10 `T-031` residual mitigations, and March 30-31 `T-032` downside-control behavior
- Validation:
  - fresh bundle review (`autobot-feedback-20260410-072500.tgz`) ✅
  - same-ticket mitigation landed in code/tests ✅
  - PM/BA gate start + Docker CI pass ✅
