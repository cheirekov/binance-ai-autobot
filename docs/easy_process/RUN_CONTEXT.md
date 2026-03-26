# RUN_CONTEXT

Last updated: 2026-03-26 15:16 EET  
Owner: Operator or PM/BA

## Current run facts
- Current UTC now: `2026-03-26T13:16:00Z`
- Current local date: `2026-03-26`
- Current local timezone: `Europe/Sofia`
- Current mode: `hotfix`
- Current cycle label: `FOLLOWUP_P0_NO_FEASIBLE_RECOVERY_PATCH`
- Active ticket: `T-032`
- Active lane: `Lane A — Runtime stability`

## Latest bundle facts
- Latest bundle id: `autobot-feedback-20260326-130152.tgz`
- Bundle run end UTC: `2026-03-26T13:01:44.538Z`
- Bundle freshness class: `fresh`
- Latest ingest decision: `patch_required`
- Reviewed deployed sha: `2914263`
- Compared previous fresh sha: `a2a9ad0`
- Audited engine surfaces:
  - no-feasible reason generation from `431e621b` / `0b5671a5`
  - no-feasible recovery gate from `f1192014`

## Evidence delta expectation for next cycle
- fresh post-deploy decisions continue after clean recreate
- `noFeasibleRecovery` becomes eligible again under low spendable quote after reserve
- recent decision mix changes materially relative to the current post-restart `No feasible` / `No eligible` pattern
