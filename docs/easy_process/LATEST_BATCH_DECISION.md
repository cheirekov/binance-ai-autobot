# LATEST_BATCH_DECISION

Last updated: 2026-04-17 20:15 EEST
Owner: PM/BA + Codex

## Production capability lane
- Chosen: `Lane A — Strategy quality / regime routing`
- Why:
- `observed`: the latest fresh bundle is `autobot-feedback-20260417-164018.tgz`
- `observed`: auto-retro says `patch_required`
- `observed`: the April 15 fee-edge blocker is no longer dominant
- `observed`: runtime is `CAUTION(trigger=PROFIT_GIVEBACK)`, `activeOrders=0`, and `sizingRejectPressure=low`
- `observed`: dominant skip is `Skip: No feasible candidates after policy/exposure filters` (`61`)
- `observed`: recovery is already attempted, but the fallback sell fails on exchange minimums (`Below minNotional 5.00000000 ...`)
- `inferred`: the immediate blocker is a dust-only near-flat recovery loop, not fee-edge routing or downside-control thaw

## Chosen active ticket
- Current: `T-031` (Regime engine v2)
- Linked support: `T-032` (support slices allowed only when fresh evidence couples downside-control with strategy-quality validation)
- Decision: `patch_required`
- Why:
  - `observed`: the linked-support thaw and downside-control support path remain preserved
  - `observed`: the live blocker is `T-031` candidate-quality / recovery behavior, not quote-funding or downside-control
  - `inferred`: the next bounded batch is to park near-flat dust-only recovery loops without weakening real sell / unwind paths

## Evidence class
- Current: `fresh`
- Latest bundle: `autobot-feedback-20260417-164018.tgz`
- Compared bundle: `autobot-feedback-20260417-074005.tgz`

## Allowed work mode
- Current batch: `PATCH_NOW`

## Batch decision
- Decision: `patch_required`
- Next ticket candidate: `T-031`
- Review slice:
  - keep `T-031` active
  - preserve the April 15 global fee-edge quarantine behavior and April 13-15 residual storm mitigations
  - add a bounded no-feasible dust recovery cooldown for near-flat `PROFIT_GIVEBACK` `CAUTION` books with `activeOrders=0`
  - preserve the April 12 linked-support thaw and March 30-31 `T-032` downside-control behavior
- Validation:
  - fresh bundle review (`autobot-feedback-20260417-164018.tgz`) ✅
  - same-ticket mitigation landed in code/tests ✅
  - PM/BA gate start + Docker CI pass ✅
  - PM/BA gate end remains red until a fresh post-deploy bundle replaces the repeated pre-patch evidence ⚠️
