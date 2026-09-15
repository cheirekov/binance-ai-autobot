# RUN_CONTEXT

Last updated: 2026-03-26 18:47 EET  
Owner: Operator or PM/BA

## Current run facts
- Current UTC now: `2026-03-26T16:47:00Z`
- Current local date: `2026-03-26`
- Current local timezone: `Europe/Sofia`
- Current mode: `hotfix`
- Current cycle label: `FOLLOWUP_P0_NO_FEASIBLE_RECOVERY_THRESHOLD_PATCH`
- Active ticket: `T-032`
- Active lane: `Lane A — Runtime stability`

## Latest bundle facts
- Latest bundle id: `autobot-feedback-20260326-164157.tgz`
- Bundle run end UTC: `2026-03-26T16:41:56.063Z`
- Bundle freshness class: `fresh`
- Latest ingest decision: `patch_required`
- Reviewed deployed sha: `3a6a14f`
- Compared previous fresh sha: `2914263`
- Audited engine surfaces:
  - no-feasible recovery activation window in `deriveNoFeasibleRecoveryPolicy(...)`
  - no-feasible recovery threshold in `shouldAttemptNoFeasibleRecovery(...)`
  - shared funding-floor logic via `deriveMinQuoteLiquidityHome(...)`

## Evidence delta expectation for next cycle
- fresh post-deploy decisions continue after clean recreate
- `noFeasibleRecovery` becomes eligible again under low spendable quote after reserve
- recent decision mix changes materially relative to the current post-restart `No feasible` / `No eligible` pattern
