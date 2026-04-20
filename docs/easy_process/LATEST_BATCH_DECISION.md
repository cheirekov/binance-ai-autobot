# LATEST_BATCH_DECISION

Last updated: 2026-04-20 18:20 EEST
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Lane A — Strategy quality / regime routing`
- Why:
- `observed`: the latest fresh bundle is `autobot-feedback-20260420-145411.tgz`
- `observed`: auto-retro says `pivot_required`
- `observed`: deployed commit is `47693bb`
- `observed`: runtime is `HALT(trigger=PROFIT_GIVEBACK)` with `unwind_only=true`, `activeOrders=0`, `managedExposure=9.2%`, and `haltExposureFloor=8.0%`
- `observed`: dominant `Skip: No feasible candidates after policy/exposure filters` only moved from `42` to `38`
- `observed`: latest no-feasible rejection samples are still entirely non-home quote pressure (`BTC`, `ETH`, `BNB`) and recovery still fails on `Below minQty 1.00000000`
- `observed`: latest deployed bundle shows repeated daily-loss `HALT` skips but no fresh unwind trade
- `inferred`: the active lane stays `T-031`, but the immediate blocker is now coupled with downside-control accounting, so one bounded linked-support `T-032` slice is justified

## Chosen active ticket
- Current: `T-031` (Regime engine v2)
- Linked support: `T-032` (support slice justified now by false `PROFIT_GIVEBACK` `HALT` persistence)
- Decision: `patch_required`
- Why:
  - `observed`: the April 20 `T-031` quote-pressure quarantine is deployed and reduced churn only slightly (`42 -> 38`)
  - `observed`: the live runtime blocker is now false `PROFIT_GIVEBACK` `HALT` persistence, not a missing quote-pressure quarantine path
  - `observed`: no unwind trade fires even though runtime is already `HALT` / `unwind_only`
  - `inferred`: the next bounded batch should stay under active `T-031`, but use linked-support `T-032` to clip managed exposure to balances that still exist

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260420-145411.tgz`
- Compared bundle: `autobot-feedback-20260420-083837.tgz`

## Allowed work mode
- Current batch: `PATCH_NOW`

## Batch decision
- Decision: `patch_required`
- Next ticket candidate: `T-031`
- Review slice:
  - keep `T-031` active
  - execute one bounded linked-support `T-032` slice
  - preserve the April 20 quote-pressure quarantine behavior, April 17 dust cooldown behavior, April 15 fee-edge quarantine behavior, and April 12 linked-support thaw
  - clip `PROFIT_GIVEBACK` managed exposure to base inventory still present in balances
- Validation:
  - fresh bundle review (`autobot-feedback-20260420-083837.tgz`) ✅
  - fresh bundle review (`autobot-feedback-20260420-145411.tgz`) ✅
  - same-ticket mitigation landed in code/tests ⏳
  - PM/BA gate start + Docker CI pass ⏳
