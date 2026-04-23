# LATEST_BATCH_DECISION

Last updated: 2026-04-23 11:20 EEST
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Lane A — Strategy quality / regime routing`
- Why:
- `observed`: the latest fresh bundle is `autobot-feedback-20260423-080554.tgz`
- `observed`: auto-retro says `patch_required`
- `observed`: deployed commit is `530fcfa`
- `observed`: runtime is `NORMAL`, `unwind_only=false`, `activeOrders=0`
- `observed`: dominant `Skip: No feasible candidates after policy/exposure filters` repeated across the last two fresh bundles (`75 -> 65`)
- `observed`: latest no-feasible rejection samples are still entirely non-home quote pressure (`BTC`, `ETH`) and recovery still fails on `Below minQty 1.00000000`
- `inferred`: the April 20 `T-032` support fix is proven; the live blocker is now a `T-031` quote-quarantine effectiveness gap

## Chosen active ticket
- Current: `T-031` (Regime engine v2)
- Linked support: `T-032` (preserved only; not the current blocker)
- Decision: `patch_required`
- Why:
  - `observed`: the April 20 `T-032` support fix cleared the false `HALT`
  - `observed`: the live runtime blocker is again repeated no-feasible quote pressure under `T-031`
  - `observed`: no new fills or orders landed across the last two fresh bundles
  - `inferred`: the next bounded batch should stay in `T-031` and make active `GRID_BUY_QUOTE` quarantine effective for fresh non-home quote families

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260423-080554.tgz`
- Compared bundle: `autobot-feedback-20260422-100621.tgz`

## Allowed work mode
- Current batch: `PATCH_NOW`

## Batch decision
- Decision: `patch_required`
- Next ticket candidate: `T-031`
- Review slice:
  - keep `T-031` active
  - keep `T-032` preserved only
  - preserve the April 20 linked-support fix, April 20 quote-pressure quarantine behavior, April 17 dust cooldown behavior, and April 15 fee-edge quarantine behavior
  - make active `GRID_BUY_QUOTE` quarantine suppress fresh non-home quote families even with zero local quote-insufficient history
- Validation:
  - fresh bundle review (`autobot-feedback-20260422-100621.tgz`) ✅
  - fresh bundle review (`autobot-feedback-20260423-080554.tgz`) ✅
  - same-ticket mitigation landed in code/tests ⏳
  - PM/BA gate start + Docker CI pass ⏳
